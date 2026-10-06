#pragma once

#include <stddef.h>
#include <stdint.h>

#include <memory>
#include <new>

struct SceneRect {
  int16_t x = 0;
  int16_t y = 0;
  int16_t width = 0;
  int16_t height = 0;

  bool empty() const { return width <= 0 || height <= 0; }
  int16_t right() const { return x + width; }
  int16_t bottom() const { return y + height; }
};

inline bool sceneRectsIntersect(const SceneRect &left, const SceneRect &right,
                                int16_t distance = 0) {
  return !left.empty() && !right.empty() &&
         left.x <= right.right() + distance &&
         right.x <= left.right() + distance &&
         left.y <= right.bottom() + distance &&
         right.y <= left.bottom() + distance;
}

inline SceneRect sceneRectUnion(const SceneRect &left, const SceneRect &right) {
  if (left.empty()) return right;
  if (right.empty()) return left;
  const int16_t x = left.x < right.x ? left.x : right.x;
  const int16_t y = left.y < right.y ? left.y : right.y;
  const int16_t rightEdge = left.right() > right.right() ? left.right()
                                                           : right.right();
  const int16_t bottomEdge = left.bottom() > right.bottom() ? left.bottom()
                                                              : right.bottom();
  return {x, y, static_cast<int16_t>(rightEdge - x),
          static_cast<int16_t>(bottomEdge - y)};
}

inline SceneRect clipSceneRect(const SceneRect &value, int16_t width,
                               int16_t height) {
  const int16_t x = value.x > 0 ? value.x : 0;
  const int16_t y = value.y > 0 ? value.y : 0;
  const int16_t right = value.right() < width ? value.right() : width;
  const int16_t bottom = value.bottom() < height ? value.bottom() : height;
  return {x, y, static_cast<int16_t>(right - x),
          static_cast<int16_t>(bottom - y)};
}

enum class SceneNodeType : uint8_t {
  Fill,
  Card,
  RoundedRectangle,
  Text,
  Image,
  Line,
  Circle,
  Arc,
  Progress,
  Graph,
  Weather,
};

struct SceneNode {
  SceneRect bounds;
  SceneRect clip;
  uint32_t revision = 0;
  uint32_t sourceMask = 0;
  uint16_t id = 0;
  int16_t zIndex = 0;
  uint8_t payloadIndex = 0;
  uint8_t opacity = 255;
  SceneNodeType type = SceneNodeType::Fill;
  bool visible = true;
};

constexpr uint8_t kMaximumSceneNodes = 64;
constexpr uint8_t kMaximumSceneSources = 32;

class SceneGraph {
 public:
  void clear() { nodeCount_ = 0; }

  bool add(const SceneNode &node, uint8_t *index = nullptr) {
    if (nodeCount_ >= kMaximumSceneNodes || !reserve(nodeCount_ + 1)) {
      return false;
    }
    uint8_t insertion = nodeCount_;
    while (insertion > 0 && nodes_[insertion - 1].zIndex > node.zIndex) {
      nodes_[insertion] = nodes_[insertion - 1];
      --insertion;
    }
    nodes_[insertion] = node;
    ++nodeCount_;
    if (index != nullptr) *index = insertion;
    return true;
  }

  bool reserve(uint8_t required) {
    if (required <= capacity_) return true;
    if (required > kMaximumSceneNodes) return false;
    uint8_t capacity = capacity_ == 0 ? 8 : capacity_;
    while (capacity < required) {
      capacity = capacity > kMaximumSceneNodes / 2
                     ? kMaximumSceneNodes
                     : static_cast<uint8_t>(capacity * 2);
    }
    std::unique_ptr<SceneNode[]> next(
        new (std::nothrow) SceneNode[capacity]{});
    if (!next) return false;
    for (uint8_t index = 0; index < nodeCount_; ++index) {
      next[index] = nodes_[index];
    }
    nodes_.swap(next);
    capacity_ = capacity;
    return true;
  }

  uint8_t size() const { return nodeCount_; }
  const SceneNode &node(uint8_t index) const { return nodes_[index]; }
  SceneNode &node(uint8_t index) { return nodes_[index]; }

  int16_t findById(uint16_t id) const {
    for (uint8_t index = 0; index < nodeCount_; ++index) {
      if (nodes_[index].id == id) return index;
    }
    return -1;
  }

  uint64_t nodesForSource(uint8_t sourceIndex) const {
    if (sourceIndex >= kMaximumSceneSources) return 0;
    uint64_t result = 0;
    const uint32_t source = uint32_t{1} << sourceIndex;
    for (uint8_t index = 0; index < nodeCount_; ++index) {
      if ((nodes_[index].sourceMask & source) != 0) {
        result |= uint64_t{1} << index;
      }
    }
    return result;
  }


  size_t allocatedBytes() const {
    return static_cast<size_t>(capacity_) * sizeof(SceneNode);
  }

 private:
  std::unique_ptr<SceneNode[]> nodes_;
  uint8_t nodeCount_ = 0;
  uint8_t capacity_ = 0;
};

static_assert(sizeof(SceneNode) <= 32, "Scene nodes must remain compact");

template <uint8_t MaximumRegions = 8>
class DirtyRegionSet {
 public:
  DirtyRegionSet(int16_t width, int16_t height)
      : width_(width), height_(height) {}

  void clear() { count_ = 0; }
  uint8_t size() const { return count_; }
  const SceneRect &region(uint8_t index) const { return regions_[index]; }

  void invalidate(SceneRect value, uint8_t expansion = 0) {
    value.x -= expansion;
    value.y -= expansion;
    value.width += expansion * 2;
    value.height += expansion * 2;
    value = clipSceneRect(value, width_, height_);
    if (value.empty()) return;

    bool merged;
    do {
      merged = false;
      for (uint8_t index = 0; index < count_; ++index) {
        if (!shouldMerge(regions_[index], value)) continue;
        value = sceneRectUnion(regions_[index], value);
        regions_[index] = regions_[--count_];
        merged = true;
        break;
      }
    } while (merged);

    if (count_ < MaximumRegions) {
      regions_[count_++] = value;
      return;
    }

    for (uint8_t index = 0; index < count_; ++index) {
      value = sceneRectUnion(value, regions_[index]);
    }
    count_ = 1;
    regions_[0] = value;
  }

  void invalidateChange(const SceneRect &before, const SceneRect &after,
                        uint8_t expansion = 0) {
    invalidate(sceneRectUnion(before, after), expansion);
  }

 private:
  static uint32_t area(const SceneRect &value) {
    return value.empty() ? 0
                         : static_cast<uint32_t>(value.width) * value.height;
  }

  static bool shouldMerge(const SceneRect &left, const SceneRect &right) {
    if (sceneRectsIntersect(left, right, 1)) return true;
    const SceneRect combined = sceneRectUnion(left, right);
    constexpr uint16_t kSeparateTransferCostPixels = 96;
    return area(combined) <=
           area(left) + area(right) + kSeparateTransferCostPixels;
  }

  SceneRect regions_[MaximumRegions]{};
  int16_t width_;
  int16_t height_;
  uint8_t count_ = 0;
};

class FrameDeadline {
 public:
  void arm(uint32_t now, uint16_t delayMs) {
    dueAt_ = now + delayMs;
    armed_ = true;
  }

  void cancel() { armed_ = false; }
  bool armed() const { return armed_; }
  bool due(uint32_t now) const {
    return armed_ && static_cast<int32_t>(now - dueAt_) >= 0;
  }

  void complete(uint32_t now, uint16_t delayMs) { arm(now, delayMs); }

 private:
  uint32_t dueAt_ = 0;
  bool armed_ = false;
};

template <uint8_t MaximumRegions = 8>
class SceneTilePlan {
 public:
  explicit SceneTilePlan(uint8_t tileHeight = 8)
      : tileHeight_(tileHeight == 0 ? 1 : tileHeight) {}

  void begin(const DirtyRegionSet<MaximumRegions> &dirty) {
    count_ = dirty.size();
    for (uint8_t index = 0; index < count_; ++index) {
      regions_[index] = dirty.region(index);
    }
    regionIndex_ = 0;
    row_ = count_ == 0 ? 0 : regions_[0].y;
  }

  bool next(SceneRect &tile) {
    while (regionIndex_ < count_) {
      const SceneRect &region = regions_[regionIndex_];
      if (row_ < region.bottom()) {
        const int16_t remaining = region.bottom() - row_;
        const int16_t height = remaining < tileHeight_ ? remaining : tileHeight_;
        tile = {region.x, row_, region.width, height};
        row_ += height;
        return true;
      }
      ++regionIndex_;
      if (regionIndex_ < count_) row_ = regions_[regionIndex_].y;
    }
    return false;
  }

 private:
  SceneRect regions_[MaximumRegions]{};
  uint8_t tileHeight_;
  uint8_t count_ = 0;
  uint8_t regionIndex_ = 0;
  int16_t row_ = 0;
};

template <typename Visitor>
void visitSceneNodes(const SceneGraph &scene, const SceneRect &tile,
                     Visitor visitor) {
  for (uint8_t index = 0; index < scene.size(); ++index) {
    const SceneNode &node = scene.node(index);
    if (!node.visible || node.opacity == 0 ||
        !sceneRectsIntersect(node.bounds, tile) ||
        !sceneRectsIntersect(node.clip, tile)) {
      continue;
    }
    visitor(index, node);
  }
}

template <uint8_t MaximumRegions>
void invalidateSceneSource(const SceneGraph &scene, uint8_t sourceIndex,
                           DirtyRegionSet<MaximumRegions> &dirty,
                           uint8_t expansion = 0) {
  const uint64_t nodes = scene.nodesForSource(sourceIndex);
  for (uint8_t index = 0; index < scene.size(); ++index) {
    if ((nodes & (uint64_t{1} << index)) != 0) {
      dirty.invalidate(scene.node(index).bounds, expansion);
    }
  }
}
