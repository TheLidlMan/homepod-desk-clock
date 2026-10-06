#pragma once

#include <stdint.h>

#include "FeatureFlags.h"

#if MINI_DISPLAY_RUNTIME_PROFILE

enum class RuntimeProfilePoint : uint8_t {
  Loop,
  Http,
  DashboardValidation,
  PageLoad,
  SceneCompile,
  SceneRender,
  SceneTilePaint,
  SpiTransfer,
  Transition,
  TransitionFrame,
  TransitionNone,
  TransitionSlide,
  TransitionBounce,
  TransitionFade,
  TransitionWipe,
  TransitionDissolve,
  TransitionCurtain,
  TransitionBlinds,
  TransitionMosaic,
  TransitionCascade,
  TransitionSpiral,
  TransitionSlideFrame,
  TransitionBounceFrame,
  TransitionFadeFrame,
  TransitionWipeFrame,
  TransitionDissolveFrame,
  TransitionCurtainFrame,
  TransitionBlindsFrame,
  TransitionMosaicFrame,
  TransitionCascadeFrame,
  TransitionSpiralFrame,
  Marquee,
  Notification,
  DataRequest,
  Screenshot,
  Count,
};

struct RuntimeProfileMetric {
  uint64_t totalCycles = 0;
  uint32_t maximumCycles = 0;
  uint32_t lastCycles = 0;
  uint32_t count = 0;
  uint32_t minimumFreeHeap = UINT32_MAX;
  uint32_t minimumLargestBlock = UINT32_MAX;
  uint32_t minimumFreeStack = UINT32_MAX;
  uint8_t maximumFragmentation = 0;
};

class RuntimeProfiler {
 public:
  static uint32_t cycles();
  static const char *name(RuntimeProfilePoint point);

  void record(RuntimeProfilePoint point, uint32_t elapsedCycles);
  void sampleMemory();
  void sampleMemory(RuntimeProfilePoint point);
  void reset();

  const RuntimeProfileMetric &metric(RuntimeProfilePoint point) const {
    return metrics_[static_cast<uint8_t>(point)];
  }
  uint32_t minimumFreeHeap() const { return minimumFreeHeap_; }
  uint32_t minimumLargestBlock() const { return minimumLargestBlock_; }
  uint32_t minimumFreeStack() const { return minimumFreeStack_; }
  uint8_t maximumFragmentation() const { return maximumFragmentation_; }

 private:
  RuntimeProfileMetric metrics_[static_cast<uint8_t>(RuntimeProfilePoint::Count)]{};
  uint32_t minimumFreeHeap_ = UINT32_MAX;
  uint32_t minimumLargestBlock_ = UINT32_MAX;
  uint32_t minimumFreeStack_ = UINT32_MAX;
  uint8_t maximumFragmentation_ = 0;
};

extern RuntimeProfiler runtimeProfiler;

class RuntimeProfileScope {
 public:
  explicit RuntimeProfileScope(RuntimeProfilePoint point)
      : point_(point), started_(RuntimeProfiler::cycles()) {}
  ~RuntimeProfileScope() {
    runtimeProfiler.record(point_, RuntimeProfiler::cycles() - started_);
  }

 private:
  RuntimeProfilePoint point_;
  uint32_t started_;
};

#define MINI_DISPLAY_PROFILE_JOIN_INNER(left, right) left##right
#define MINI_DISPLAY_PROFILE_JOIN(left, right) \
  MINI_DISPLAY_PROFILE_JOIN_INNER(left, right)
#define MINI_DISPLAY_PROFILE_SCOPE(point)                                 \
  RuntimeProfileScope MINI_DISPLAY_PROFILE_JOIN(runtimeProfileScope_,     \
                                                  __LINE__)(point)
#define MINI_DISPLAY_PROFILE_MEMORY(point) runtimeProfiler.sampleMemory(point)

#else

#define MINI_DISPLAY_PROFILE_SCOPE(point) do { } while (false)
#define MINI_DISPLAY_PROFILE_MEMORY(point) do { } while (false)

#endif
