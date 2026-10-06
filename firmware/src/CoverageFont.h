#pragma once
#include <cstddef>
#include <cstdint>
#include <cstring>
#if defined(ESP8266)
#include <Arduino.h>
#include <pgmspace.h>
#endif

struct CoverageGlyph {
  uint32_t offset;
  uint16_t code;
  uint8_t width, height, advance;
  int8_t x, y;
};
struct CoverageFont {
  const uint8_t *pixels;
  const CoverageGlyph *glyphs;
  uint16_t count;
  uint8_t ascent, descent;
};

inline uint8_t coverageByte(const uint8_t *data) {
#if defined(ESP8266)
  return pgm_read_byte(data);
#else
  return *data;
#endif
}

class CoverageCursor {
 public:
  explicit CoverageCursor(const uint8_t *data) : data_(data) {}

  uint8_t next() {
    if (remaining_ == 0) refill();
    --remaining_;
    return value_;
  }

  void skip(uint32_t count) {
    while (count) {
      if (remaining_ == 0) refill();
      const uint8_t step = count < remaining_ ? count : remaining_;
      remaining_ -= step;
      count -= step;
    }
  }

 private:
  void refill() {
    const uint8_t encoded = coverageByte(data_++);
    value_ = encoded >> 6;
    remaining_ = (encoded & 0x3f) + 1;
  }

  const uint8_t *data_;
  uint8_t value_ = 0;
  uint8_t remaining_ = 0;
};
inline CoverageGlyph coverageGlyph(const CoverageFont &font, size_t index) {
  CoverageGlyph glyph;
#if defined(ESP8266)
  memcpy_P(&glyph, font.glyphs + index, sizeof(glyph));
#else
  glyph = font.glyphs[index];
#endif
  return glyph;
}
inline bool findCoverageGlyph(const CoverageFont &font, uint32_t code, CoverageGlyph &result) {
  size_t low = 0, high = font.count;
  while (low < high) {
    const size_t middle = (low + high) / 2;
    const auto glyph = coverageGlyph(font, middle);
    if (glyph.code == code) { result = glyph; return true; }
    if (glyph.code < code) low = middle + 1;
    else high = middle;
  }
  return false;
}
inline uint32_t nextCoverageCode(const char *&text) {
  uint8_t first = uint8_t(*text++);
  if (first < 128) return first;
  uint8_t count = first >= 0xF0 ? 3 : first >= 0xE0 ? 2 : 1;
  uint32_t code = first & (count == 3 ? 7 : count == 2 ? 15 : 31);
  while (count--) {
    const uint8_t next = uint8_t(*text);
    if ((next & 0xC0) != 0x80) return '?';
    ++text;
    code = (code << 6) | (next & 63);
  }
  return code;
}
inline uint16_t blendCoverage(uint16_t foreground, uint16_t background, uint8_t coverage) {
  const uint16_t r = (((foreground >> 11) * coverage + (background >> 11) * (3 - coverage) + 1) / 3);
  const uint16_t g = ((((foreground >> 5) & 63) * coverage + ((background >> 5) & 63) * (3 - coverage) + 1) / 3);
  const uint16_t b = (((foreground & 31) * coverage + (background & 31) * (3 - coverage) + 1) / 3);
  return (r << 11) | (g << 5) | b;
}

// No heap, filesystem or full-glyph buffer. Work is clipped to the current band.
template <typename Canvas, typename Background>
void paintCoverageText(Canvas &canvas, const CoverageFont &font, const char *text,
                       int16_t x, int16_t y, uint16_t color, Background background) {
  const uint8_t datum = canvas.getTextDatum();
  const int16_t width = canvas.textWidth(text);
  if (datum % 3 == 1) x -= width / 2;
  if (datum % 3 == 2) x -= width;
  int16_t baseline = y + font.ascent;
  if (datum >= 3 && datum <= 5) baseline -= font.ascent / 2;
  if (datum >= 6 && datum <= 8) baseline -= font.ascent + font.descent;
  if (datum >= 9) baseline = y;
  while (*text) {
    const uint32_t code = nextCoverageCode(text);
    CoverageGlyph glyph;
    if (!findCoverageGlyph(font, code, glyph)) {
      x += canvas.drawChar(code <= 0xFFFF ? code : '?', x, baseline);
      continue;
    }
    const int16_t left = x + glyph.x, top = baseline + glyph.y;
    const int16_t firstRow = top < 0 ? -top : 0;
    const int16_t lastRow = top + glyph.height > canvas.height()
                                ? canvas.height() - top : glyph.height;
    const int16_t firstColumn = left < 0 ? -left : 0;
    const int16_t lastColumn = left + glyph.width > canvas.width()
                                   ? canvas.width() - left : glyph.width;
    if (firstRow >= lastRow || firstColumn >= lastColumn) {
      x += glyph.advance;
      continue;
    }
#if defined(ESP8266)
    optimistic_yield(10000);
#endif
    CoverageCursor coverage(font.pixels + glyph.offset);
    coverage.skip(uint32_t(firstRow) * glyph.width);
    for (int16_t row = firstRow; row < lastRow; ++row) {
      coverage.skip(firstColumn);
      int16_t run = 0;
      for (int16_t column = firstColumn; column <= lastColumn; ++column) {
        const uint8_t alpha = column < lastColumn ? coverage.next() : 0;
        if (alpha == 3) { ++run; continue; }
        if (run) { canvas.drawFastHLine(left + column - run, top + row, run, color); run = 0; }
        if (alpha) canvas.drawPixel(left + column, top + row,
            blendCoverage(color, background(left + column, top + row), alpha));
      }
      coverage.skip(glyph.width - lastColumn);
    }
    x += glyph.advance;
  }
}

const CoverageFont *builtInCoverageFont(uint8_t size);
