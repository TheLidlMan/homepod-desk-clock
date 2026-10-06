#pragma once

#include <stdint.h>

struct SceneAnimationFrame {
  uint8_t index = 0;
  uint8_t count = 0;

  float progress() const {
    return count == 0 ? 1.0F : static_cast<float>(index) / count;
  }
};

class SceneAnimationTimeline {
 public:
  void start(uint32_t now, uint16_t durationMs, uint8_t frameCount) {
    startedAt_ = now;
    durationMs_ = durationMs == 0 ? 1 : durationMs;
    frameCount_ = frameCount == 0 ? 1 : frameCount;
    emittedFrame_ = 0;
    active_ = true;
  }

  void cancel() { active_ = false; }
  void pause(uint32_t durationMs) { startedAt_ += durationMs; }
  bool active() const { return active_; }

  bool next(uint32_t now, SceneAnimationFrame &frame) {
    if (!active_) return false;
    const uint32_t elapsed = now - startedAt_;
    uint8_t target =
        elapsed >= durationMs_
            ? frameCount_
            : static_cast<uint8_t>(
                  static_cast<uint32_t>(elapsed) * frameCount_ / durationMs_ +
                  1);
    if (target > frameCount_) target = frameCount_;
    if (target <= emittedFrame_) return false;

    // Never discard visual frames. A slow frame may delay the transition, but
    // it must not turn a 12-frame effect into two large jumps.
    ++emittedFrame_;
    frame.index = emittedFrame_;
    frame.count = frameCount_;
    if (emittedFrame_ == frameCount_) active_ = false;
    return true;
  }

 private:
  uint32_t startedAt_ = 0;
  uint16_t durationMs_ = 1;
  uint8_t frameCount_ = 1;
  uint8_t emittedFrame_ = 0;
  bool active_ = false;
};
