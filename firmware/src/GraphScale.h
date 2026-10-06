#pragma once
#include <cmath>
#include <cstdint>

inline void fitGraphScale(float &low, float &high, bool fit,
                          float minimum, float maximum,
                          uint8_t paddingPercent = 5) {
  if (fit) {
    const float padding =
        fmaxf((high - low) * paddingPercent / 100.0F, 0.01F);
    low -= padding;
    high += padding;
  } else {
    low = fminf(low, 0);
    high = fmaxf(high, 0);
  }
  if (std::isfinite(minimum)) low = minimum;
  if (std::isfinite(maximum)) high = maximum;
  if (high <= low) high = low + 0.01F;
}

inline uint16_t blendGraphColor(uint16_t foreground, uint16_t background,
                               uint8_t opacity) {
  const uint32_t inverse = 100 - opacity;
  const uint16_t red = (((foreground >> 11) * opacity + (background >> 11) * inverse + 50) / 100);
  const uint16_t green = ((((foreground >> 5) & 63) * opacity + ((background >> 5) & 63) * inverse + 50) / 100);
  const uint16_t blue = (((foreground & 31) * opacity + (background & 31) * inverse + 50) / 100);
  return (red << 11) | (green << 5) | blue;
}
