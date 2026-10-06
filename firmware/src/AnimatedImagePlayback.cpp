#include "AnimatedImagePlayback.h"

#include <LittleFS.h>

namespace {

void mergeDamage(ImageAssetFrame &target, const ImageAssetFrame &source) {
  const uint16_t left = min(target.dirtyX, source.dirtyX);
  const uint16_t top = min(target.dirtyY, source.dirtyY);
  const uint16_t right = max<uint16_t>(target.dirtyX + target.dirtyWidth,
                                       source.dirtyX + source.dirtyWidth);
  const uint16_t bottom = max<uint16_t>(target.dirtyY + target.dirtyHeight,
                                        source.dirtyY + source.dirtyHeight);
  target.dirtyX = left;
  target.dirtyY = top;
  target.dirtyWidth = right - left;
  target.dirtyHeight = bottom - top;
}

}  // namespace

bool AnimatedImagePlayback::advance(Entry &entry, uint32_t now) const {
  File file = LittleFS.open(imageAssetPath(String(entry.id)), "r");
  if (!file) return false;
  const uint32_t late = now - entry.nextAt;
  if (late >= entry.info.durationMs) {
    entry.nextAt += (late / entry.info.durationMs) * entry.info.durationMs;
  }
  bool first = true;
  ImageAssetFrame combined;
  do {
    entry.frame = (entry.frame + 1) % entry.info.frameCount;
    ImageAssetFrame frame;
    if (!readImageAssetFrame(file, entry.info, entry.frame, &frame)) {
      file.close();
      return false;
    }
    if (first) {
      combined = frame;
      first = false;
    } else {
      mergeDamage(combined, frame);
    }
    entry.nextAt += frame.durationMs;
  } while (static_cast<int32_t>(now - entry.nextAt) >= 0);
  entry.damage = combined;
  file.close();
  return true;
}

bool AnimatedImagePlayback::add(const char *id, uint32_t now,
                                const Entry *previous,
                                uint8_t previousCount) {
  if (!id || !id[0]) return false;
  for (uint8_t index = 0; index < count_; ++index) {
    if (strcmp(entries_[index].id, id) == 0) return true;
  }
  if (count_ >= kMaximumActiveAnimatedImages) return false;
  File file = LittleFS.open(imageAssetPath(String(id)), "r");
  ImageAssetInfo info;
  const bool animated = file && readImageAssetInfo(file, &info) && info.animated;
  if (!animated) {
    if (file) file.close();
    return false;
  }

  Entry &entry = entries_[count_++];
  entry = Entry{};
  strlcpy(entry.id, id, sizeof(entry.id));
  entry.info = info;
  for (uint8_t index = 0; index < previousCount; ++index) {
    if (strcmp(previous[index].id, id) != 0) continue;
    entry.frame = previous[index].frame;
    entry.nextAt = previous[index].nextAt;
    entry.damage = previous[index].damage;
    file.close();
    return true;
  }
  ImageAssetFrame first;
  if (!readImageAssetFrame(file, info, 0, &first)) {
    file.close();
    --count_;
    return false;
  }
  file.close();
  entry.damage = first;
  entry.nextAt = now + first.durationMs;
  return true;
}

void AnimatedImagePlayback::bind(ScenePage &page, uint32_t now,
                                 bool preserve) {
  Entry previous[kMaximumActiveAnimatedImages];
  const uint8_t previousCount = preserve ? count_ : 0;
  for (uint8_t index = 0; index < previousCount; ++index)
    previous[index] = entries_[index];
  count_ = 0;
  add(page.backgroundImage, now, previous, previousCount);
  for (uint8_t index = 0; index < page.cardCount; ++index)
    add(page.cards[index].image, now, previous, previousCount);
  for (uint8_t index = 0; index < count_; ++index) {
    applyFrame(page, entries_[index].id, entries_[index].info,
               entries_[index].frame, entries_[index].damage,
               [](const SceneRect &, bool) {});
  }
}
