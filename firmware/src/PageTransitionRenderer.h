#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

#include "DisplayCompat.h"
#include "DisplayScrollBuffer.h"
#include "PageTransitionTypes.h"
#include "ScenePage.h"
#include "SceneRegionPainter.h"

struct FontRenderState;

class PageTransitionRenderer {
 public:
  using ApplyBacklight = void (*)();

  PageTransitionRenderer(MiniDisplay &display, bool &displayOn,
                         uint8_t &displayBrightness,
                         ApplyBacklight applyBacklight,
                         FontRenderState &displayFontState,
                         DisplayScrollBuffer &scrollBuffer);

  static bool parse(JsonVariantConst value, PageTransitionConfig &result);

  void render(const ScenePage &currentPage, const ScenePage &nextPage,
              const PageTransitionConfig &transition, int8_t contentOffsetX,
              int8_t contentOffsetY, uint32_t refreshIntervalMs = 0);
  const char *lastTypeName() const;
  uint32_t lastDurationMs() const { return lastDurationMs_; }

 private:
  MiniDisplay &display_;
  bool &displayOn_;
  uint8_t &displayBrightness_;
  ApplyBacklight applyBacklight_;
  FontRenderState &displayFontState_;
  DisplayScrollBuffer &scrollBuffer_;
  ImageAssetRenderCache imageCache_;
#if defined(ESP8266)
  std::unique_ptr<SceneRegionPainter> regionPainter_;
#endif
  PageTransitionType lastType_ = PageTransitionType::None;
  uint32_t lastDurationMs_ = 0;
};
