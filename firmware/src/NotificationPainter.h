#pragma once

#include "NotificationText.h"
#include "StaticSmoothFont.h"
// Supplied by the firmware's existing font assets, without a second flash copy.
StaticSmoothFont notificationTitleFont();
StaticSmoothFont notificationBodyFont();

inline void prepareNotification(DisplayNotification &item, int16_t width, int16_t height, int16_t maximumHeight = 0) {
  if (!maximumHeight) maximumHeight = height - 16;
  item.compact = maximumHeight < 100;
  item.width = std::min<int16_t>(width - 16, 320);
  const int16_t textWidth = item.width - (item.icon == NotificationIcon::None ? 24 : 56);
  const auto title = item.compact ? notificationBodyFont() : notificationTitleFont(), body = notificationBodyFont();
  item.titleLineHeight = title.lineHeight + 2;
  item.messageLineHeight = body.lineHeight + 2;
  item.titleLineCount = wrapNotificationText(item.title, item.titleLines, item.compact ? 1 : 2, textWidth,
      [&](const char *value) { return title.width(value); });
  const int16_t titleHeight = item.titleLineCount * item.titleLineHeight;
  const uint8_t maximum = std::max<int16_t>(1, std::min<int16_t>(8,
      (maximumHeight - (item.compact ? 14 : 28) - titleHeight) / item.messageLineHeight));
  item.messageLineCount = wrapNotificationText(item.message, item.messageLines, maximum, textWidth,
      [&](const char *value) { return body.width(value); });
  item.height = std::max<int16_t>(item.compact ? 40 : 56, (item.compact ? 12 : 24) + titleHeight +
      item.messageLineCount * item.messageLineHeight + (item.titleLineCount && item.messageLineCount ? (item.compact ? 2 : 4) : 0));
}

inline uint16_t notificationAccent(NotificationSeverity severity) {
  switch (severity) {
    case NotificationSeverity::Success: return 0x5e91;
    case NotificationSeverity::Warning: return 0xfd67;
    case NotificationSeverity::Error: return 0xfb6d;
    case NotificationSeverity::Critical: return 0xfb6d;
    default: return 0x4e7f;
  }
}

template <typename Canvas>
void paintNotificationIcon(Canvas &canvas, NotificationIcon icon, int16_t x, int16_t y, uint16_t color) {
  switch (icon) {
    case NotificationIcon::None: return;
    case NotificationIcon::Check:
      canvas.drawLine(x + 2, y + 10, x + 8, y + 16, color);
      canvas.drawLine(x + 8, y + 16, x + 20, y + 3, color); break;
    case NotificationIcon::Warning:
      canvas.drawTriangle(x + 11, y, x, y + 21, x + 22, y + 21, color);
      canvas.fillRect(x + 10, y + 7, 3, 7, color);
      canvas.fillRect(x + 10, y + 17, 3, 2, color); break;
    case NotificationIcon::Error:
      canvas.drawCircle(x + 11, y + 11, 10, color);
      canvas.drawLine(x + 7, y + 7, x + 15, y + 15, color);
      canvas.drawLine(x + 15, y + 7, x + 7, y + 15, color); break;
    case NotificationIcon::Power:
      canvas.fillTriangle(x + 13, y, x + 3, y + 12, x + 12, y + 12, color);
      canvas.fillTriangle(x + 10, y + 10, x + 20, y + 10, x + 8, y + 23, color); break;
    case NotificationIcon::Door:
      canvas.drawRect(x + 3, y, 16, 22, color);
      canvas.fillCircle(x + 15, y + 12, 1, color); break;
    case NotificationIcon::Bell:
      canvas.drawRoundRect(x + 4, y + 3, 14, 15, 6, color);
      canvas.drawFastHLine(x + 1, y + 18, 20, color);
      canvas.fillCircle(x + 11, y + 22, 2, color); break;
    default:
      canvas.drawCircle(x + 11, y + 11, 10, color);
      canvas.fillRect(x + 10, y + 10, 3, 7, color);
      canvas.fillRect(x + 10, y + 5, 3, 2, color); break;
  }
}

// Called last in each compositor band. Rounded corners reveal the actual
// dashboard pixels beneath them, without reading LCD GRAM or saving bitmaps.
template <typename Canvas>
void paintNotificationItem(Canvas &canvas, const DisplayNotification *item, const SceneRect &bounds,
                           int16_t offsetX, int16_t offsetY) {
  const int16_t x = bounds.x + offsetX, y = bounds.y + offsetY;
  if (x >= canvas.width() || y >= canvas.height() || x + bounds.width <= 0 || y + bounds.height <= 0) return;
  const bool critical = item->severity == NotificationSeverity::Critical;
  const uint16_t background = critical ? 0x3005 : 0x10e3;
  const uint16_t border = critical ? 0x8029 : 0x39e8;
  const uint16_t accent = notificationAccent(item->severity);
  canvas.fillRoundRect(x, y, bounds.width, bounds.height, 8, background);
  canvas.drawRoundRect(x, y, bounds.width, bounds.height, 8, border);
  canvas.fillRoundRect(x + 2, y + 10, 3, bounds.height - 20, 1, accent);
  auto icon = item->icon;
  if (icon == NotificationIcon::Auto) {
    icon = item->severity == NotificationSeverity::Success ? NotificationIcon::Check :
        item->severity == NotificationSeverity::Warning ? NotificationIcon::Warning :
        item->severity == NotificationSeverity::Error || item->severity == NotificationSeverity::Critical
            ? NotificationIcon::Error : NotificationIcon::Info;
  }
  paintNotificationIcon(canvas, icon, x + 12, y + 14, accent);
  const int16_t textX = x + (icon == NotificationIcon::None ? 12 : 44);
  int16_t textY = y + (item->compact ? 6 : 12);
  canvas.setTextDatum(TL_DATUM);
  const auto drawLines = [&](const char *text, const NotificationLine *lines, uint8_t count,
                              const StaticSmoothFont &font, uint16_t color, uint16_t lineHeight) {
    char line[100];
    for (uint8_t i = 0; i < count; ++i) {
      memcpy(line, text + lines[i].start, lines[i].length);
      strcpy(line + lines[i].length, lines[i].ellipsis ? "..." : "");
      paintStaticSmoothText(canvas, font, line, textX, textY, color,
          [&](int16_t, int16_t) { return background; });
      textY += lineHeight;
    }
  };
  drawLines(item->title, item->titleLines, item->titleLineCount,
            item->compact ? notificationBodyFont() : notificationTitleFont(), 0xffff, item->titleLineHeight);
  if (item->titleLineCount && item->messageLineCount) textY += item->compact ? 2 : 4;
  drawLines(item->message, item->messageLines, item->messageLineCount,
            notificationBodyFont(), item->titleLineCount ? 0xdedb : 0xffff, item->messageLineHeight);
}

template <typename Canvas>
void paintNotification(Canvas &canvas, const NotificationCenter &center,
                       int16_t offsetX, int16_t offsetY) {
  for (uint8_t i = 0; i < center.visibleCount(); ++i) {
    if (const auto *item = center.item(i))
      paintNotificationItem(canvas, item, center.bounds(i), offsetX, offsetY);
  }
}
