#pragma once

#include <cstdint>

// Scrolling text fits vertically; numeric values still fit both dimensions.
// The caller supplies real font metrics, including custom font slots.
template <typename Measure>
int8_t freeTextSize(int16_t width, int16_t height, bool scroll, Measure measure) {
  for (int8_t size = 3; size >= 0; --size) {
    int16_t textWidth, textHeight;
    measure(size, textWidth, textHeight);
    if (textHeight <= height && (scroll || textWidth <= width - 8)) return size;
  }
  return -1;
}
