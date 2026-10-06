#include <array>
#include <cassert>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <new>
#include "CoverageFont.h"

static bool forbidAllocations = false;
void *operator new(std::size_t size) {
  assert(!forbidAllocations);
  if (void *result = std::malloc(size)) return result;
  throw std::bad_alloc();
}
void operator delete(void *pointer) noexcept { std::free(pointer); }
void operator delete(void *pointer, std::size_t) noexcept { std::free(pointer); }

struct Canvas {
  std::array<uint16_t, 240 * 240> pixels{};
  unsigned reads = 0, writes = 0;
  int h = 240;
  int w = 240;
  const CoverageFont *font;
  uint8_t datum = 0;
  int height() { return h; }
  int width() { return w; }
  uint8_t getTextDatum() { return datum; }
  int textWidth(const char *text) {
    int result = 0;
    while (*text) {
      CoverageGlyph glyph;
      if (findCoverageGlyph(*font, nextCoverageCode(text), glyph)) result += glyph.advance;
    }
    return result;
  }
  void drawPixel(int x, int y, uint16_t color) {
    assert(x >= 0 && x < w && y >= 0 && y < h);
    pixels[y * 240 + x] = color;
    ++writes;
  }
  void drawFastHLine(int x, int y, int count, uint16_t color) {
    for (int i = 0; i < count; ++i) drawPixel(x+i, y, color);
  }
  int drawChar(uint32_t, int, int) { return 0; }
  uint16_t background(int x, int y) {
    assert(x >= 0 && x < w && y >= 0 && y < h);
    ++reads;
    return pixels[y * 240 + x];
  }
};

int main() {
  Canvas canvas;
  for (uint8_t size : {2,3}) {
    canvas.font = builtInCoverageFont(size);
    assert(canvas.font);
    for (uint8_t datum = 0; datum < 12; ++datum) {
      canvas.datum = datum;
      forbidAllocations = true;
      paintCoverageText(canvas, *canvas.font, "37% Łódź", 100, 80, 0xFFFF,
          [&](int x, int y) { return canvas.background(x,y); });
      forbidAllocations = false;
    }
    assert(canvas.reads > 0 && canvas.reads < canvas.writes);
    canvas.h = 4;
    canvas.datum = 0;
    canvas.reads = canvas.writes = 0;
    paintCoverageText(canvas, *canvas.font, "37%", 10, -100, 0xFFFF,
        [&](int x, int y) { return canvas.background(x,y); });
    assert(canvas.reads == 0 && canvas.writes == 0);
    canvas.h = 240;
  }
  canvas.pixels.fill(0);
  // Different tile aspect ratios preserve all antialiased edge pixels.
  for (const auto dimensions : {std::array<int, 2>{8, 120}, {240, 4}, {30, 32}}) {
    Canvas full, tile;
    full.font = tile.font = builtInCoverageFont(2);
    paintCoverageText(full, *full.font, "37% Łódź", 30, 60, 0xFFFF,
        [&](int x, int y) { return full.background(x, y); });
    for (int y = 0; y < 240; y += dimensions[1]) {
      for (int x = 0; x < 240; x += dimensions[0]) {
        tile.pixels.fill(0);
        tile.w = std::min(dimensions[0], 240 - x);
        tile.h = std::min(dimensions[1], 240 - y);
        paintCoverageText(tile, *tile.font, "37% Łódź", 30 - x, 60 - y, 0xFFFF,
            [&](int px, int py) { return tile.background(px, py); });
        for (int py = 0; py < tile.h; ++py)
          for (int px = 0; px < tile.w; ++px)
            assert(tile.pixels[py * 240 + px] == full.pixels[(y + py) * 240 + x + px]);
      }
    }
  }
  canvas.font = builtInCoverageFont(2);
  paintCoverageText(canvas, *canvas.font, "37%", 24, 40, 0xFFFF,
      [&](int x, int y) { return canvas.background(x,y); });
  FILE *image = std::fopen(".cache/tests/coverage-text.ppm", "wb");
  assert(image);
  std::fprintf(image,"P6\n240 240\n255\n");
  for (auto pixel : canvas.pixels) {
    const uint8_t rgb[] = {uint8_t((pixel >> 11) * 255 / 31),
      uint8_t(((pixel >> 5) & 63) * 255 / 63), uint8_t((pixel & 31) * 255 / 31)};
    std::fwrite(rgb,1,3,image);
  }
  std::fclose(image);
  std::puts("coverage: zero allocations, glyph lookup, alignment, clipped bands passed");
}
