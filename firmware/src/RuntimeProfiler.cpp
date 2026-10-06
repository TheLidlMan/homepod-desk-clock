#include "RuntimeProfiler.h"

#if MINI_DISPLAY_RUNTIME_PROFILE

#include <Arduino.h>
#include <Esp.h>

RuntimeProfiler runtimeProfiler;

uint32_t RuntimeProfiler::cycles() { return ESP.getCycleCount(); }

const char *RuntimeProfiler::name(RuntimeProfilePoint point) {
  static constexpr const char *names[] = {
      "loop",          "http",          "dashboard_validation",
      "page_load",     "scene_compile", "scene_render",
      "tile_paint",    "spi_transfer",  "transition",
      "transition_frame",
      "transition_none", "transition_slide", "transition_bounce",
      "transition_fade", "transition_wipe", "transition_dissolve",
      "transition_curtain", "transition_blinds", "transition_mosaic",
      "transition_cascade", "transition_spiral",
      "transition_slide_frame", "transition_bounce_frame",
      "transition_fade_frame", "transition_wipe_frame",
      "transition_dissolve_frame", "transition_curtain_frame",
      "transition_blinds_frame", "transition_mosaic_frame",
      "transition_cascade_frame", "transition_spiral_frame",
      "marquee",       "notification",
      "data_request",  "screenshot",
  };
  const uint8_t index = static_cast<uint8_t>(point);
  return index < static_cast<uint8_t>(RuntimeProfilePoint::Count)
             ? names[index]
             : "unknown";
}

void RuntimeProfiler::record(RuntimeProfilePoint point,
                             uint32_t elapsedCycles) {
  RuntimeProfileMetric &metric = metrics_[static_cast<uint8_t>(point)];
  metric.lastCycles = elapsedCycles;
  if (elapsedCycles > metric.maximumCycles) metric.maximumCycles = elapsedCycles;
  metric.totalCycles += elapsedCycles;
  ++metric.count;
}

void RuntimeProfiler::sampleMemory() {
  uint32_t freeHeap = 0;
  uint32_t largestBlock = 0;
  uint8_t fragmentation = 0;
  ESP.getHeapStats(&freeHeap, &largestBlock, &fragmentation);
  const uint32_t freeStack = ESP.getFreeContStack();
  if (freeHeap < minimumFreeHeap_) minimumFreeHeap_ = freeHeap;
  if (largestBlock < minimumLargestBlock_) minimumLargestBlock_ = largestBlock;
  if (freeStack < minimumFreeStack_) minimumFreeStack_ = freeStack;
  if (fragmentation > maximumFragmentation_)
    maximumFragmentation_ = fragmentation;
}

void RuntimeProfiler::sampleMemory(RuntimeProfilePoint point) {
  uint32_t freeHeap = 0;
  uint32_t largestBlock = 0;
  uint8_t fragmentation = 0;
  ESP.getHeapStats(&freeHeap, &largestBlock, &fragmentation);
  const uint32_t freeStack = ESP.getFreeContStack();
  RuntimeProfileMetric &metric = metrics_[static_cast<uint8_t>(point)];
  if (freeHeap < metric.minimumFreeHeap) metric.minimumFreeHeap = freeHeap;
  if (largestBlock < metric.minimumLargestBlock) {
    metric.minimumLargestBlock = largestBlock;
  }
  if (freeStack < metric.minimumFreeStack) metric.minimumFreeStack = freeStack;
  if (fragmentation > metric.maximumFragmentation) {
    metric.maximumFragmentation = fragmentation;
  }
  if (freeHeap < minimumFreeHeap_) minimumFreeHeap_ = freeHeap;
  if (largestBlock < minimumLargestBlock_) minimumLargestBlock_ = largestBlock;
  if (freeStack < minimumFreeStack_) minimumFreeStack_ = freeStack;
  if (fragmentation > maximumFragmentation_) {
    maximumFragmentation_ = fragmentation;
  }
}

void RuntimeProfiler::reset() {
  for (auto &metric : metrics_) metric = RuntimeProfileMetric{};
  minimumFreeHeap_ = UINT32_MAX;
  minimumLargestBlock_ = UINT32_MAX;
  minimumFreeStack_ = UINT32_MAX;
  maximumFragmentation_ = 0;
  sampleMemory();
}

#endif
