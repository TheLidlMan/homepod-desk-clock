#pragma once

#include "ScenePageRenderer.h"
#include "SpriteBand.h"

#if defined(ESP8266)
// Eight rows halve visible top-to-bottom tearing for animated images while
// keeping compositor allocation below 4 KB on ESP8266.
constexpr int16_t kSceneUpdateBandHeight = 8;

// Own bulky drawing state on the heap, not on the 4 KB loop stack.
struct SceneUpdatePainter {
  explicit SceneUpdatePainter(MiniDisplay &display) : band(&display) {}
  ~SceneUpdatePainter() {
    if (band.fontLoaded) band.unloadFont();
    band.deleteSprite();
  }

  bool begin() {
    band.setColorDepth(16);
    band.setTextWrap(false, false);
    height = createSpriteBand(band, 240, kSceneUpdateBandHeight,
        sceneSpriteBudget(ESP.getFreeHeap(), ESP.getMaxFreeBlockSize()));
    return height != 0;
  }

  uint8_t height = 0;
  TFT_eSprite band;
  FontRenderState font;
  ImageAssetRenderCache images;
};
#endif
