#pragma once

#include "CoverageFont.h"

inline uint32_t smoothWord(const uint8_t *data) {
  return uint32_t(coverageByte(data)) << 24 | uint32_t(coverageByte(data + 1)) << 16 |
         uint32_t(coverageByte(data + 2)) << 8 | coverageByte(data + 3);
}

inline uint16_t smoothHalf(const uint8_t *data) {
  return uint16_t(coverageByte(data)) << 8 | coverageByte(data + 1);
}

struct StaticSmoothGlyph {
  uint32_t offset;
  int16_t width, height, advance, dx, dy;
};

// Index lives in flash. Original 8-bit VLW alpha pixels are not converted.
struct StaticSmoothFont {
  const uint8_t *data = nullptr;
  const uint16_t *offsets = nullptr;
  uint16_t count = 0;
  uint8_t metricBytes = 28;
  uint16_t ascent = 0, descent = 0, lineHeight = 0, spaceWidth = 0;

  bool find(uint32_t code, StaticSmoothGlyph &glyph) const {
    size_t low = 0, high = count;
    while (low < high) {
      const size_t index = (low + high) / 2;
      const uint8_t *entry = data + 24 + index * metricBytes;
      const uint32_t found =
          metricBytes == 7 ? smoothHalf(entry) : smoothWord(entry);
      if (found < code) { low = index + 1; continue; }
      if (found > code) { high = index; continue; }
#if defined(ESP8266)
      glyph.offset = pgm_read_word(offsets + index);
#else
      glyph.offset = offsets[index];
#endif
      if (metricBytes == 7) {
        glyph.height = coverageByte(entry + 2);
        glyph.width = coverageByte(entry + 3);
        glyph.advance = coverageByte(entry + 4);
        glyph.dy = static_cast<int8_t>(coverageByte(entry + 5));
        glyph.dx = static_cast<int8_t>(coverageByte(entry + 6));
      } else {
        glyph.height = smoothWord(entry + 4);
        glyph.width = smoothWord(entry + 8);
        glyph.advance = smoothWord(entry + 12);
        glyph.dy = static_cast<int32_t>(smoothWord(entry + 16));
        glyph.dx = static_cast<int32_t>(smoothWord(entry + 20));
      }
      return true;
    }
    return false;
  }

  int16_t width(const char *text) const {
    int16_t result = 0;
    while (*text) {
      const auto code = nextCoverageCode(text);
      if (code == 32) { result += spaceWidth; continue; }
      StaticSmoothGlyph glyph;
      if (!find(code, glyph)) { result += spaceWidth + 1; continue; }
      if (!result && glyph.dx < 0) result -= glyph.dx;
      result += *text ? glyph.advance : glyph.dx + glyph.width;
    }
    return result;
  }
};

StaticSmoothFont indexedSmoothFont(const uint8_t *data);

// Match TFT_eSPI's RGB565 blend, including its integer rounding.
inline uint16_t blendSmoothPixel(uint8_t alpha, uint16_t foreground, uint16_t background) {
  uint32_t rb = background & 0xf81f, g = background & 0x07e0;
  rb += ((foreground & 0xf81f) - rb) * (alpha >> 2) >> 6;
  g += ((foreground & 0x07e0) - g) * alpha >> 8;
  return (rb & 0xf81f) | (g & 0x07e0);
}

template <typename Canvas, typename Background>
void paintStaticSmoothText(Canvas &canvas, const StaticSmoothFont &font,
                           const char *text, int16_t x, int16_t y,
                           uint16_t color, Background background) {
  const uint8_t datum = canvas.getTextDatum();
  const int16_t width = font.width(text);
  if (datum % 3 == 1) x -= width / 2;
  if (datum % 3 == 2) x -= width;
  if (datum >= 3 && datum <= 5) y -= font.lineHeight / 2;
  if (datum >= 6 && datum <= 8) y -= font.lineHeight;
  if (datum >= 9) y -= font.ascent;
  while (*text) {
    const auto code = nextCoverageCode(text);
    if (code == 32) { x += font.spaceWidth; continue; }
    if (code == '\n') { x = 0; y += font.lineHeight; continue; }
    StaticSmoothGlyph glyph;
    if (!font.find(code, glyph)) {
      // Same missing-glyph box as TFT_eSPI, through clipped primitives.
      canvas.drawRect(x, y, font.spaceWidth, font.ascent, color);
      x += font.spaceWidth + 1;
      continue;
    }
    if (x == 0) x -= glyph.dx;
    const int16_t left = x + glyph.dx, top = y + font.ascent - glyph.dy;
    const int firstY = top < 0 ? -top : 0;
    const int lastY = top + glyph.height > canvas.height() ? canvas.height() - top : glyph.height;
    const int firstX = left < 0 ? -left : 0;
    const int lastX = left + glyph.width > canvas.width() ? canvas.width() - left : glyph.width;
    for (int row = firstY; row < lastY; ++row) {
      int run = 0;
      for (int column = firstX; column <= lastX; ++column) {
        const uint8_t alpha = column < lastX
            ? coverageByte(font.data + glyph.offset + row * glyph.width + column) : 0;
        if (alpha == 255) { ++run; continue; }
        if (run) { canvas.drawFastHLine(left + column - run, top + row, run, color); run = 0; }
        if (alpha) canvas.drawPixel(left + column, top + row,
            blendSmoothPixel(alpha, color, background(left + column, top + row)));
      }
    }
    x += glyph.advance;
  }
}
