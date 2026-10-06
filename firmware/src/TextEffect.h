#pragma once

#include <Arduino.h>
#include "CoverageFont.h"
#include "StaticSmoothFont.h"

inline const char *coverageText(const char *text) { return text; }
inline const char *coverageText(const String &text) { return text.c_str(); }

template <typename Canvas>
uint16_t coverageBackground(Canvas &canvas, int16_t x, int16_t y, uint16_t) {
  return canvas.readPixel(x, y);
}
#if defined(ESP8266)
// The physical panel has no reliable readback. Composited images use the
// sprite overload above; flat direct drawing uses the known background.
inline uint16_t coverageBackground(TFT_eSPI &, int16_t, int16_t, uint16_t background) {
  return background;
}
#endif

enum class TextEffectType : uint8_t { None, Shadow, Outline };

struct TextEffect {
  TextEffectType type;
  uint16_t color;
  int8_t offsetX;
  int8_t offsetY;
  uint8_t thickness;
};

inline int16_t textEffectExtent(const TextEffect &effect) {
  if (effect.type == TextEffectType::None) return 0;
  const int16_t offset =
      effect.type == TextEffectType::Shadow
          ? max<int16_t>(abs(effect.offsetX), abs(effect.offsetY))
          : 0;
  return offset + effect.thickness;
}

template <typename Canvas, typename Text>
void drawTextWithEffect(Canvas &canvas, const Text &text, int16_t x, int16_t y,
                        uint16_t foreground, uint16_t background,
                        const TextEffect &effect, const CoverageFont *coverage = nullptr,
                        const StaticSmoothFont *smooth = nullptr) {
  uint16_t ink = foreground;
  const auto setColor = [&](uint16_t color) { ink = color; canvas.setTextColor(color); };
  const auto draw = [&](const auto &value, int16_t left, int16_t top) {
#if defined(ESP8266)
    if (smooth && smooth->data) {
      paintStaticSmoothText(canvas, *smooth, coverageText(value), left, top, ink,
          [&](int16_t px, int16_t py) { return coverageBackground(canvas, px, py, background); });
      return;
    }
    if (coverage) {
      paintCoverageText(canvas, *coverage, coverageText(value), left, top, ink,
          [&](int16_t px, int16_t py) { return coverageBackground(canvas, px, py, background); });
      return;
    }
#else
    (void)smooth;
    (void)coverage;
    (void)background;
#endif
    canvas.drawString(value, left, top);
  };
  canvas.startWrite();
  if (effect.type == TextEffectType::Shadow) {
    setColor(effect.color);
    const int8_t spread = effect.thickness - 1;
    draw(text, x + effect.offsetX, y + effect.offsetY);
    if (spread > 0) {
      draw(text, x + effect.offsetX - spread,
                        y + effect.offsetY);
      draw(text, x + effect.offsetX + spread,
                        y + effect.offsetY);
      draw(text, x + effect.offsetX,
                        y + effect.offsetY - spread);
      draw(text, x + effect.offsetX,
                        y + effect.offsetY + spread);
      draw(text, x + effect.offsetX - spread,
                        y + effect.offsetY - spread);
      draw(text, x + effect.offsetX + spread,
                        y + effect.offsetY - spread);
      draw(text, x + effect.offsetX - spread,
                        y + effect.offsetY + spread);
      draw(text, x + effect.offsetX + spread,
                        y + effect.offsetY + spread);
    }
  } else if (effect.type == TextEffectType::Outline) {
    // Keep the glyph visible while its outline is rebuilt. Drawing the eight
    // outline offsets first made live value updates briefly show only the
    // effect color on the physical panel.
    setColor(foreground);
    draw(text, x, y);
    setColor(effect.color);
    const int8_t radius = effect.thickness;
    const int8_t diagonal = max<int8_t>(1, radius * 181 / 256);
    draw(text, x - radius, y);
    draw(text, x + radius, y);
    draw(text, x, y - radius);
    draw(text, x, y + radius);
    draw(text, x - diagonal, y - diagonal);
    draw(text, x + diagonal, y - diagonal);
    draw(text, x - diagonal, y + diagonal);
    draw(text, x + diagonal, y + diagonal);
  }
  setColor(foreground);
  draw(text, x, y);
  canvas.endWrite();
}
