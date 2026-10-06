#include <array>
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <new>
#include "NotificationPainter.h"
#include "fonts/InterTightSmooth.h"

StaticSmoothFont notificationTitleFont() { return indexedSmoothFont(InterTightSmooth24); }
StaticSmoothFont notificationBodyFont() { return indexedSmoothFont(InterTightSmooth18); }

static bool forbidAllocation = false;
void *operator new(size_t size) {
  assert(!forbidAllocation);
  if (void *p = std::malloc(size)) return p;
  throw std::bad_alloc();
}
void operator delete(void *p) noexcept { std::free(p); }
void operator delete(void *p, size_t) noexcept { std::free(p); }

// Clipped software canvas, used only by the native tests. All text rasterization
// and notification layout come from the production renderer and original fonts.
struct Canvas {
  std::array<uint16_t, 480 * 320> pixels{};
  int w = 240, h = 240;
  uint8_t datum = 0;
  int width() const { return w; }
  int height() const { return h; }
  uint8_t getTextDatum() const { return datum; }
  void setTextDatum(uint8_t value) { datum = value; }
  void drawPixel(int x, int y, uint16_t color) {
    if (x >= 0 && y >= 0 && x < w && y < h) pixels[y * w + x] = color;
  }
  void fillRect(int x, int y, int width, int height, uint16_t color) {
    for (int dy = 0; dy < height; ++dy)
      for (int dx = 0; dx < width; ++dx) drawPixel(x + dx, y + dy, color);
  }
  void drawRect(int x, int y, int width, int height, uint16_t color) {
    fillRect(x, y, width, 1, color); fillRect(x, y + height - 1, width, 1, color);
    fillRect(x, y, 1, height, color); fillRect(x + width - 1, y, 1, height, color);
  }
  void drawFastHLine(int x, int y, int width, uint16_t color) { fillRect(x, y, width, 1, color); }
  void drawLine(int x, int y, int x2, int y2, uint16_t color) {
    const int dx = abs(x2 - x), dy = -abs(y2 - y), sx = x < x2 ? 1 : -1, sy = y < y2 ? 1 : -1;
    int error = dx + dy;
    for (;;) {
      drawPixel(x, y, color);
      if (x == x2 && y == y2) break;
      const int twice = 2 * error;
      if (twice >= dy) { error += dy; x += sx; }
      if (twice <= dx) { error += dx; y += sy; }
    }
  }
  void circle(int x, int y, int radius, uint16_t color, bool fill) {
    for (int dy = -radius; dy <= radius; ++dy)
      for (int dx = -radius; dx <= radius; ++dx) {
        const int distance = dx * dx + dy * dy;
        if (distance <= radius * radius && (fill || distance >= (radius - 1) * (radius - 1)))
          drawPixel(x + dx, y + dy, color);
      }
  }
  void fillCircle(int x, int y, int r, uint16_t c) { circle(x, y, r, c, true); }
  void drawCircle(int x, int y, int r, uint16_t c) { circle(x, y, r, c, false); }
  void rounded(int x, int y, int width, int height, int radius, uint16_t color, bool fill) {
    const auto inside = [&](int dx, int dy, int inset) {
      if (dx < inset || dy < inset || dx >= width - inset || dy >= height - inset) return false;
      const int cx = std::max(radius, std::min(width - radius - 1, dx));
      const int cy = std::max(radius, std::min(height - radius - 1, dy));
      return (cx - dx) * (cx - dx) + (cy - dy) * (cy - dy) <= (radius - inset) * (radius - inset);
    };
    for (int dy = 0; dy < height; ++dy)
      for (int dx = 0; dx < width; ++dx)
        if (inside(dx, dy, 0) && (fill || !inside(dx, dy, 1))) drawPixel(x + dx, y + dy, color);
  }
  void fillRoundRect(int x, int y, int w, int h, int r, uint16_t c) { rounded(x, y, w, h, r, c, true); }
  void drawRoundRect(int x, int y, int w, int h, int r, uint16_t c) { rounded(x, y, w, h, r, c, false); }
  void drawTriangle(int x, int y, int x2, int y2, int x3, int y3, uint16_t c) {
    drawLine(x, y, x2, y2, c); drawLine(x2, y2, x3, y3, c); drawLine(x3, y3, x, y, c);
  }
  void fillTriangle(int x, int y, int x2, int y2, int x3, int y3, uint16_t c) {
    const int steps = std::max(abs(x2 - x), abs(y2 - y));
    for (int i = 0; i <= steps; ++i) drawLine(x + (x2 - x) * i / std::max(1, steps),
        y + (y2 - y) * i / std::max(1, steps), x3, y3, c);
  }
  void background(int top = 0) {
    for (int y = 0; y < h; ++y)
      for (int x = 0; x < w; ++x) pixels[y * w + x] = ((x / 20 + (y + top) / 20) % 2) ? 0x2946 : 0x2105;
  }
  void save(const char *path) {
    FILE *file = fopen(path, "wb");
    assert(file);
    fprintf(file, "P6\n%d %d\n255\n", w, h);
    for (int i = 0; i < w * h; ++i) {
      const auto color = pixels[i];
      const uint8_t rgb[] = {uint8_t((color >> 11) * 255 / 31),
          uint8_t(((color >> 5) & 63) * 255 / 63), uint8_t((color & 31) * 255 / 31)};
      fwrite(rgb, 1, 3, file);
    }
    fclose(file);
  }
};

int main() {
  for (int width : {240, 480}) {
    const int height = width == 240 ? 240 : 320;
    for (uint8_t position = 0; position < notificationPositionCount(width, height); ++position) {
      NotificationCenter center;
      auto item = std::make_unique<DisplayNotification>();
      strcpy(item->title, "Charging complete");
      strcpy(item->message, "Battery is ready.\nŁadowanie zakończone");
      item->severity = NotificationSeverity::Success;
      item->position = static_cast<NotificationPosition>(position);
      prepareNotification(*item, width, height);
      assert(item->height <= height - 16 && item->width <= width - 16);
      center.enqueue(std::move(item));
      center.advance(0, width, height, true);
      for (uint32_t now : {60U, 120U, 240U}) {
        center.advance(now, width, height, true);
        Canvas full, tiled, band;
        full.w = tiled.w = band.w = width;
        full.h = tiled.h = height;
        band.h = 8;
        full.background();
        forbidAllocation = true;
        paintNotification(full, center, 0, 0);
        for (int top = 0; top < height; top += band.h) {
          band.background(top);
          paintNotification(band, center, 0, -top);
          for (int y = 0; y < band.h; ++y)
            for (int x = 0; x < width; ++x) tiled.pixels[(y + top) * width + x] = band.pixels[y * width + x];
        }
        forbidAllocation = false;
        assert(full.pixels == tiled.pixels);
        if (now == 240 && position == 0 && width == 240) full.save(".cache/tests/notification-success.ppm");
      }
      center.dismissAll();
      Canvas cleared;
      cleared.background();
      const auto before = cleared.pixels;
      paintNotification(cleared, center, 0, 0);
      assert(cleared.pixels == before);
    }
  }
  for (int width : {240, 480}) {
    const int height = width == 240 ? 240 : 320;
    NotificationCenter center;
    for (int i = 0; i < 3; ++i) {
      auto item = std::make_unique<DisplayNotification>();
      strcpy(item->title, i == 0 ? "Charging complete" : i == 1 ? "Door opened" : "Kitchen smoke");
      strcpy(item->message, i == 0 ? "Battery is ready" : i == 1 ? "Front entrance" : "Check the kitchen");
      item->severity = i == 0 ? NotificationSeverity::Success : i == 1 ? NotificationSeverity::Info : NotificationSeverity::Critical;
      item->durationMs = (i == 1 ? 1 : 10) * 1000;
      center.enqueue(std::move(item));
    }
    center.advance(0, width, height, true, prepareNotification);
    for (uint32_t now : {60U, 120U, 240U, 1240U, 1360U, 1480U, 1481U}) {
      forbidAllocation = true;
      center.advance(now, width, height, true, prepareNotification);
      Canvas full, tiled, band;
      full.w = tiled.w = band.w = width;
      full.h = tiled.h = height;
      band.h = 8;
      full.background();
      paintNotification(full, center, 0, 0);
      for (int top = 0; top < height; top += band.h) {
        band.background(top);
        paintNotification(band, center, 0, -top);
        for (int y = 0; y < band.h; ++y)
          for (int x = 0; x < width; ++x) tiled.pixels[(y + top) * width + x] = band.pixels[y * width + x];
      }
      forbidAllocation = false;
      assert(full.pixels == tiled.pixels);
      if (now == 240 && width == 240) full.save(".cache/tests/notification-stack.ppm");
      center.presented(now);
    }
    assert(center.count() == 2);
  }
}
