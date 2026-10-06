#pragma once

#include <algorithm>
#include <cstring>
#include <memory>
#include <stdint.h>

#include "SceneGraph.h"

enum class NotificationPosition : uint8_t {
  Top, Bottom, Left, Right, TopLeft, TopRight, BottomLeft, BottomRight
};
enum class NotificationSeverity : uint8_t { Info, Success, Warning, Error, Critical };
enum class NotificationIcon : uint8_t { Auto, None, Bell, Info, Check, Warning, Error, Power, Door };

inline const char *notificationPositionName(NotificationPosition value) {
  switch (value) {
    case NotificationPosition::Bottom: return "bottom";
    case NotificationPosition::Left: return "left";
    case NotificationPosition::Right: return "right";
    case NotificationPosition::TopLeft: return "top_left";
    case NotificationPosition::TopRight: return "top_right";
    case NotificationPosition::BottomLeft: return "bottom_left";
    case NotificationPosition::BottomRight: return "bottom_right";
    default: return "top";
  }
}

inline uint8_t notificationPositionCount(int16_t width, int16_t height) {
  return width >= 320 && height >= 240 ? 8 : 2;
}

inline bool parseNotificationPosition(const char *name, NotificationPosition &value,
                                      int16_t width, int16_t height) {
  if (!name) return false;
  for (uint8_t i = 0; i < notificationPositionCount(width, height); ++i) {
    const auto candidate = static_cast<NotificationPosition>(i);
    if (strcmp(name, notificationPositionName(candidate)) == 0) {
      value = candidate;
      return true;
    }
  }
  return false;
}

struct NotificationLine { uint16_t start = 0, length = 0; bool ellipsis = false; };

struct DisplayNotification {
  static constexpr size_t kTitleBytes = 96, kMessageBytes = 384;
  char title[kTitleBytes + 1]{};
  char message[kMessageBytes + 1]{};
  NotificationLine titleLines[2]{};
  NotificationLine messageLines[8]{};
  uint8_t titleLineCount = 0, messageLineCount = 0;
  uint16_t width = 224, height = 80;
  uint16_t titleLineHeight = 24, messageLineHeight = 24;
  bool compact = false;
  uint32_t durationMs = 8000;
  NotificationPosition position = NotificationPosition::Top;
  NotificationSeverity severity = NotificationSeverity::Info;
  NotificationIcon icon = NotificationIcon::Auto;
};

// At most three bounded allocations. No frame buffer and no persistent writes.
// Expiration starts after a fully visible frame was actually transferred.
class NotificationCenter {
 public:
  static constexpr uint8_t kCapacity = 3;
  static constexpr uint32_t kAnimationMs = 240;
  using Prepare = void (*)(DisplayNotification &, int16_t, int16_t, int16_t);

  bool enqueue(std::unique_ptr<DisplayNotification> message) {
    if (!message || count_ == kCapacity) return false;
    slots_[count_].remainingMs = message->durationMs;
    slots_[count_].message = std::move(message);
    ++count_;
    layoutDirty_ = true;
    return true;
  }
  bool active() const { return count_ != 0; }
  uint8_t count() const { return count_; }
  uint8_t maxVisible() const { return maxVisible_; }
  uint8_t visibleCount() const { return std::min(count_, maxVisible_); }
  uint32_t revision() const { return revision_; }
  bool setMaxVisible(uint8_t value) {
    if (value < 1 || value > kCapacity) return false;
    layoutDirty_ |= value != maxVisible_;
    maxVisible_ = value;
    return true;
  }
  const DisplayNotification *current() const {
    return active() ? slots_[0].message.get() : nullptr;
  }
  const DisplayNotification *item(uint8_t index) const {
    return index < visibleCount() && slots_[index].phase != Phase::Queued ? slots_[index].message.get() : nullptr;
  }
  SceneRect bounds(uint8_t index) const { return item(index) ? slots_[index].bounds : SceneRect{}; }
  SceneRect bounds() const {
    SceneRect result{};
    for (uint8_t i = 0; i < visibleCount(); ++i) result = sceneRectUnion(result, bounds(i));
    return result;
  }
  void dismissAll() {
    for (auto &slot : slots_) slot = Slot{};
    count_ = 0;
    layoutDirty_ = true;
    ++revision_;
  }

  void advance(uint32_t now, int16_t width, int16_t height, bool animate, Prepare prepare = nullptr) {
    if (!active()) return;
    const uint8_t visible = visibleCount();
    for (uint8_t i = 0; i < count_; ++i) {
      auto &slot = slots_[i];
      if (i >= visible && slot.phase != Phase::Queued) {
        if (slot.phase == Phase::Holding)
          slot.remainingMs -= std::min(slot.remainingMs, now - slot.phaseAt);
        if (slot.phase == Phase::Leaving) slot.remainingMs = 0;
        slot.phase = Phase::Queued;
        slot.bounds = {};
        ++revision_;
      } else if (i < visible && slot.phase == Phase::Queued) {
        slot.phase = Phase::Entering;
        slot.phaseAt = now;
        layoutDirty_ = true;
      }
    }
    if (layoutDirty_) layout(width, height, prepare);
    for (uint8_t i = 0; i < visible; ++i) {
      auto &slot = slots_[i];
      if (slot.phase == Phase::Holding && now - slot.phaseAt >= slot.remainingMs) {
        slot.phase = Phase::Leaving;
        slot.phaseAt = now;
      }
      uint16_t progress = animate ? std::min<uint32_t>(kAnimationMs, now - slot.phaseAt) * 1000 / kAnimationMs : 1000;
      if (slot.phase == Phase::Holding) progress = 1000;
      if (slot.phase == Phase::Leaving) progress = 1000 - progress;
      const int32_t visibility = 1000 - (1000 - progress) * (1000 - progress) / 1000;
      SceneRect next = slot.target;
      const auto position = slot.message->position;
      if (side(position)) {
        const int16_t hidden = position == NotificationPosition::Left ? -next.width : width;
        next.x = hidden + (next.x - hidden) * visibility / 1000;
      } else {
        const int16_t hidden = bottom(position) ? height : -next.height;
        next.y = hidden + (next.y - hidden) * visibility / 1000;
      }
      if (memcmp(&next, &slot.bounds, sizeof(SceneRect)) != 0) ++revision_;
      slot.bounds = next;
      slot.fullyVisible = progress == 1000;
      slot.fullyHidden = slot.phase == Phase::Leaving && progress == 0;
    }
  }

  void presented(uint32_t now) {
    for (uint8_t i = 0; i < count_;) {
      auto &slot = slots_[i];
      if (slot.phase == Phase::Entering && slot.fullyVisible) {
        slot.phase = Phase::Holding;
        slot.phaseAt = now;
      } else if (slot.phase == Phase::Leaving && slot.fullyHidden) {
        for (uint8_t j = i; j + 1 < count_; ++j) slots_[j] = std::move(slots_[j + 1]);
        slots_[--count_] = Slot{};
        layoutDirty_ = true;
        ++revision_;
        continue;
      }
      ++i;
    }
  }

 private:
  static bool bottom(NotificationPosition p) {
    return p == NotificationPosition::Bottom || p == NotificationPosition::BottomLeft || p == NotificationPosition::BottomRight;
  }
  static bool side(NotificationPosition p) {
    return p == NotificationPosition::Left || p == NotificationPosition::Right;
  }
  void layout(int16_t width, int16_t height, Prepare prepare) {
    const uint8_t visible = visibleCount();
    const int16_t maximum = (height - 16 - 6 * (visible - 1)) / visible;
    int16_t topY = 8, bottomY = height - 8, sideHeight = 0;
    for (uint8_t i = 0; i < visible; ++i) {
      auto &slot = slots_[i];
      auto &item = *slot.message;
      if (prepare) prepare(item, width, height, maximum);
      item.height = std::min<int16_t>(item.height, maximum);
      const auto p = item.position;
      int16_t x = (width - item.width) / 2, y = topY;
      if (p == NotificationPosition::Left || p == NotificationPosition::TopLeft || p == NotificationPosition::BottomLeft) x = 8;
      if (p == NotificationPosition::Right || p == NotificationPosition::TopRight || p == NotificationPosition::BottomRight) x = width - item.width - 8;
      if (side(p)) sideHeight += item.height + 6;
      else if (bottom(p)) { bottomY -= item.height; y = bottomY; bottomY -= 6; }
      else topY += item.height + 6;
      slot.target = {x, y, static_cast<int16_t>(item.width), static_cast<int16_t>(item.height)};
    }
    int16_t sideY = topY + (bottomY - topY - std::max<int16_t>(0, sideHeight - 6)) / 2;
    for (uint8_t i = 0; i < visible; ++i) {
      if (!side(slots_[i].message->position)) continue;
      slots_[i].target.y = sideY;
      sideY += slots_[i].target.height + 6;
    }
    layoutDirty_ = false;
    ++revision_;
  }
  enum class Phase : uint8_t { Queued, Entering, Holding, Leaving };
  struct Slot {
    std::unique_ptr<DisplayNotification> message;
    SceneRect bounds{}, target{};
    uint32_t phaseAt = 0, remainingMs = 0;
    Phase phase = Phase::Queued;
    bool fullyVisible = false, fullyHidden = false;
  };
  Slot slots_[kCapacity];
  uint32_t revision_ = 0;
  uint8_t count_ = 0, maxVisible_ = kCapacity;
  bool layoutDirty_ = true;
};
