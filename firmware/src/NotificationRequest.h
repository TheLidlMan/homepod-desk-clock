#pragma once

#include <ArduinoJson.h>
#include "NotificationText.h"

inline const char *parseNotificationRequest(JsonVariantConst root,
    DisplayNotification &item, NotificationPosition defaultPosition,
    int16_t width, int16_t height) {
  if (!root.is<JsonObjectConst>()) return "Expected a JSON object";
  for (JsonPairConst field : root.as<JsonObjectConst>()) {
    const char *key = field.key().c_str();
    if (strcmp(key, "title") && strcmp(key, "message") && strcmp(key, "icon") &&
        strcmp(key, "severity") && strcmp(key, "durationSeconds") && strcmp(key, "position"))
      return "Unknown notification field";
  }
  const auto copyText = [&](const char *name, char *destination, size_t maximum) {
    if (!root.containsKey(name)) return true;
    if (!root[name].is<const char *>()) return false;
    const auto value = root[name].as<JsonString>();
    if (!validNotificationText(value.c_str(), value.size(), maximum)) return false;
    memcpy(destination, value.c_str(), value.size());
    destination[value.size()] = 0;
    return true;
  };
  if (!copyText("title", item.title, DisplayNotification::kTitleBytes)) return "Title must be valid UTF-8 up to 96 bytes";
  if (!copyText("message", item.message, DisplayNotification::kMessageBytes)) return "Message must be valid UTF-8 up to 384 bytes";
  if (strspn(item.title, " \n") == strlen(item.title) &&
      strspn(item.message, " \n") == strlen(item.message)) return "Title or message is required";
  if (root.containsKey("durationSeconds")) {
    if (!root["durationSeconds"].is<unsigned>() || root["durationSeconds"].as<unsigned>() < 1 ||
        root["durationSeconds"].as<unsigned>() > 300) return "Duration must be 1-300 whole seconds";
    item.durationMs = root["durationSeconds"].as<unsigned>() * 1000U;
  }
  item.position = defaultPosition;
  if (root.containsKey("position") && !parseNotificationPosition(
      root["position"].as<const char *>(), item.position, width, height)) return "Unsupported notification position";
  if (root.containsKey("severity")) {
    const char *value = root["severity"].as<const char *>();
    if (!value) return "Invalid severity";
    if (!strcmp(value, "info")) item.severity = NotificationSeverity::Info;
    else if (!strcmp(value, "success")) item.severity = NotificationSeverity::Success;
    else if (!strcmp(value, "warning")) item.severity = NotificationSeverity::Warning;
    else if (!strcmp(value, "error")) item.severity = NotificationSeverity::Error;
    else if (!strcmp(value, "critical")) item.severity = NotificationSeverity::Critical;
    else return "Invalid severity";
  }
  if (root.containsKey("icon")) {
    const char *value = root["icon"].as<const char *>();
    if (!value) return "Invalid icon";
    if (!strcmp(value, "auto")) item.icon = NotificationIcon::Auto;
    else if (!strcmp(value, "none")) item.icon = NotificationIcon::None;
    else if (!strcmp(value, "bell")) item.icon = NotificationIcon::Bell;
    else if (!strcmp(value, "info")) item.icon = NotificationIcon::Info;
    else if (!strcmp(value, "check")) item.icon = NotificationIcon::Check;
    else if (!strcmp(value, "warning")) item.icon = NotificationIcon::Warning;
    else if (!strcmp(value, "error")) item.icon = NotificationIcon::Error;
    else if (!strcmp(value, "power")) item.icon = NotificationIcon::Power;
    else if (!strcmp(value, "door")) item.icon = NotificationIcon::Door;
    else return "Invalid icon";
  }
  return nullptr;
}
