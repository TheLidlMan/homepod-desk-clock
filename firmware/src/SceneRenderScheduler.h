#pragma once

#include <stdint.h>

#include "SceneGraph.h"

template <uint8_t MaximumRegions = 8>
class SceneRenderScheduler {
 public:
  SceneRenderScheduler(int16_t width, int16_t height, uint8_t tileHeight = 8)
      : pending_(width, height), tiles_(tileHeight) {}

  void invalidate(const SceneRect &bounds, uint8_t expansion = 0) {
    pending_.invalidate(bounds, expansion);
  }

  void invalidateChange(const SceneRect &before, const SceneRect &after,
                        uint8_t expansion = 0) {
    pending_.invalidateChange(before, after, expansion);
  }

  void invalidateSource(const SceneGraph &scene, uint8_t sourceIndex,
                        uint8_t expansion = 0) {
    invalidateSceneSource(scene, sourceIndex, pending_, expansion);
  }

  bool beginFrame() {
    if (rendering_ || pending_.size() == 0) return false;
    tiles_.begin(pending_);
    pending_.clear();
    rendering_ = true;
    return true;
  }

  bool nextTile(SceneRect &tile) {
    if (!rendering_) return false;
    if (tiles_.next(tile)) return true;
    rendering_ = false;
    return false;
  }

  bool rendering() const { return rendering_; }
  bool pending() const { return pending_.size() != 0; }
  uint8_t pendingRegionCount() const { return pending_.size(); }
  void reset() {
    pending_.clear();
    rendering_ = false;
  }

 private:
  DirtyRegionSet<MaximumRegions> pending_;
  SceneTilePlan<MaximumRegions> tiles_;
  bool rendering_ = false;
};
