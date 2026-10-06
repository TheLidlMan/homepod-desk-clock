#pragma once

#include "SceneTransitionFrame.h"

// Pure geometry. Effects describe which source owns each changed rectangle;
// none of them draws, waits, allocates memory or owns a separate clock.
class TransitionPlan {
 public:
  TransitionPlan(PageTransitionConfig config, uint32_t seed)
      : config_(config), seed_(seed) {
    columns_ = config.tileSize == PageTransitionTileSize::Small ? 8 :
               config.tileSize == PageTransitionTileSize::Large ? 4 : 6;
    int top = 0, left = 0, bottom = columns_ - 1, right = bottom;
    uint8_t index = 0;
    while (top <= bottom && left <= right) {
      for (int x = left; x <= right; ++x) order_[index++] = top * columns_ + x;
      ++top;
      for (int y = top; y <= bottom; ++y) order_[index++] = y * columns_ + right;
      --right;
      if (top <= bottom) {
        for (int x = right; x >= left; --x) order_[index++] = bottom * columns_ + x;
        --bottom;
      }
      if (left <= right) {
        for (int y = bottom; y >= top; --y) order_[index++] = y * columns_ + left;
        ++left;
      }
    }
  }

  void prepare(uint8_t previous, uint8_t step, uint8_t count) {
    previous_ = previous;
    step_ = step;
    count_ = count;
    if (!count || step <= previous || step > count) return;
  }

  template <typename Emit>
  void changes(Emit emit) const {
    const uint8_t previous = previous_, step = step_, count = count_;
    if (!count || step <= previous || step > count) return;
    const auto next = [&](int x, int y, int w, int h) {
      const SceneRect rect = clipSceneRect({static_cast<int16_t>(x), static_cast<int16_t>(y),
                                            static_cast<int16_t>(w), static_cast<int16_t>(h)}, 240, 240);
      if (!rect.empty()) emit(SceneTransitionSlice{rect, 0, 0, true});
    };
    const auto current = [&](int x, int y, int w, int h) {
      const SceneRect rect = clipSceneRect({static_cast<int16_t>(x), static_cast<int16_t>(y),
                                            static_cast<int16_t>(w), static_cast<int16_t>(h)}, 240, 240);
      if (!rect.empty()) emit(SceneTransitionSlice{rect, 0, 0, false});
    };
    const bool horizontal = config_.direction == PageTransitionDirection::Left ||
                            config_.direction == PageTransitionDirection::Right;
    const bool reverse = config_.direction == PageTransitionDirection::Right ||
                         config_.direction == PageTransitionDirection::Down;
    const int before = 240 * previous / count;
    const int after = 240 * step / count;
    const auto easedReveal = [&](uint8_t frame, int extent, bool bounce) {
      const float progress = static_cast<float>(frame) / count;
      return static_cast<int>(extent * pageMotionProgress(
          progress, bounce, true, config_.intensity));
    };
    switch (config_.type) {
      case PageTransitionType::Slide: {
        const int a = easedReveal(previous, 240, false);
        const int b = easedReveal(step, 240, false);
        if (horizontal) next(reverse ? a : 240 - b, 0, b - a, 240);
        else next(0, reverse ? a : 240 - b, 240, b - a);
        break;
      }
      case PageTransitionType::Bounce: {
        const int a = easedReveal(previous, 240, true);
        const int b = easedReveal(step, 240, true);
        if (b >= a) {
          if (horizontal) next(reverse ? a : 240 - b, 0, b - a, 240);
          else next(0, reverse ? a : 240 - b, 240, b - a);
        } else {
          if (horizontal) current(reverse ? b : 240 - a, 0, a - b, 240);
          else current(0, reverse ? b : 240 - a, 240, a - b);
        }
        break;
      }
      case PageTransitionType::Curtain: {
        const int a = 120 * previous / count, b = 120 * step / count;
        if (horizontal) {
          next(120 - b, 0, b - a, 240);
          next(120 + a, 0, b - a, 240);
        } else {
          next(0, 120 - b, 240, b - a);
          next(0, 120 + a, 240, b - a);
        }
        break;
      }
      case PageTransitionType::Blinds:
        for (int blind = 0; blind < 6; ++blind) {
          const int origin = ((blind % 2 == 0) == reverse) ? 240 - after : before;
          if (horizontal) next(origin, blind * 40, after - before, 40);
          else next(blind * 40, origin, 40, after - before);
        }
        break;
      case PageTransitionType::Mosaic:
      case PageTransitionType::Cascade:
      case PageTransitionType::Spiral: {
        const int total = columns_ * columns_;
        const int multiplier = columns_ == 8 ? 17 : columns_ == 6 ? 13 : 5;
        const int size = 240 / columns_;
        for (int item = total * previous / count; item < total * step / count; ++item) {
          const int tile = config_.type == PageTransitionType::Spiral
              ? order_[item]
              : config_.type == PageTransitionType::Cascade
                  ? cascadeTile(item)
                  : (item * multiplier + seed_ % total) % total;
          next(tile % columns_ * size, tile / columns_ * size, size, size);
        }
        break;
      }
      case PageTransitionType::Dissolve: {
        const int tile = config_.tileSize == PageTransitionTileSize::Small ? 8 :
                         config_.tileSize == PageTransitionTileSize::Large ? 24 : 16;
        const int bands = (240 + tile - 1) / tile;
        for (int item = bands * previous / count; item < bands * step / count; ++item)
          next(0, ((item * 7) % bands) * tile, 240, tile);
        break;
      }
      case PageTransitionType::Wipe:
        if (horizontal) next(reverse ? before : 240 - after, 0, after - before, 240);
        else next(0, reverse ? before : 240 - after, 240, after - before);
        break;
      case PageTransitionType::Fade:
        if (previous * 2 < count && step * 2 >= count) next(0, 0, 240, 240);
        break;
      default:
        next(0, 0, 240, 240);
        break;
    }
  }

 private:
  int cascadeTile(int item) const {
    int remaining = item;
    for (int diagonal = 0; diagonal <= 2 * (columns_ - 1); ++diagonal) {
      const int firstX = diagonal >= columns_ ? diagonal - columns_ + 1 : 0;
      const int lastX = diagonal < columns_ ? diagonal : columns_ - 1;
      const int length = lastX - firstX + 1;
      if (remaining >= length) {
        remaining -= length;
        continue;
      }
      const int x = diagonal % 2 == 0 ? lastX - remaining
                                      : firstX + remaining;
      return (diagonal - x) * columns_ + x;
    }
    return columns_ * columns_ - 1;
  }

  PageTransitionConfig config_;
  uint32_t seed_;
  uint8_t columns_;
  uint8_t order_[64]{};
  uint8_t previous_ = 0, step_ = 0, count_ = 0;
};
