#pragma once

#include <stdint.h>

#include "SceneGraph.h"
#include "SceneRenderScheduler.h"
#include "SceneTileBuffer.h"

template <uint16_t DisplayWidth, uint8_t TileHeight,
          uint8_t MaximumRegions = 8>
class SceneCompositor {
 public:
  template <typename BackgroundPainter, typename NodePainter,
            typename TileFlusher>
  bool renderOneTile(const SceneGraph &scene,
                     SceneRenderScheduler<MaximumRegions> &scheduler,
                     BackgroundPainter paintBackground,
                     NodePainter paintNode, TileFlusher flush) {
    if (!scheduler.rendering() && !scheduler.beginFrame()) return false;
    SceneRect tile;
    if (!scheduler.nextTile(tile)) return false;
    if (!buffer_.begin(tile, 0)) return false;
    paintBackground(buffer_, tile);
    visitSceneNodes(scene, tile, [&](uint8_t index, const SceneNode &node) {
      paintNode(buffer_, tile, index, node);
    });
    flush(tile, buffer_.pixels(), buffer_.pixelCount());
    return true;
  }

 private:
  SceneTileBuffer<DisplayWidth, TileHeight> buffer_;
};
