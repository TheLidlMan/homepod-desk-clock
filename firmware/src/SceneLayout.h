#pragma once

#include <math.h>
#include <stdint.h>

#include "SceneGraph.h"

struct SceneRowInput {
  uint16_t weight = 1;
  uint8_t cardCount = 0;
  uint8_t titleHeight = 0;
};

struct SceneRowGeometry {
  SceneRect bounds;
  SceneRect content;
  int16_t cardWidth = 0;
  uint8_t cardCount = 0;
};

template <uint8_t MaximumRows>
bool calculateSceneRows(const SceneRect &content, const SceneRowInput *inputs,
                        uint8_t count, uint8_t gap,
                        SceneRowGeometry (&rows)[MaximumRows]) {
  if (count == 0 || count > MaximumRows || content.empty()) return false;
  uint16_t totalWeight = 0;
  for (uint8_t index = 0; index < count; ++index) {
    if (inputs[index].cardCount == 0) return false;
    totalWeight += inputs[index].weight == 0 ? 1 : inputs[index].weight;
  }
  if (totalWeight == 0) return false;

  const int16_t availableHeight =
      content.height - static_cast<int16_t>(gap) * (count - 1);
  if (availableHeight < count) return false;

  int16_t rowY = content.y;
  uint16_t consumedWeight = 0;
  for (uint8_t index = 0; index < count; ++index) {
    const uint16_t weight = inputs[index].weight == 0 ? 1
                                                       : inputs[index].weight;
    consumedWeight += weight;
    const int16_t nextY =
        index + 1 == count
            ? content.bottom()
            : content.y + availableHeight * consumedWeight / totalWeight +
                  static_cast<int16_t>(gap) * index;
    const int16_t rowHeight = nextY - rowY;
    const int16_t titleHeight =
        inputs[index].titleHeight < rowHeight ? inputs[index].titleHeight : 0;
    const int16_t cardsGap =
        static_cast<int16_t>(gap) * (inputs[index].cardCount - 1);
    const int16_t cardWidth =
        (content.width - cardsGap) / inputs[index].cardCount;
    if (cardWidth <= 0 || rowHeight - titleHeight <= 0) return false;
    rows[index].bounds = {content.x, rowY, content.width, rowHeight};
    rows[index].content = {content.x,
                           static_cast<int16_t>(rowY + titleHeight),
                           content.width,
                           static_cast<int16_t>(rowHeight - titleHeight)};
    rows[index].cardWidth = cardWidth;
    rows[index].cardCount = inputs[index].cardCount;
    rowY = nextY + gap;
  }
  return true;
}

inline SceneRect sceneRowCard(const SceneRowGeometry &row, uint8_t index,
                              uint8_t gap) {
  if (index >= row.cardCount) return {};
  return {static_cast<int16_t>(row.content.x +
                               index * (row.cardWidth + gap)),
          row.content.y, row.cardWidth, row.content.height};
}

inline SceneRect calculateFreeFrame(float xPercent, float yPercent,
                                    float widthPercent, float heightPercent,
                                    int16_t displayWidth,
                                    int16_t displayHeight) {
  const int16_t x = lroundf(xPercent * displayWidth / 100.0F);
  const int16_t y = lroundf(yPercent * displayHeight / 100.0F);
  const int16_t width = lroundf(widthPercent * displayWidth / 100.0F);
  const int16_t height = lroundf(heightPercent * displayHeight / 100.0F);
  return clipSceneRect({x, y, width, height}, displayWidth, displayHeight);
}
