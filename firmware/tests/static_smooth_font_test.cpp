#include <array>
#include <cassert>
#include <cstdlib>
#include <new>
#include "StaticSmoothFont.h"
#include "fonts/InterTightSmooth.h"

static bool forbidAllocation = false;
void *operator new(size_t bytes) {
  assert(!forbidAllocation);
  if (void *p = std::malloc(bytes)) return p;
  throw std::bad_alloc();
}
void operator delete(void *p) noexcept { std::free(p); }
void operator delete(void *p, size_t) noexcept { std::free(p); }

struct Canvas {
  std::array<uint16_t, 240 * 240> pixels{};
  uint8_t datum = 0;
  int h = 240;
  unsigned writes = 0;
  int width() { return 240; }
  int height() { return h; }
  uint8_t getTextDatum() { return datum; }
  void drawPixel(int x, int y, uint16_t color) {
    assert(x >= 0 && x < 240 && y >= 0 && y < h);
    pixels[y * 240 + x] = color;
    ++writes;
  }
  void drawFastHLine(int x, int y, int length, uint16_t color) {
    for (int i = 0; i < length; ++i) drawPixel(x + i, y, color);
  }
  void drawRect(int x, int y, int w, int height, uint16_t color) {
    for (int dy = 0; dy < height; ++dy)
      for (int dx = 0; dx < w; ++dx)
        if ((!dy || !dx || dy == height - 1 || dx == w - 1) &&
            x + dx >= 0 && x + dx < 240 && y + dy >= 0 && y + dy < h)
          drawPixel(x + dx, y + dy, color);
  }
  uint16_t background(int x, int y) {
    assert(x >= 0 && x < 240 && y >= 0 && y < h);
    return pixels[y * 240 + x];
  }
};

int main() {
  assert(!indexedSmoothFont(nullptr).data);
  assert(!indexedSmoothFont(InterTightSmooth13).data);
  for (const auto *data : {InterTightSmooth18, InterTightSmooth24}) {
    const auto font = indexedSmoothFont(data);
    assert(font.data && font.offsets);
    uint32_t offset = 24 + font.count * font.metricBytes;
    for (unsigned i = 0; i < font.count; ++i) {
      const auto *record = data + 24 + i * font.metricBytes;
      const uint32_t code = font.metricBytes == 7 ? smoothHalf(record)
                                                   : smoothWord(record);
      StaticSmoothGlyph glyph;
      assert(font.find(code, glyph));
      assert(glyph.offset == offset);
      if (font.metricBytes == 7) {
        assert(glyph.height == coverageByte(record + 2));
        assert(glyph.width == coverageByte(record + 3));
        assert(glyph.advance == coverageByte(record + 4));
        assert(glyph.dy == int8_t(coverageByte(record + 5)));
        assert(glyph.dx == int8_t(coverageByte(record + 6)));
      } else {
        assert(glyph.height == int(smoothWord(record + 4)));
        assert(glyph.width == int(smoothWord(record + 8)));
        assert(glyph.advance == int(smoothWord(record + 12)));
        assert(glyph.dy == int32_t(smoothWord(record + 16)));
        assert(glyph.dx == int32_t(smoothWord(record + 20)));
      }
      offset += glyph.width * glyph.height;
    }
    assert(font.width("") == 0);
    assert(font.width(" ") == font.spaceWidth);
    StaticSmoothGlyph g;
    assert(font.find('A', g));
    assert(font.width("AA") == g.advance + g.width + g.dx - (g.dx < 0 ? g.dx : 0));
    for (uint8_t datum = 0; datum < 12; ++datum) {
      Canvas full, band;
      full.datum = band.datum = datum;
      full.pixels.fill(0x1428);
      forbidAllocation = true;
      paintStaticSmoothText(full, font, "Łódź 37% / Teraz", 100, 80, 0xfbe0,
          [&](int x, int y) { return full.background(x, y); });
      for (int y = 0; y < 240; y += 4) {
        band.h = 4;
        band.pixels.fill(0x1428);
        paintStaticSmoothText(band, font, "Łódź 37% / Teraz", 100, 80 - y, 0xfbe0,
            [&](int x, int py) { return band.background(x, py); });
        for (int row = 0; row < 4; ++row)
          for (int x = 0; x < 240; ++x)
            assert(band.pixels[row * 240 + x] == full.pixels[(y + row) * 240 + x]);
      }
      forbidAllocation = false;
      assert(full.writes > 0);
    }
  }
}
