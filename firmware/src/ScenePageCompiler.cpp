#include "ScenePageCompiler.h"

#include "DisplayFonts.h"
#include "FreeTextFrame.h"
#include "RuntimeProfiler.h"
#include "WeatherCardRenderer.h"
#include "fonts/WeatherGlyphs.h"

GraphPaintConfig ScenePageCompiler::compileGraph(JsonObjectConst card) {
  GraphPaintConfig result;
  result.series = graphHistory_.find(card);
  JsonObjectConst graph = card["graph"];
  result.minimum = graph["minimum"] | NAN;
  result.maximum = graph["maximum"] | NAN;
  result.color = text_.color(graph["color"], TFT_CYAN);
  result.gridColor = text_.color(graph["gridColor"], TFT_DARKGREY);
  result.opacity = graph["opacity"] | 50;
  result.fillOpacity = graph["fillOpacity"] | 0;
  result.gridOpacity = graph["gridOpacity"] | 20;
  result.gridLines = graph["gridLines"] | 0;
  result.lineWidth = graph["lineWidth"] | 1;
  result.pointSize = graph["pointSize"] | 1;
  result.barGap = graph["barGap"] | 1;
  result.line = strcmp(graph["type"] | "bar", "line") == 0;
  result.fit =
      strcmp(graph["scale"] | (result.line ? "fit" : "zero"), "fit") == 0;
  result.showPoints = graph["showPoints"] | false;
  result.scalePadding = graph["scalePadding"] | 5;
  result.labels = graph["showValues"] | false;
  result.labelEvery = graph["labelEvery"] | 6;
  result.decimals = graph["decimals"] | 1;
  return result;
}

void ScenePageCompiler::addSource(const char *source, uint32_t &mask) {
  DashboardValue *value = values_.find(source, false);
  if (value == nullptr) return;
  const uint8_t index = values_.indexOf(value);
  if (index < 32) mask |= uint32_t{1} << index;
}

void ScenePageCompiler::collectSources(JsonVariantConst value,
                                       uint32_t &mask) {
  if (value.is<JsonArrayConst>()) {
    for (JsonVariantConst item : value.as<JsonArrayConst>()) {
      if (item.is<const char *>())
        addSource(item.as<const char *>(), mask);
      else
        collectSources(item, mask);
    }
    return;
  }
  if (!value.is<JsonObjectConst>()) return;
  for (JsonPairConst pair : value.as<JsonObjectConst>()) {
    const char *key = pair.key().c_str();
    JsonVariantConst nested = pair.value();
    if ((strcmp(key, "source") == 0 || strcmp(key, "entity") == 0) &&
        nested.is<const char *>()) {
      addSource(nested.as<const char *>(), mask);
    } else if (strcmp(key, "sources") == 0 || nested.is<JsonObjectConst>() ||
               nested.is<JsonArrayConst>()) {
      collectSources(nested, mask);
    }
  }
}

bool ScenePageCompiler::compileCard(ScenePage &page, JsonObjectConst card,
                                    int16_t x, int16_t y, int16_t width,
                                    int16_t height, bool forceTransparent) {
  if (page.cardCount >= kMaxSceneCards) {
    failure_ = SceneCompileFailure::CardLimit;
    return false;
  }
  if (!page.cards.ensure(page.cardCount + 1)) {
    failure_ = SceneCompileFailure::Allocation;
    return false;
  }
  JsonObjectConst colorMapping;
  const char *source = card["source"];
  DashboardValue *sourceValue = values_.find(source, false);
  uint32_t sourceMask = 0;
  collectSources(card, sourceMask);
  if (sourceValue != nullptr && sourceValue->available) {
    const char *cardType = card["type"] | "";
    const String mappingValue =
        strcmp(cardType, "number") == 0
            ? cardValues_.transformedNumberText(card, sourceValue->state,
                                                false)
            : String(sourceValue->state);
    cardValues_.findMapping(card, "colorMappings", mappingValue,
                            colorMapping);
  }
  JsonVariantConst backgroundValue = colorMapping["background"];
  if (backgroundValue.isNull()) backgroundValue = card["style"]["background"];
  JsonVariantConst foregroundValue = colorMapping["foreground"];
  if (foregroundValue.isNull()) foregroundValue = card["style"]["foreground"];
  const uint16_t background =
      text_.color(backgroundValue, display_.color565(30, 34, 42));
  const uint16_t foreground = text_.color(foregroundValue, TFT_WHITE);

  const uint8_t payloadIndex = page.cardCount;
  SceneCard &sceneCard = page.cards[payloadIndex];
  sceneCard = SceneCard{};
  sceneCard.graph = compileGraph(card);
  sceneCard.background = background;
  const char *backgroundMode = card["backgroundMode"] | "";
  sceneCard.flags =
      (forceTransparent || strcmp(backgroundMode, "transparent") == 0 ||
       (card["transparentBackground"] | false))
          ? 1U
          : 0U;
  sceneCard.imageFit = parseImageFit(card["imageFit"] | "cover");
  const char *cardType = card["type"] | "";
  const char *image =
      strcmp(cardType, "image") == 0
          ? card["image"] | ""
          : strcmp(backgroundMode, "image") == 0 || backgroundMode[0] == '\0'
                ? card["backgroundImage"] | ""
                : "";
  strlcpy(sceneCard.image, image, sizeof(sceneCard.image));
  SceneNode cardNode;
  cardNode.id = 0x2000U + payloadIndex;
  cardNode.type = SceneNodeType::Card;
  cardNode.payloadIndex = payloadIndex;
  cardNode.sourceMask = sourceMask;
  const int16_t cardZ = 20 + payloadIndex * 3;
  cardNode.zIndex = cardZ;
  cardNode.bounds = {x, y, width, height};
  cardNode.clip = {0, 0, 240, 240};
  if (!page.graph.add(cardNode)) {
    failure_ = SceneCompileFailure::CardLimit;
    return false;
  }
  ++page.cardCount;
  if (strcmp(cardType, "image") == 0 || strcmp(cardType, "chart") == 0)
    return true;

  const char *title = card["title"];
  const char *progressType = card["progress"] | "none";
  const bool bar = strcmp(progressType, "bar") == 0;
  const bool ring = strcmp(progressType, "ring") == 0;
  CardTextLayout textLayout{y, height, y, height, false,
                            compactCardTitleFont()};
  int16_t valueX = x, valueWidth = width, titleX = x, titleWidth = width;
  if (page.freeLayout) {
    const FreeTextFrame valueBox = freeTextFrame(card, false);
    const FreeTextFrame titleBox = freeTextFrame(card, true);
    valueX = valueBox.x;
    valueWidth = valueBox.width;
    textLayout.valueY = valueBox.y;
    textLayout.valueHeight = valueBox.height;
    titleX = titleBox.x;
    titleWidth = titleBox.width;
    textLayout.titleY = titleBox.y;
    textLayout.titleHeight = titleBox.height;
    textLayout.hasTitle = title && title[0] && (card["showTitle"] | true);
    textLayout.titleFont = text_.selectFreeFont(
        String(title ? title : ""), card["titleStyle"], titleWidth,
        titleBox.height,
        text_.marquee(card["titleStyle"], true) ||
            strcmp(card["titleStyle"]["textFlow"] | "default", "overflow") ==
                0);
  } else {
    textLayout = text_.cardLayout(card, width, y, height);
  }
  JsonVariantConst valueStyle = card["valueStyle"];
  if (valueStyle.isNull()) valueStyle = card["style"];
  RingLayout ringGeometry{};
  if (strcmp(cardType, "weather") == 0) {
    if (!compileWeatherContent(
            card, valueX, textLayout.valueY, valueWidth,
            textLayout.valueHeight,
            [&](const char *name, bool create) {
              return values_.find(name, create);
            },
            [&](const String &line, int16_t left, int16_t top,
                int16_t lineWidth, int16_t lineHeight) {
              return text_.compilePositioned(
                  page, line, valueStyle, left, top, lineWidth, lineHeight,
                  foreground, background, "center", "middle", 0, nullptr,
                  false, page.freeLayout, sourceMask, cardZ + 1);
            },
            [&](uint8_t code, uint8_t size, int16_t centerX, int16_t centerY,
                bool colored) {
              RenderFont font;
              font.builtin = size == 96   ? &Weather96
                             : size == 48 ? &Weather48
                                          : &Weather24;
              const uint16_t iconColor =
                  !colored       ? foreground
                  : code == 11   ? TFT_YELLOW
                  : code == 0    ? TFT_LIGHTGREY
                  : code == 4 || code == 5 ? TFT_ORANGE
                                            : TFT_CYAN;
              return text_.compileText(
                  page, String(char('A' + code)), font, MC_DATUM, centerX,
                  centerY, iconColor, background, TextEffect{}, 1, 0, 48,
                  sourceMask, cardZ + 1);
            })) {
      if (failure_ == SceneCompileFailure::None)
        failure_ = SceneCompileFailure::Weather;
      return false;
    }
  } else if (ring) {
    ringGeometry = text_.ringLayout(valueX, textLayout.valueY, valueWidth,
                                    textLayout.valueHeight);
    if (!text_.compileCentered(
            page, cardValues_.value(card), valueStyle, valueX,
            ringGeometry.valueY, valueWidth, ringGeometry.valueHeight,
            foreground, background, page.freeLayout, sourceMask, cardZ + 1)) {
      if (failure_ == SceneCompileFailure::None)
        failure_ = SceneCompileFailure::Value;
      return false;
    }
  } else if (!text_.compilePositioned(
                 page, cardValues_.value(card), valueStyle, valueX,
                 textLayout.valueY, valueWidth, textLayout.valueHeight,
                 foreground, background, "center", "middle", 0, nullptr,
                 false, page.freeLayout, sourceMask, cardZ + 1,
                 page.freeLayout && strcmp(cardType, "text") == 0)) {
    if (failure_ == SceneCompileFailure::None)
      failure_ = SceneCompileFailure::Value;
    return false;
  }
  if (textLayout.hasTitle) {
    JsonVariantConst titleStyle = card["titleStyle"];
    if (titleStyle.isNull()) titleStyle = card["style"];
    const uint16_t titleForeground = text_.cardTitleColor(card, colorMapping);
    if (!text_.compilePositioned(
            page, String(title), titleStyle, titleX, textLayout.titleY,
            titleWidth, textLayout.titleHeight, titleForeground, background,
            "left", "top", textLayout.titleHeight, &textLayout.titleFont, true,
            page.freeLayout, sourceMask, cardZ + 1, true)) {
      if (failure_ == SceneCompileFailure::None)
        failure_ = SceneCompileFailure::Title;
      return false;
    }
  }

  if (bar || ring) {
    const float ratio = cardValues_.progressRatio(card, sourceValue);
    sceneCard.hasProgress = true;
    sceneCard.progressRing = ring;
    sceneCard.progressX = ring ? ringGeometry.x : x + 5;
    sceneCard.progressY = ring ? ringGeometry.y : y + height - 8;
    sceneCard.progressWidth = ring ? ringGeometry.diameter : width - 10;
    sceneCard.progressFill = static_cast<int16_t>(
        (ring ? 1000 : sceneCard.progressWidth) * ratio);
    sceneCard.progressBackground = TFT_DARKGREY;
    sceneCard.progressForeground =
        text_.color(card["style"]["accent"], TFT_CYAN);
    sceneCard.progressCenter = background;
  }
  return true;
}

uint8_t ScenePageCompiler::pageTitleFontSize(JsonVariantConst style) const {
  const char *size = style["fontSize"] | "small";
  if (strcmp(size, "medium") == 0) return 1;
  if (strcmp(size, "large") == 0) return 2;
  if (strcmp(size, "xlarge") == 0) return 3;
  return 0;
}

RenderFont ScenePageCompiler::pageTitleFont(JsonVariantConst style) const {
  return renderFontFor(style["fontFamily"] | "default",
                       pageTitleFontSize(style));
}

int16_t ScenePageCompiler::pageTitleThickness(JsonVariantConst style) {
  text_.applyFont(pageTitleFont(style));
  return min<int16_t>(64, display_.fontHeight() + 2);
}

RenderFont ScenePageCompiler::rowTitleFont(JsonVariantConst style) const {
  const char *family = style["fontFamily"] | "default";
  const bool builtInFamily = strcmp(family, "default") == 0 ||
                             strcmp(family, "sans") == 0 ||
                             strcmp(family, "sans-bold") == 0;
  if (builtInFamily) {
    const RenderFont compact = compactCardTitleFont();
    return {compact.builtin, -1, 0};
  }
  return renderFontFor(family, 0);
}

int16_t ScenePageCompiler::rowTitleHeight(JsonVariantConst style) {
  text_.applyFont(rowTitleFont(style));
  return display_.fontHeight();
}

ScenePageCompiler::PageContentLayout ScenePageCompiler::contentLayout(
    JsonObjectConst page) {
  PageContentLayout layout{6, 6, 234, 234, 0, "top", false};
  const char *title = page["title"];
  layout.hasTitle = (page["showTitle"] | true) && title && title[0];
  layout.titlePosition = page["titlePosition"] | "top";
  if (!layout.hasTitle) return layout;
  layout.titleThickness = pageTitleThickness(page["titleStyle"]);
  if (strcmp(layout.titlePosition, "bottom") == 0)
    layout.bottom -= layout.titleThickness;
  else if (strcmp(layout.titlePosition, "left") == 0)
    layout.x += layout.titleThickness;
  else if (strcmp(layout.titlePosition, "right") == 0)
    layout.right -= layout.titleThickness;
  else
    layout.y += layout.titleThickness;
  return layout;
}

bool ScenePageCompiler::compile(JsonObjectConst source, ScenePage &page) {
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::SceneCompile);
  failure_ = SceneCompileFailure::None;
  page.clear();
  page.background = text_.color(source["style"]["background"], TFT_BLACK);
  strlcpy(page.backgroundImage, source["backgroundImage"] | "",
          sizeof(page.backgroundImage));
  page.transparentCards = source["transparentCards"] | false;
  JsonArrayConst rows = source["rows"].as<JsonArrayConst>();
  page.freeLayout = strcmp(source["layout"] | "rows", "free") == 0;
  if (page.freeLayout) {
    for (JsonObjectConst row : rows) {
      for (JsonObjectConst card : row["cards"].as<JsonArrayConst>()) {
        JsonObjectConst frame = card["frame"];
        const int16_t x = lroundf((frame["x"] | 0.0F) * 2.4F);
        const int16_t y = lroundf((frame["y"] | 0.0F) * 2.4F);
        const int16_t width = min<int16_t>(
            240 - x, lroundf((frame["width"] | 50.0F) * 2.4F));
        const int16_t height = min<int16_t>(
            240 - y, lroundf((frame["height"] | 25.0F) * 2.4F));
        if (!compileCard(page, card, x, y, width, height,
                         page.transparentCards))
          return false;
      }
    }
    return true;
  }

  const PageContentLayout layout = contentLayout(source);
  const char *pageTitle = source["title"];
  JsonVariantConst titleStyle = source["titleStyle"];
  const uint16_t titleBackground =
      text_.color(titleStyle["background"], page.background);
  const uint16_t titleForeground =
      text_.color(titleStyle["foreground"], TFT_WHITE);
  if (layout.hasTitle) {
    SceneRect titleBounds;
    if (strcmp(layout.titlePosition, "bottom") == 0) {
      titleBounds = {0, static_cast<uint8_t>(240 - layout.titleThickness), 240,
                     static_cast<uint8_t>(layout.titleThickness)};
    } else if (strcmp(layout.titlePosition, "left") == 0) {
      titleBounds = {0, 0, static_cast<uint8_t>(layout.titleThickness), 240};
    } else if (strcmp(layout.titlePosition, "right") == 0) {
      titleBounds = {static_cast<uint8_t>(240 - layout.titleThickness), 0,
                     static_cast<uint8_t>(layout.titleThickness), 240};
    } else {
      titleBounds = {0, 0, 240, static_cast<uint8_t>(layout.titleThickness)};
    }
    if (page.fillCount >= kMaxSceneFills) {
      failure_ = SceneCompileFailure::Title;
      return false;
    }
    if (!page.fills.ensure(page.fillCount + 1)) {
      failure_ = SceneCompileFailure::Allocation;
      return false;
    }
    const uint8_t fillIndex = page.fillCount++;
    page.fills[fillIndex].color = titleBackground;
    SceneNode titleNode;
    titleNode.id = 0x1000U + fillIndex;
    titleNode.type = SceneNodeType::Fill;
    titleNode.payloadIndex = fillIndex;
    titleNode.zIndex = 10;
    titleNode.bounds = titleBounds;
    titleNode.clip = {0, 0, 240, 240};
    if (!page.graph.add(titleNode)) {
      failure_ = SceneCompileFailure::Title;
      return false;
    }
  }
  if (layout.hasTitle && strcmp(layout.titlePosition, "top") == 0) {
    if (!text_.compileText(page, String(pageTitle), pageTitleFont(titleStyle),
                           MC_DATUM, 120, layout.titleThickness / 2,
                           titleForeground, titleBackground)) {
      if (failure_ == SceneCompileFailure::None)
        failure_ = SceneCompileFailure::Title;
      return false;
    }
  } else if (layout.hasTitle &&
             strcmp(layout.titlePosition, "bottom") == 0) {
    if (!text_.compileText(page, String(pageTitle), pageTitleFont(titleStyle),
                           MC_DATUM, 120, 240 - layout.titleThickness / 2,
                           titleForeground, titleBackground)) {
      if (failure_ == SceneCompileFailure::None)
        failure_ = SceneCompileFailure::Title;
      return false;
    }
  }

  uint16_t totalWeight = 0;
  for (JsonObjectConst row : rows) totalWeight += row["weight"] | 1;
  if (totalWeight == 0 || rows.size() == 0) {
    failure_ = SceneCompileFailure::EmptyRows;
    return false;
  }
  constexpr int16_t gap = 4;
  const int16_t availableHeight =
      layout.bottom - layout.y - gap * (rows.size() - 1);
  int16_t rowY = layout.y;
  uint16_t consumedWeight = 0;
  for (size_t rowIndex = 0; rowIndex < rows.size(); ++rowIndex) {
    JsonObjectConst row = rows[rowIndex];
    const uint16_t weight = row["weight"] | 1;
    consumedWeight += weight;
    const int16_t nextY =
        rowIndex + 1 == rows.size()
            ? layout.bottom
            : layout.y + availableHeight * consumedWeight / totalWeight +
                  gap * rowIndex;
    int16_t rowHeight = nextY - rowY;
    const char *rowTitle = row["title"];
    const bool showTitle = row["showTitle"] | true;
    if (showTitle && rowTitle && rowTitle[0] && rowHeight >= 24) {
      JsonVariantConst rowTitleStyle = row["titleStyle"];
      if (rowTitleStyle.isNull()) rowTitleStyle = row["style"];
      const RenderFont rowFont = rowTitleFont(rowTitleStyle);
      const int16_t titleHeight = rowTitleHeight(rowTitleStyle);
      const uint16_t rowForeground =
          text_.color(rowTitleStyle["foreground"], TFT_LIGHTGREY);
      if (!text_.compileText(page, String(rowTitle), rowFont, TL_DATUM,
                             layout.x + 2, rowY, rowForeground,
                             page.background))
        return false;
      rowY += titleHeight;
      rowHeight -= titleHeight;
    }
    JsonArrayConst cards = row["cards"].as<JsonArrayConst>();
    if (cards.size() == 0) {
      failure_ = SceneCompileFailure::EmptyRow;
      return false;
    }
    const int16_t cardWidth =
        (layout.right - layout.x - gap * (cards.size() - 1)) / cards.size();
    int16_t cardX = layout.x;
    for (JsonObjectConst card : cards) {
      if (!compileCard(page, card, cardX, rowY, cardWidth, rowHeight,
                       page.transparentCards))
        return false;
      cardX += cardWidth + gap;
    }
    rowY = nextY + gap;
  }
  return true;
}
