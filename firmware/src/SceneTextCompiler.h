#pragma once

#include <ArduinoJson.h>

#include "CardValue.h"
#include "DisplayCompat.h"
#include "SceneCompileFailure.h"
#include "ScenePage.h"
#include "UserFonts.h"

struct CardTextLayout {
  int16_t valueY;
  int16_t valueHeight;
  int16_t titleY;
  int16_t titleHeight;
  bool hasTitle;
  RenderFont titleFont;
};

struct RingLayout {
  int16_t x;
  int16_t y;
  int16_t diameter;
  int16_t valueY;
  int16_t valueHeight;
};

class SceneTextCompiler {
 public:
  SceneTextCompiler(MiniDisplay &display, FontRenderState &fontState,
                    CardValueResolver &cardValues,
                    SceneCompileFailure &failure)
      : display_(display),
        fontState_(fontState),
        cardValues_(cardValues),
        failure_(failure) {}

  uint16_t color(JsonVariantConst value, uint16_t fallback) const;
  uint16_t cardTitleColor(JsonObjectConst card,
                          JsonObjectConst colorMapping) const;
  void applyFont(const RenderFont &font);
  bool marquee(JsonVariantConst style, bool fallback = false) const;
  CardTextLayout cardLayout(JsonObjectConst card, int16_t width, int16_t y,
                            int16_t height);
  RingLayout ringLayout(int16_t x, int16_t y, int16_t width,
                        int16_t height) const;
  RenderFont selectFreeFont(const String &text, JsonVariantConst style,
                            int16_t width, int16_t height,
                            bool scroll = false);
  bool compileText(ScenePage &page, const String &value,
                   const RenderFont &font, uint8_t datum, int16_t x,
                   int16_t y, uint16_t foreground, uint16_t background,
                   const TextEffect &effect = TextEffect{},
                   uint8_t lineCount = 1, int16_t blockWidth = 0,
                   uint16_t maxBytes = 48, uint32_t sourceMask = 0,
                   int16_t zIndex = 1000);
  bool compilePositioned(ScenePage &page, String value,
                         JsonVariantConst style, int16_t x, int16_t y,
                         int16_t width, int16_t height, uint16_t foreground,
                         uint16_t background,
                         const char *defaultHorizontal = "center",
                         const char *defaultVertical = "middle",
                         int16_t fontHeight = 0,
                         const RenderFont *selectedFont = nullptr,
                         bool tightVerticalEdges = false,
                         bool freeFit = false, uint32_t sourceMask = 0,
                         int16_t zIndex = 1000,
                         bool preserveText = false);
  bool compileCentered(ScenePage &page, String value, JsonVariantConst style,
                       int16_t x, int16_t y, int16_t width, int16_t height,
                       uint16_t foreground, uint16_t background,
                       bool freeFit = false, uint32_t sourceMask = 0,
                       int16_t zIndex = 1000);

 private:
  uint8_t requestedFontSize(JsonVariantConst style, int16_t height) const;
  RenderFont selectBestFont(const String &text, JsonVariantConst style,
                            int16_t width, int16_t height,
                            bool scroll = false);
  RenderFont selectCardTitleFont(const String &text, JsonVariantConst style,
                                 int16_t width, int16_t height,
                                 int8_t maximumAutoSize);
  TextEffect textEffect(JsonVariantConst style) const;

  MiniDisplay &display_;
  FontRenderState &fontState_;
  CardValueResolver &cardValues_;
  SceneCompileFailure &failure_;
};
