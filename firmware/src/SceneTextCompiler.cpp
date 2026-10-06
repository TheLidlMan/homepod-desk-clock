#include "SceneTextCompiler.h"

#include "DisplayFonts.h"
#include "FreeTextSizing.h"
#include "TextFlow.h"

uint16_t SceneTextCompiler::color(JsonVariantConst value,
                                  uint16_t fallback) const {
  if (!value.is<const char *>()) return fallback;
  const char *text = value.as<const char *>();
  if (text[0] == '#' && strlen(text) == 7) {
    const uint32_t rgb = strtoul(text + 1, nullptr, 16);
    return display_.color565((rgb >> 16) & 0xff, (rgb >> 8) & 0xff,
                             rgb & 0xff);
  }
  if (strcmp(text, "surface") == 0) return display_.color565(30, 34, 42);
  if (strcmp(text, "primary") == 0) return TFT_WHITE;
  if (strcmp(text, "secondary") == 0)
    return display_.color565(158, 158, 158);
  if (strcmp(text, "muted") == 0) return display_.color565(102, 102, 102);
  if (strcmp(text, "accent") == 0) return TFT_CYAN;
  if (strcmp(text, "success") == 0) return TFT_GREEN;
  if (strcmp(text, "warning") == 0) return TFT_ORANGE;
  if (strcmp(text, "error") == 0) return TFT_RED;
  if (strcmp(text, "background") == 0) return TFT_BLACK;
  return fallback;
}

uint16_t SceneTextCompiler::cardTitleColor(
    JsonObjectConst card, JsonObjectConst colorMapping) const {
  JsonVariantConst foreground = colorMapping["foreground"];
  if (!foreground.isNull()) return color(foreground, TFT_LIGHTGREY);
  JsonVariantConst style = card["titleStyle"];
  if (style.isNull()) style = card["style"];
  return color(style["foreground"], TFT_LIGHTGREY);
}

TextEffect SceneTextCompiler::textEffect(JsonVariantConst style) const {
  TextEffect result{};
  result.offsetX = 2;
  result.offsetY = 2;
  result.thickness = 1;
  const char *type = style["textEffect"] | "none";
  if (strcmp(type, "shadow") == 0) {
    result.type = TextEffectType::Shadow;
  } else if (strcmp(type, "outline") == 0) {
    result.type = TextEffectType::Outline;
  }
  result.color = color(style["effectColor"], TFT_BLACK);
  result.thickness = constrain(style["effectThickness"] | 1, 1, 3);
  result.offsetX = constrain(style["effectOffsetX"] | 2, -6, 6);
  result.offsetY = constrain(style["effectOffsetY"] | 2, -6, 6);
  return result;
}

void SceneTextCompiler::applyFont(const RenderFont &font) {
  applyRenderFont(display_, font, fontState_);
}

uint8_t SceneTextCompiler::requestedFontSize(JsonVariantConst style,
                                             int16_t height) const {
  const char *size = style["fontSize"] | "auto";
  if (strcmp(size, "small") == 0) return 0;
  if (strcmp(size, "medium") == 0) return 1;
  if (strcmp(size, "large") == 0) return 2;
  if (strcmp(size, "xlarge") == 0) return 3;
  if (height >= 58) return 3;
  if (height >= 42) return 2;
  if (height >= 28) return 1;
  return 0;
}

bool SceneTextCompiler::marquee(JsonVariantConst style,
                                bool fallback) const {
  return (style["marquee"] | fallback) &&
         strcmp(style["textFlow"] | "default", "default") == 0;
}

RenderFont SceneTextCompiler::selectBestFont(const String &text,
                                             JsonVariantConst style,
                                             int16_t width, int16_t height,
                                             bool scroll) {
  const char *family = style["fontFamily"] | "sans";
  int8_t size = requestedFontSize(style, height);
  if (strcmp(style["textFlow"] | "default", "default") != 0) {
    if (strcmp(style["fontSize"] | "auto", "auto") == 0)
      size = min<int8_t>(size, 1);
    const RenderFont font = renderFontFor(family, size);
    applyFont(font);
    return font;
  }
  while (size > 0) {
    const RenderFont font = renderFontFor(family, size);
    applyFont(font);
    if ((scroll || display_.textWidth(text) <= width - 6) &&
        display_.fontHeight() <= height) {
      return font;
    }
    --size;
  }
  const RenderFont font = renderFontFor(family, 0);
  applyFont(font);
  return font;
}

RenderFont SceneTextCompiler::selectCardTitleFont(
    const String &text, JsonVariantConst style, int16_t width, int16_t height,
    int8_t maximumAutoSize) {
  const char *size = style["fontSize"] | "auto";
  const char *family = style["fontFamily"] | "sans";
  const bool automatic = strcmp(size, "auto") == 0;
  if (!automatic) {
    if (strcmp(size, "small") == 0 && isBuiltInCardTitleFamily(family))
      return compactCardTitleFont();
    return renderFontFor(family, requestedFontSize(style, height));
  }
  if (strcmp(style["textFlow"] | "default", "default") != 0) {
    if (isBuiltInCardTitleFamily(family)) return compactCardTitleFont();
    return selectBestFont(text, style, width, height);
  }
  for (int8_t candidate = maximumAutoSize; candidate >= 0; --candidate) {
    const RenderFont font = renderFontFor(family, candidate);
    applyFont(font);
    if (display_.fontHeight() <= height &&
        (marquee(style, true) ||
         display_.textWidth(text) <= width - 6)) {
      return font;
    }
  }
  if (isBuiltInCardTitleFamily(family)) {
    const RenderFont font = compactCardTitleFont();
    applyFont(font);
    return font;
  }
  return selectBestFont(text, style, width, height);
}

CardTextLayout SceneTextCompiler::cardLayout(JsonObjectConst card,
                                             int16_t width, int16_t y,
                                             int16_t height) {
  const char *title = card["title"];
  const bool hasTitle = (card["showTitle"] | true) && title && title[0] &&
                        height >= 28;
  const bool bar = strcmp(card["progress"] | "none", "bar") == 0;
  const int16_t contentHeight =
      max<int16_t>(1, height - (bar && height >= 20 ? 9 : 0));
  CardTextLayout layout{y, contentHeight, y, contentHeight, hasTitle,
                        compactCardTitleFont()};
  if (!hasTitle) return layout;

  JsonVariantConst titleStyle = card["titleStyle"];
  if (titleStyle.isNull()) titleStyle = card["style"];
  JsonVariantConst valueStyle = card["valueStyle"];
  if (valueStyle.isNull()) valueStyle = card["style"];
  const int16_t provisionalValueHeight = max<int16_t>(1, contentHeight - 17);
  const RenderFont valueFont = selectBestFont(
      cardValues_.value(card), valueStyle, width, provisionalValueHeight);
  applyFont(valueFont);
  const int16_t valueFontHeight = display_.fontHeight();
  const int8_t maximumAutoTitleSize =
      valueFont.size >= 3 ? 1 : valueFont.size >= 1 ? 0 : -1;

  const char *vertical = titleStyle["verticalAlign"] | "top";
  if (strcmp(vertical, "top") != 0 && strcmp(vertical, "bottom") != 0) {
    layout.titleFont = selectCardTitleFont(
        String(title), titleStyle, width - 10, contentHeight,
        maximumAutoTitleSize);
    return layout;
  }

  const int16_t maximumTitleHeight =
      strcmp(titleStyle["fontSize"] | "auto", "auto") != 0
          ? contentHeight
          : max<int16_t>(1, min<int16_t>(contentHeight / 2,
                                        contentHeight - valueFontHeight));
  layout.titleFont = selectCardTitleFont(
      String(title), titleStyle, width - 10, maximumTitleHeight,
      maximumAutoTitleSize);
  applyFont(layout.titleFont);
  const int16_t titleBand =
      min<int16_t>(maximumTitleHeight, display_.fontHeight());
  const bool wrapped = strcmp(titleStyle["textFlow"] | "default", "wrap") == 0;
  const int16_t reserved = wrapped ? maximumTitleHeight : titleBand;
  layout.titleHeight = reserved;
  layout.valueHeight = max<int16_t>(1, contentHeight - reserved);
  if (strcmp(vertical, "top") == 0) {
    layout.valueY += reserved;
  } else {
    layout.titleY += contentHeight - reserved;
  }
  return layout;
}

RingLayout SceneTextCompiler::ringLayout(int16_t x, int16_t y, int16_t width,
                                         int16_t height) const {
  const int16_t valueHeight = min(
      static_cast<int16_t>(22),
      max(static_cast<int16_t>(12), static_cast<int16_t>(height / 4)));
  const int16_t available = max(
      static_cast<int16_t>(8),
      static_cast<int16_t>(height - valueHeight - 8));
  const int16_t diameter = min(static_cast<int16_t>(52),
      min(static_cast<int16_t>(width - 10), available));
  const int16_t groupHeight = diameter + 2 + valueHeight;
  const int16_t top = y + max(static_cast<int16_t>(3),
      static_cast<int16_t>((height - groupHeight) / 2));
  return {static_cast<int16_t>(x + (width - diameter) / 2), top, diameter,
          static_cast<int16_t>(top + diameter + 2), valueHeight};
}

bool SceneTextCompiler::compileText(
    ScenePage &page, const String &value, const RenderFont &font,
    uint8_t datum, int16_t x, int16_t y, uint16_t foreground,
    uint16_t background, const TextEffect &effect, uint8_t lineCount,
    int16_t blockWidth, uint16_t maxBytes, uint32_t sourceMask,
    int16_t zIndex) {
  if (page.textCount >= kMaxSceneTexts) {
    failure_ = SceneCompileFailure::TextLimit;
    return false;
  }
  const uint16_t valueBytes = min<size_t>(value.length(), maxBytes) + 1;
  if (page.textBytes + valueBytes > kMaxSceneTextBytes) {
    failure_ = SceneCompileFailure::TextPool;
    return false;
  }
  if (!page.texts.ensure(page.textCount + 1) ||
      !page.textPool.ensure(page.textBytes + valueBytes)) {
    failure_ = SceneCompileFailure::Allocation;
    return false;
  }
  const uint8_t payloadIndex = page.textCount;
  SceneText &text = page.texts[payloadIndex];
  text = SceneText{};
  text.x = x;
  text.y = y;
  applyFont(font);
  int16_t boundsWidth = display_.textWidth(value);
  int16_t boundsHeight = display_.fontHeight();
  text.lineCount = max<uint8_t>(1, lineCount);
  if (lineCount > 1) {
    boundsWidth = blockWidth;
    boundsHeight *= lineCount;
  }
  const bool centeredX = datum == TC_DATUM || datum == MC_DATUM ||
                         datum == BC_DATUM;
  const bool rightX = datum == TR_DATUM || datum == MR_DATUM ||
                      datum == BR_DATUM;
  const bool centeredY = datum == ML_DATUM || datum == MC_DATUM ||
                         datum == MR_DATUM;
  const bool bottomY = datum == BL_DATUM || datum == BC_DATUM ||
                       datum == BR_DATUM;
  int16_t boundsX = centeredX ? x - boundsWidth / 2
                              : rightX ? x - boundsWidth : x;
  int16_t boundsY = centeredY ? y - boundsHeight / 2
                              : bottomY ? y - boundsHeight : y;
  const int16_t effectExtent = textEffectExtent(effect);
  boundsX -= effectExtent;
  boundsY -= effectExtent;
  boundsWidth += effectExtent * 2;
  boundsHeight += effectExtent * 2;
  text.foreground = foreground;
  text.background = background;
  text.effect = effect;
  text.font = font.builtin;
  text.smoothFont = font.smooth;
  text.coverageFont = font.coverage;
  text.userFontSlot = font.userSlot;
  text.userFontSize = font.size;
  text.datum = datum;
  text.valueOffset = page.textBytes;
  strlcpy(page.textPool.data() + page.textBytes, value.c_str(), valueBytes);
  page.textBytes += valueBytes;
  SceneNode node;
  node.id = 0x4000U + payloadIndex;
  node.type = SceneNodeType::Text;
  node.payloadIndex = payloadIndex;
  node.sourceMask = sourceMask;
  node.zIndex = zIndex;
  node.bounds = {boundsX, boundsY, boundsWidth, boundsHeight};
  node.clip = {0, 0, 240, 240};
  if (!page.graph.add(node)) {
    failure_ = SceneCompileFailure::TextLimit;
    return false;
  }
  ++page.textCount;
  return true;
}

RenderFont SceneTextCompiler::selectFreeFont(const String &text,
                                             JsonVariantConst style,
                                             int16_t width, int16_t height,
                                             bool scroll) {
  const char *family = style["fontFamily"] | "default";
  const int8_t selected = freeTextSize(
      width, height, scroll,
      [&](int8_t size, int16_t &textWidth, int16_t &textHeight) {
        const RenderFont font = renderFontFor(family, size);
        applyFont(font);
        textWidth = display_.textWidth(text);
        textHeight = display_.fontHeight();
      });
  if (selected >= 0) return renderFontFor(family, selected);
  return isBuiltInCardTitleFamily(family) ? compactCardTitleFont()
                                         : renderFontFor(family, 0);
}

bool SceneTextCompiler::compilePositioned(
    ScenePage &page, String value, JsonVariantConst style, int16_t x,
    int16_t y, int16_t width, int16_t height, uint16_t foreground,
    uint16_t background, const char *defaultHorizontal,
    const char *defaultVertical, int16_t fontHeight,
    const RenderFont *selectedFont, bool tightVerticalEdges, bool freeFit,
    uint32_t sourceMask, int16_t zIndex, bool preserveText) {
  const char *horizontal = style["horizontalAlign"] | defaultHorizontal;
  const char *vertical = style["verticalAlign"] | defaultVertical;
  const bool left = strcmp(horizontal, "left") == 0;
  const bool right = strcmp(horizontal, "right") == 0;
  const bool top = strcmp(vertical, "top") == 0;
  const bool bottom = strcmp(vertical, "bottom") == 0;
  const uint8_t datum = top
                            ? (left ? TL_DATUM : right ? TR_DATUM : TC_DATUM)
                            : bottom
                                  ? (left ? BL_DATUM
                                          : right ? BR_DATUM : BC_DATUM)
                                  : (left ? ML_DATUM
                                          : right ? MR_DATUM : MC_DATUM);
  const int16_t availableHeight =
      fontHeight > 0 ? min(height, fontHeight) : height;
  const bool scroll = marquee(style, preserveText);
  const RenderFont font =
      selectedFont != nullptr
          ? *selectedFont
          : freeFit
                ? selectFreeFont(
                      value, style, width, availableHeight,
                      scroll || strcmp(style["textFlow"] | "default",
                                       "overflow") == 0)
                : selectBestFont(value, style, width, availableHeight, scroll);
  applyFont(font);
  const char *flow = style["textFlow"] | "default";
  const bool wrap = strcmp(flow, "wrap") == 0;
  const bool overflow = strcmp(flow, "overflow") == 0;
  WrappedText wrapped;
  if (wrap) {
    wrapped = wrapDisplayText(
        value.c_str(), max<int16_t>(1, width - 8),
        max<int16_t>(1, min<int16_t>(
                            6, height / max<int16_t>(1, display_.fontHeight()))),
        [&](const char *line) { return display_.textWidth(line); });
    value = wrapped.text;
  }
  while (!scroll && !wrap && !overflow && value.length() > 1 &&
         display_.textWidth(value) > width - 8) {
    value.remove(value.length() - 1);
  }
  const int16_t textX =
      left ? x + 4 : right ? x + width - 4 : x + width / 2;
  const int16_t textY = top ? y + (tightVerticalEdges ? 0 : 3)
                        : bottom
                            ? y + height - (tightVerticalEdges ? 1 : 3)
                            : y + height / 2;
  if (!compileText(page, value, font, datum, textX, textY, foreground,
                   background, textEffect(style), wrapped.lines, wrapped.width,
                   scroll ? value.length() : wrap || overflow ? 144 : 48,
                   sourceMask, zIndex)) {
    return false;
  }
  if (overflow) return true;

  const uint16_t textNodeId = 0x4000U + page.textCount - 1;
  const int16_t textNodeIndex = page.graph.findById(textNodeId);
  if (textNodeIndex < 0) {
    failure_ = SceneCompileFailure::TextLimit;
    return false;
  }
  SceneNode &node = page.graph.node(textNodeIndex);
  node.clip = {int16_t(x + 4), y, max<int16_t>(1, width - 8), height};
  node.bounds = node.clip;
  SceneText &text = page.texts[node.payloadIndex];
  if (scroll && display_.textWidth(value) > width - 8) {
    text.marqueeIntervalMs =
        constrain(style["marqueeIntervalMs"] | 100, 50, 10000);
    text.marqueeStepPixels =
        constrain(style["marqueeStepPixels"] | 1, 1, 16);
    if (strcmp(style["marqueeEffect"] | "bounce", "loop") == 0)
      text.marqueeRepeat = display_.textWidth(value) + 24;
    text.x = x + 4;
    text.datum = top ? TL_DATUM : bottom ? BL_DATUM : ML_DATUM;
  }
  return true;
}

bool SceneTextCompiler::compileCentered(
    ScenePage &page, String value, JsonVariantConst style, int16_t x,
    int16_t y, int16_t width, int16_t height, uint16_t foreground,
    uint16_t background, bool freeFit, uint32_t sourceMask, int16_t zIndex) {
  return compilePositioned(page, value, style, x, y, width, height, foreground,
                           background, "center", "middle", 0, nullptr, false,
                           freeFit, sourceMask, zIndex);
}
