#pragma once

#include <stdint.h>

#include "SceneGraph.h"
#include "SceneRenderScheduler.h"

template <uint8_t MaximumRegions = 8>
class SceneState {
 public:
  SceneState(SceneGraph &scene,
             SceneRenderScheduler<MaximumRegions> &scheduler)
      : scene_(scene), scheduler_(scheduler) {}

  bool setBounds(uint16_t id, const SceneRect &bounds,
                 uint8_t expansion = 0) {
    SceneNode *node = find(id);
    if (node == nullptr || sameRect(node->bounds, bounds)) return node != nullptr;
    const SceneRect before = node->bounds;
    node->bounds = bounds;
    ++node->revision;
    scheduler_.invalidateChange(before, bounds, expansion);
    return true;
  }

  bool setVisible(uint16_t id, bool visible, uint8_t expansion = 0) {
    SceneNode *node = find(id);
    if (node == nullptr || node->visible == visible) return node != nullptr;
    node->visible = visible;
    ++node->revision;
    scheduler_.invalidate(node->bounds, expansion);
    return true;
  }

  bool setOpacity(uint16_t id, uint8_t opacity, uint8_t expansion = 0) {
    SceneNode *node = find(id);
    if (node == nullptr || node->opacity == opacity) return node != nullptr;
    node->opacity = opacity;
    ++node->revision;
    scheduler_.invalidate(node->bounds, expansion);
    return true;
  }

  bool touch(uint16_t id, uint8_t expansion = 0) {
    SceneNode *node = find(id);
    if (node == nullptr) return false;
    ++node->revision;
    scheduler_.invalidate(node->bounds, expansion);
    return true;
  }

  void touchSource(uint8_t sourceIndex, uint8_t expansion = 0) {
    const uint64_t nodes = scene_.nodesForSource(sourceIndex);
    for (uint8_t index = 0; index < scene_.size(); ++index) {
      if ((nodes & (uint64_t{1} << index)) == 0) continue;
      ++scene_.node(index).revision;
    }
    scheduler_.invalidateSource(scene_, sourceIndex, expansion);
  }

 private:
  static bool sameRect(const SceneRect &left, const SceneRect &right) {
    return left.x == right.x && left.y == right.y &&
           left.width == right.width && left.height == right.height;
  }

  SceneNode *find(uint16_t id) {
    const int16_t index = scene_.findById(id);
    return index < 0 ? nullptr : &scene_.node(index);
  }

  SceneGraph &scene_;
  SceneRenderScheduler<MaximumRegions> &scheduler_;
};
