#pragma once

#include "PageTransitionMath.h"
#include "SceneGraph.h"

struct SceneTransitionSlice {
  SceneRect bounds;
  int16_t offsetX = 0;
  int16_t offsetY = 0;
  bool next = false;
};

struct SceneTransitionFrame {
  SceneTransitionSlice slices[3];
  uint8_t count = 0;

  void add(SceneRect bounds, int16_t x, int16_t y, bool next) {
    bounds = clipSceneRect(bounds, 240, 240);
    if (!bounds.empty() && count < 3)
      slices[count++] = {bounds, x, y, next};
  }
};

inline SceneTransitionFrame movingSceneFrame(float progress,
    const PageTransitionConfig &config, bool bounce, bool smooth) {
  const auto positions = pageMotionFrame(progress, 240, config.direction,
                                         bounce, smooth, config.intensity);
  SceneTransitionFrame result;
  result.add({positions.currentX, positions.currentY, 240, 240},
             positions.currentX, positions.currentY, false);
  result.add({positions.nextX, positions.nextY, 240, 240},
             positions.nextX, positions.nextY, true);
  return result;
}

inline SceneTransitionFrame openingSceneFrame(float progress,
    const PageTransitionConfig &config) {
  const int16_t distance = static_cast<int16_t>(120 * progress * progress *
                                               (3.0F - 2.0F * progress));
  const int16_t visible = 120 - distance;
  const bool horizontal = config.direction == PageTransitionDirection::Left ||
                          config.direction == PageTransitionDirection::Right;
  SceneTransitionFrame result;
  if (horizontal) {
    result.add({0, 0, visible, 240}, -distance, 0, false);
    result.add({visible, 0, static_cast<int16_t>(2 * distance), 240}, 0, 0, true);
    result.add({static_cast<int16_t>(120 + distance), 0, visible, 240},
               distance, 0, false);
  } else {
    result.add({0, 0, 240, visible}, 0, -distance, false);
    result.add({0, visible, 240, static_cast<int16_t>(2 * distance)}, 0, 0, true);
    result.add({0, static_cast<int16_t>(120 + distance), 240, visible},
               0, distance, false);
  }
  return result;
}
