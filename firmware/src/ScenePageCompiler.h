#pragma once

#include "CardValue.h"
#include "DashboardValues.h"
#include "GraphHistory.h"
#include "SceneTextCompiler.h"

class ScenePageCompiler {
 public:
  ScenePageCompiler(MiniDisplay &display, SceneTextCompiler &text,
                    DashboardValues &values, CardValueResolver &cardValues,
                    GraphHistory &graphHistory, SceneCompileFailure &failure)
      : display_(display),
        text_(text),
        values_(values),
        cardValues_(cardValues),
        graphHistory_(graphHistory),
        failure_(failure) {}

  bool compile(JsonObjectConst source, ScenePage &page);

 private:
  struct PageContentLayout {
    int16_t x;
    int16_t y;
    int16_t right;
    int16_t bottom;
    int16_t titleThickness;
    const char *titlePosition;
    bool hasTitle;
  };

  GraphPaintConfig compileGraph(JsonObjectConst card);
  void addSource(const char *source, uint32_t &mask);
  void collectSources(JsonVariantConst value, uint32_t &mask);
  bool compileCard(ScenePage &page, JsonObjectConst card, int16_t x,
                   int16_t y, int16_t width, int16_t height,
                   bool forceTransparent = false);
  uint8_t pageTitleFontSize(JsonVariantConst style) const;
  RenderFont pageTitleFont(JsonVariantConst style) const;
  int16_t pageTitleThickness(JsonVariantConst style);
  RenderFont rowTitleFont(JsonVariantConst style) const;
  int16_t rowTitleHeight(JsonVariantConst style);
  PageContentLayout contentLayout(JsonObjectConst page);

  MiniDisplay &display_;
  SceneTextCompiler &text_;
  DashboardValues &values_;
  CardValueResolver &cardValues_;
  GraphHistory &graphHistory_;
  SceneCompileFailure &failure_;
};
