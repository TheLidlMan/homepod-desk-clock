#pragma once

#include <Arduino.h>

#include "ImageAssets.h"
#include "ScenePage.h"

constexpr uint8_t kMaximumActiveAnimatedImages = 8;

class AnimatedImagePlayback {
 public:
  void bind(ScenePage &page, uint32_t now, bool preserve = false);

  template <typename Invalidate>
  bool update(ScenePage &page, uint32_t now, Invalidate invalidate) {
    bool changed = false;
    for (uint8_t index = 0; index < count_; ++index) {
      Entry &entry = entries_[index];
      if (static_cast<int32_t>(now - entry.nextAt) < 0) continue;
      const uint16_t previousFrame = entry.frame;
      if (!advance(entry, now)) {
        entry.nextAt = now + 1000;
        continue;
      }
      if (entry.frame == previousFrame) continue;
      changed =
          applyFrame(page, entry.id, entry.info, entry.frame, entry.damage,
                     invalidate) ||
          changed;
    }
    return changed;
  }

  void clear() { count_ = 0; }
  uint8_t count() const { return count_; }

 private:
  struct Entry {
    char id[kImageAssetIdLength + 1]{};
    ImageAssetInfo info{};
    uint32_t nextAt = 0;
    uint16_t frame = 0;
    ImageAssetFrame damage{};
  };

  bool add(const char *id, uint32_t now, const Entry *previous,
           uint8_t previousCount);
  bool advance(Entry &entry, uint32_t now) const;

  static SceneRect mapDamage(const ImageAssetInfo &info,
                             const ImageAssetFrame &damage,
                             const SceneRect &target, ImageFit fit) {
    int16_t destinationX = target.x;
    int16_t destinationY = target.y;
    int16_t destinationWidth = target.width;
    int16_t destinationHeight = target.height;
    int16_t sourceX = 0;
    int16_t sourceY = 0;
    int16_t sampledWidth = info.width;
    int16_t sampledHeight = info.height;
    const int32_t sourceRatio =
        static_cast<int32_t>(info.width) * target.height;
    const int32_t destinationRatio =
        static_cast<int32_t>(target.width) * info.height;
    if (fit == ImageFit::Contain) {
      if (sourceRatio > destinationRatio) {
        destinationHeight = max<int16_t>(
            1, static_cast<int32_t>(target.width) * info.height / info.width);
        destinationY += (target.height - destinationHeight) / 2;
      } else {
        destinationWidth = max<int16_t>(
            1, static_cast<int32_t>(target.height) * info.width / info.height);
        destinationX += (target.width - destinationWidth) / 2;
      }
    } else if (fit == ImageFit::Cover) {
      if (sourceRatio > destinationRatio) {
        sampledWidth = max<int16_t>(
            1, static_cast<int32_t>(info.height) * target.width /
                   target.height);
        sourceX = (info.width - sampledWidth) / 2;
      } else {
        sampledHeight = max<int16_t>(
            1, static_cast<int32_t>(info.width) * target.height /
                   target.width);
        sourceY = (info.height - sampledHeight) / 2;
      }
    }
    const int16_t left = max<int16_t>(damage.dirtyX, sourceX);
    const int16_t top = max<int16_t>(damage.dirtyY, sourceY);
    const int16_t right = min<int16_t>(
        damage.dirtyX + damage.dirtyWidth, sourceX + sampledWidth);
    const int16_t bottom = min<int16_t>(
        damage.dirtyY + damage.dirtyHeight, sourceY + sampledHeight);
    if (left >= right || top >= bottom) return {};
    const int16_t x = destinationX +
        static_cast<int32_t>(left - sourceX) * destinationWidth /
            sampledWidth;
    const int16_t y = destinationY +
        static_cast<int32_t>(top - sourceY) * destinationHeight /
            sampledHeight;
    const int16_t mappedRight = destinationX +
        (static_cast<int32_t>(right - sourceX) * destinationWidth +
         sampledWidth - 1) /
            sampledWidth;
    const int16_t mappedBottom = destinationY +
        (static_cast<int32_t>(bottom - sourceY) * destinationHeight +
         sampledHeight - 1) /
            sampledHeight;
    return {x, y, static_cast<int16_t>(mappedRight - x),
            static_cast<int16_t>(mappedBottom - y)};
  }

  template <typename Invalidate>
  static bool applyFrame(ScenePage &page, const char *id,
                         const ImageAssetInfo &info, uint16_t frame,
                         const ImageAssetFrame &damage,
                         Invalidate invalidate) {
    bool changed = false;
    if (strcmp(page.backgroundImage, id) == 0 &&
        page.backgroundImageFrame != frame) {
      page.backgroundImageFrame = frame;
      invalidateDamage(info, damage, SceneRect{0, 0, 240, 240},
                       ImageFit::Cover, invalidate);
      changed = true;
    }
    for (uint8_t nodeIndex = 0; nodeIndex < page.graph.size(); ++nodeIndex) {
      const SceneNode &node = page.graph.node(nodeIndex);
      if (node.type != SceneNodeType::Card) continue;
      SceneCard &card = page.cards[node.payloadIndex];
      if (strcmp(card.image, id) != 0 || card.imageFrame == frame) continue;
      card.imageFrame = frame;
      invalidateDamage(info, damage, node.bounds, card.imageFit, invalidate);
      changed = true;
    }
    return changed;
  }

  template <typename Invalidate>
  static void invalidateDamage(const ImageAssetInfo &info,
                               const ImageAssetFrame &damage,
                               const SceneRect &target, ImageFit fit,
                               Invalidate invalidate) {
    const SceneRect mapped = mapDamage(info, damage, target, fit);
    if (!mapped.empty()) invalidate(mapped, false);
  }

  Entry entries_[kMaximumActiveAnimatedImages]{};
  uint8_t count_ = 0;
};
