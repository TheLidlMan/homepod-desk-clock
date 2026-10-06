#pragma once

#include <stddef.h>
#include <stdint.h>
#include <string.h>

// A cropped TFT_eSprite normally opens a separate LCD window for every row.
// Discard the unused stride in-place so the entire tile uses one SPI transfer.
// The caller must repaint the sprite before using its original stride again.
inline bool packTransitionPixels(uint16_t *pixels, size_t capacity,
                                  size_t stride, size_t width, size_t height) {
  if (!pixels || !stride || !width || !height || width > stride ||
      height > capacity / stride) return false;
  if (width != stride) {
    for (size_t row = 1; row < height; ++row)
      memmove(pixels + row * width, pixels + row * stride,
              width * sizeof(uint16_t));
  }
  return true;
}
