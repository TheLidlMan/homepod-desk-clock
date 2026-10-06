#pragma once

#include <stddef.h>
#include <stdint.h>

#include "PageTransitionTypes.h"

// Moves pixels already composed in the display controller GRAM. The caller
// owns a small RGB565 scratch band, so no full framebuffer is needed.
template <uint16_t Width, uint16_t Height, uint8_t BandHeight = 4>
class DisplaySnapshotMover {
 public:
  static constexpr size_t kScratchPixels = Width * BandHeight;

  template <typename Display>
  bool shift(Display &display, PageTransitionDirection direction,
             uint16_t distance, uint16_t *scratch) const {
    if (!scratch || distance == 0) return scratch != nullptr;
    if (distance >= Width || distance >= Height) return false;
    if (direction == PageTransitionDirection::Left) {
      return copy(display, distance, 0, 0, 0, Width - distance, Height,
                  scratch);
    }
    if (direction == PageTransitionDirection::Right) {
      return copy(display, 0, 0, distance, 0, Width - distance, Height,
                  scratch);
    }
    if (direction == PageTransitionDirection::Up) {
      return copy(display, 0, distance, 0, 0, Width, Height - distance,
                  scratch);
    }
    return copy(display, 0, 0, 0, distance, Width, Height - distance,
                scratch);
  }

  template <typename Display>
  bool copy(Display &display, int16_t sourceX, int16_t sourceY,
            int16_t destinationX, int16_t destinationY, uint16_t width,
            uint16_t height, uint16_t *scratch) const {
    if (!scratch || width == 0 || height == 0) return scratch != nullptr;
    if (sourceX < 0 || sourceY < 0 || destinationX < 0 ||
        destinationY < 0 || sourceX + width > Width ||
        destinationX + width > Width || sourceY + height > Height ||
        destinationY + height > Height) {
      return false;
    }

    const bool bottomUp = destinationY > sourceY &&
                          destinationY < sourceY + static_cast<int16_t>(height);
    if (bottomUp) {
      uint16_t remaining = height;
      while (remaining > 0) {
        const uint8_t rows = remaining > BandHeight ? BandHeight : remaining;
        const uint16_t offset = remaining - rows;
        display.readRect(sourceX, sourceY + offset, width, rows, scratch);
        display.pushRect(destinationX, destinationY + offset, width, rows,
                         scratch);
        remaining = offset;
      }
      return true;
    }

    uint16_t offset = 0;
    while (offset < height) {
      const uint8_t rows =
          height - offset > BandHeight ? BandHeight : height - offset;
      display.readRect(sourceX, sourceY + offset, width, rows, scratch);
      display.pushRect(destinationX, destinationY + offset, width, rows,
                       scratch);
      offset += rows;
    }
    return true;
  }
};
