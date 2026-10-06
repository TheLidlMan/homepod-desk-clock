#pragma once

#include <stddef.h>
#include <stdint.h>

#include "SceneGraph.h"

inline uint16_t blendRgb565(uint16_t foreground, uint16_t background,
                            uint8_t opacity) {
  if (opacity == 0) return background;
  if (opacity == 255) return foreground;
  const uint16_t inverse = 255 - opacity;
  const uint16_t foregroundRed = (foreground >> 11) & 0x1f;
  const uint16_t foregroundGreen = (foreground >> 5) & 0x3f;
  const uint16_t foregroundBlue = foreground & 0x1f;
  const uint16_t backgroundRed = (background >> 11) & 0x1f;
  const uint16_t backgroundGreen = (background >> 5) & 0x3f;
  const uint16_t backgroundBlue = background & 0x1f;
  const uint16_t red =
      (foregroundRed * opacity + backgroundRed * inverse + 127) / 255;
  const uint16_t green =
      (foregroundGreen * opacity + backgroundGreen * inverse + 127) / 255;
  const uint16_t blue =
      (foregroundBlue * opacity + backgroundBlue * inverse + 127) / 255;
  return static_cast<uint16_t>((red << 11) | (green << 5) | blue);
}

template <uint16_t MaximumWidth, uint8_t MaximumHeight>
class SceneTileBuffer {
 public:
  bool begin(const SceneRect &tile, uint16_t background) {
    if (tile.empty() || tile.width > MaximumWidth ||
        tile.height > MaximumHeight) {
      return false;
    }
    tile_ = tile;
    const size_t pixels = static_cast<size_t>(tile.width) * tile.height;
    for (size_t index = 0; index < pixels; ++index) pixels_[index] = background;
    return true;
  }

  const SceneRect &bounds() const { return tile_; }
  const uint16_t *pixels() const { return pixels_; }
  uint16_t *pixels() { return pixels_; }
  size_t pixelCount() const {
    return static_cast<size_t>(tile_.width) * tile_.height;
  }

  uint16_t pixel(int16_t x, int16_t y) const {
    return contains(x, y) ? pixels_[offset(x, y)] : 0;
  }

  void drawPixel(int16_t x, int16_t y, uint16_t color,
                 uint8_t opacity = 255) {
    if (!contains(x, y) || opacity == 0) return;
    uint16_t &target = pixels_[offset(x, y)];
    target = blendRgb565(color, target, opacity);
  }

  void fill(const SceneRect &area, uint16_t color, uint8_t opacity = 255) {
    const int16_t left = area.x > tile_.x ? area.x : tile_.x;
    const int16_t top = area.y > tile_.y ? area.y : tile_.y;
    const int16_t right = area.right() < tile_.right() ? area.right()
                                                        : tile_.right();
    const int16_t bottom = area.bottom() < tile_.bottom() ? area.bottom()
                                                           : tile_.bottom();
    if (right <= left || bottom <= top || opacity == 0) return;
    for (int16_t y = top; y < bottom; ++y) {
      for (int16_t x = left; x < right; ++x) {
        drawPixel(x, y, color, opacity);
      }
    }
  }

  void line(int16_t x0, int16_t y0, int16_t x1, int16_t y1,
            uint16_t color, uint8_t opacity = 255) {
    const int16_t dx = x1 > x0 ? x1 - x0 : x0 - x1;
    const int16_t sx = x0 < x1 ? 1 : -1;
    const int16_t dy = -(y1 > y0 ? y1 - y0 : y0 - y1);
    const int16_t sy = y0 < y1 ? 1 : -1;
    int16_t error = dx + dy;
    while (true) {
      drawPixel(x0, y0, color, opacity);
      if (x0 == x1 && y0 == y1) break;
      const int16_t twiceError = error * 2;
      if (twiceError >= dy) {
        error += dy;
        x0 += sx;
      }
      if (twiceError <= dx) {
        error += dx;
        y0 += sy;
      }
    }
  }

 private:
  bool contains(int16_t x, int16_t y) const {
    return x >= tile_.x && x < tile_.right() && y >= tile_.y &&
           y < tile_.bottom();
  }

  size_t offset(int16_t x, int16_t y) const {
    return static_cast<size_t>(y - tile_.y) * tile_.width + x - tile_.x;
  }

  SceneRect tile_{};
  uint16_t pixels_[MaximumWidth * MaximumHeight]{};
};
