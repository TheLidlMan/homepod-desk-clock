#pragma once

#include <stddef.h>
#include <stdint.h>

// In-place nearest-neighbour sampling, including a clipped destination.
// With cropped upscaling, the source index crosses the destination index:
// reversing the entire row overwrites source pixels still needed on the left.
inline bool resampleImageRow(uint16_t *row, size_t capacity,
                             uint16_t sourceWidth, uint16_t sourceX,
                             uint16_t sampledWidth, uint16_t destinationWidth,
                             uint16_t firstColumn, uint16_t outputWidth,
                             bool swapBytes) {
  if (!row || !sampledWidth || !destinationWidth ||
      sourceWidth > capacity || outputWidth > capacity ||
      sourceX + sampledWidth > sourceWidth ||
      firstColumn + outputWidth > destinationWidth) return false;
  const auto sourceIndex = [&](uint16_t output) {
    return sourceX + static_cast<uint32_t>(firstColumn + output) *
                         sampledWidth / destinationWidth;
  };
  const auto copyPixel = [&](uint16_t output) {
    const uint16_t color = row[sourceIndex(output)];
    row[output] = swapBytes ? static_cast<uint16_t>((color << 8) | (color >> 8))
                            : color;
  };
  uint16_t first = 0;
  while (first < outputWidth &&
         (destinationWidth <= sampledWidth || sourceIndex(first) > first)) {
    copyPixel(first++);
  }
  for (uint16_t end = outputWidth; end > first;) copyPixel(--end);
  return true;
}
