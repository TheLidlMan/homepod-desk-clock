#pragma once

#include <ArduinoJson.h>
#include <cmath>

struct FreeTextFrame {
  int16_t x, y, width, height;
};

inline bool validFreeTextFrame(JsonObjectConst frame) {
  if (frame.isNull()) return false;
  for (const char *key : {"x", "y", "width", "height"})
    if (!frame[key].is<float>() || !std::isfinite(frame[key].as<float>())) return false;
  return frame["x"].as<float>() >= 0 && frame["y"].as<float>() >= 0 &&
      frame["width"].as<float>() >= 2 && frame["height"].as<float>() >= 2 &&
      frame["x"].as<float>() + frame["width"].as<float>() <= 100.01F &&
      frame["y"].as<float>() + frame["height"].as<float>() <= 100.01F;
}

inline FreeTextFrame freeTextFrame(JsonObjectConst card, bool title) {
  JsonObjectConst frame = card[title ? "titleFrame" : "valueFrame"];
  const bool stored = !frame.isNull();
  if (!stored) frame = card["frame"];
  float x = frame["x"] | 0.0F, y = frame["y"] | 0.0F;
  float width = frame["width"] | 50.0F, height = frame["height"] | 25.0F;
  if (!stored) {
    const float titleHeight = fminf(height, fmaxf(2.0F, height * .3F));
    const char *name = card["title"] | "";
    if (title) height = titleHeight;
    else if (name[0] && (card["showTitle"] | true) && height >= 4.0F) {
      y += titleHeight;
      height = fmaxf(2.0F, height - titleHeight);
    }
  }
  return {int16_t(lroundf(x * 2.4F)), int16_t(lroundf(y * 2.4F)),
          int16_t(lroundf(width * 2.4F)), int16_t(lroundf(height * 2.4F))};
}
