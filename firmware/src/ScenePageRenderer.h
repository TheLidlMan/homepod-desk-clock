#pragma once

#include <cstring>

#include "ProgressRenderer.h"
#include "ScenePage.h"
#include "UserFonts.h"

enum class ScenePaintQuality : uint8_t { Full, Motion };

inline bool sceneBoundsIntersect(const SceneRect &bounds, int16_t offsetX,
                                 int16_t offsetY, int16_t clipX,
                                 int16_t clipY, int16_t clipWidth,
                                 int16_t clipHeight) {
  const int16_t x = bounds.x + offsetX;
  const int16_t y = bounds.y + offsetY;
  return x < clipX + clipWidth && x + bounds.width > clipX &&
         y < clipY + clipHeight && y + bounds.height > clipY;
}

template <typename Canvas>
void paintSceneText(Canvas &canvas, const ScenePage &page,
                    const SceneNode &node, int16_t offsetX, int16_t offsetY,
                    FontRenderState &fontState, ScenePaintQuality quality) {
  const SceneText &text = page.texts[node.payloadIndex];
  const bool fullQuality = quality == ScenePaintQuality::Full;
  const TextEffect effect = fullQuality ? text.effect : TextEffect{};
  StaticSmoothFont direct{};
#if defined(ESP8266)
  if (fullQuality) direct = indexedSmoothFont(text.smoothFont);
#endif
  fontState.smoothAllowed = fullQuality;
  if (!direct.data) applyRenderFont(
      canvas,
      RenderFont{text.font, text.userFontSlot, text.userFontSize,
                 text.smoothFont,
                 fullQuality ? text.coverageFont : nullptr},
      fontState);
  canvas.setTextDatum(text.datum);
  if (text.lineCount <= 1) {
    const auto drawCopy = [&](int16_t x) {
#if defined(ESP8266)
    drawTextWithEffect(canvas, page.textPool.data() + text.valueOffset,
                       x, text.y + offsetY, text.foreground,
                       text.background, effect,
                       fullQuality ? text.coverageFont : nullptr,
                       &direct);
#else
    drawTextWithEffect(canvas,
                       String(page.textPool.data() + text.valueOffset),
                       x, text.y + offsetY, text.foreground,
                       text.background, effect,
                       fullQuality ? text.coverageFont : nullptr);
#endif
    };
    const int16_t x = text.x + offsetX - text.marqueeOffset;
    drawCopy(x);
    if (text.marqueeRepeat > 0 && x + text.marqueeRepeat < node.clip.right() + offsetX)
      drawCopy(x + text.marqueeRepeat);
    return;
  }

  const int16_t lineHeight = direct.data ? direct.lineHeight : canvas.fontHeight();
  const int16_t shift = (text.lineCount - 1) * lineHeight;
  const bool middle = text.datum == ML_DATUM || text.datum == MC_DATUM ||
                      text.datum == MR_DATUM;
  const bool bottom = text.datum == BL_DATUM || text.datum == BC_DATUM ||
                      text.datum == BR_DATUM;
  int16_t y = text.y + offsetY - (middle ? shift / 2 : bottom ? shift : 0);
  const char *cursor = page.textPool.data() + text.valueOffset;
  char line[145];
  for (uint8_t index = 0; index < text.lineCount; ++index) {
    const char *end = strchr(cursor, '\n');
    const size_t length = min<size_t>(
        end ? static_cast<size_t>(end - cursor) : strlen(cursor),
        sizeof(line) - 1);
    memcpy(line, cursor, length);
    line[length] = '\0';
#if defined(ESP8266)
    drawTextWithEffect(canvas, line, text.x + offsetX, y, text.foreground,
                       text.background, effect,
                       fullQuality ? text.coverageFont : nullptr,
                       &direct);
#else
    drawTextWithEffect(canvas, String(line), text.x + offsetX, y,
                       text.foreground, text.background, effect,
                       fullQuality ? text.coverageFont : nullptr);
#endif
    if (!end) break;
    cursor = end + 1;
    y += lineHeight;
  }
}

template <typename Canvas>
void paintSceneProgress(Canvas &canvas, const SceneCard &card,
                        int16_t offsetX, int16_t offsetY);

template <typename Canvas>
void paintSceneCard(Canvas &canvas, const ScenePage &page,
                    const SceneNode &node, int16_t offsetX, int16_t offsetY,
                    int16_t clipX, int16_t clipY, int16_t clipWidth,
                    int16_t clipHeight, ImageAssetRenderCache *imageCache) {
  const SceneCard &card = page.cards[node.payloadIndex];
  const int16_t x = node.bounds.x + offsetX;
  const int16_t y = node.bounds.y + offsetY;
  if ((card.flags & 1U) == 0) {
    canvas.fillRoundRect(x, y, node.bounds.width, node.bounds.height, 5,
                         card.background);
  }
  drawImageAsset(canvas, card.image, x, y, node.bounds.width,
                 node.bounds.height, card.imageFit, clipX, clipY, clipWidth,
                 clipHeight, imageCache, card.imageFrame);
  paintGraph(
      canvas, card.graph, x + 2, y + 2, node.bounds.width - 4,
      node.bounds.height - 4, clipX, clipY, clipWidth, clipHeight,
      [&](int16_t px, int16_t py) {
        return coverageBackground(
            canvas, px, py,
            (card.flags & 1U) ? page.background : card.background);
      });
  paintSceneProgress(canvas, card, offsetX, offsetY);
}

template <typename Canvas>
void paintSceneProgress(Canvas &canvas, const SceneCard &card,
                        int16_t offsetX, int16_t offsetY) {
  if (!card.hasProgress) return;
  const int16_t x = card.progressX + offsetX;
  const int16_t y = card.progressY + offsetY;
  if (card.progressRing) {
    drawProgressRing(canvas, x, y, card.progressWidth,
                     card.progressFill / 1000.0F, card.progressBackground,
                     card.progressForeground, card.progressCenter);
    return;
  }
  canvas.fillRoundRect(x, y, card.progressWidth, 4, 2,
                       card.progressBackground);
  if (card.progressFill > 0) {
    canvas.fillRoundRect(x, y, card.progressFill, 4, 2,
                         card.progressForeground);
  }
}

template <typename Canvas>
void paintScenePage(Canvas &canvas, const ScenePage &page, int16_t offsetX,
                    int16_t offsetY, int16_t clipX, int16_t clipY,
                    int16_t clipWidth, int16_t clipHeight,
                    FontRenderState &fontState,
                    ImageAssetRenderCache *imageCache = nullptr,
                    ScenePaintQuality quality = ScenePaintQuality::Full) {
  canvas.fillRect(offsetX, offsetY, 240, 240, page.background);
  drawImageAsset(canvas, page.backgroundImage, offsetX, offsetY, 240, 240,
                 ImageFit::Cover, clipX, clipY, clipWidth, clipHeight,
                 imageCache, page.backgroundImageFrame);

  for (uint8_t index = 0; index < page.graph.size(); ++index) {
    const SceneNode &node = page.graph.node(index);
    if (!node.visible || node.opacity == 0 ||
        !sceneBoundsIntersect(node.bounds, offsetX, offsetY, clipX, clipY,
                              clipWidth, clipHeight)) {
      continue;
    }
    if (node.type == SceneNodeType::Fill) {
      const SceneFill &fill = page.fills[node.payloadIndex];
      if (fill.radius == 0) {
        canvas.fillRect(node.bounds.x + offsetX, node.bounds.y + offsetY,
                        node.bounds.width, node.bounds.height, fill.color);
      } else {
        canvas.fillRoundRect(node.bounds.x + offsetX,
                             node.bounds.y + offsetY, node.bounds.width,
                             node.bounds.height, fill.radius, fill.color);
      }
    } else if (node.type == SceneNodeType::Card) {
      paintSceneCard(canvas, page, node, offsetX, offsetY, clipX, clipY,
                     clipWidth, clipHeight, imageCache);
    } else if (node.type == SceneNodeType::Text) {
#if defined(ESP8266)
      // Marquee's clip belongs to the scene, not to a second direct renderer.
      const int16_t left = max<int16_t>(clipX, node.clip.x + offsetX);
      const int16_t top = max<int16_t>(clipY, node.clip.y + offsetY);
      const int16_t right = min<int16_t>(clipX + clipWidth, node.clip.right() + offsetX);
      const int16_t bottom = min<int16_t>(clipY + clipHeight, node.clip.bottom() + offsetY);
      if (right <= left || bottom <= top) continue;
      canvas.setViewport(left, top, right - left, bottom - top, false);
#endif
      paintSceneText(canvas, page, node, offsetX, offsetY, fontState, quality);
#if defined(ESP8266)
      canvas.setViewport(clipX, clipY, clipWidth, clipHeight, false);
#endif
    }
  }
}
