#pragma once

#include "ScenePageRenderer.h"
#include "DisplayScrollBuffer.h"
#include "RuntimeProfiler.h"
#include "TransitionPlan.h"
#include "TransitionPixelTransfer.h"

#if defined(ESP8266)
constexpr int16_t kMinimumTransitionBandHeight = 2;
constexpr uint32_t kTransitionHeapReserve = 11000;

// All effects traverse the same bounded bands with the same frozen progress.
// A band is scratch space, not a separate animation with its own timeline.
class SceneRegionPainter {
 public:
  SceneRegionPainter(MiniDisplay &display, DisplayScrollBuffer &scroll)
      : display_(display), scroll_(scroll), tile_(&display) {}
  ~SceneRegionPainter() {
    if (tile_.fontLoaded) tile_.unloadFont();
    tile_.deleteSprite();
  }

  bool begin(bool motion) {
    tile_.setColorDepth(16);
    tile_.setTextWrap(false, false);
    constexpr int16_t fullQualityHeights[] = {12, 10, 8};
    constexpr int16_t motionHeights[] = {18, 16, 14, 12, 10, 8};
    const int16_t *heights = motion ? motionHeights : fullQualityHeights;
    const size_t count = motion
        ? sizeof(motionHeights) / sizeof(motionHeights[0])
        : sizeof(fullQualityHeights) / sizeof(fullQualityHeights[0]);
    const uint32_t reserve = motion ? 6000U : kTransitionHeapReserve;
    for (size_t index = 0; index < count; ++index) {
      const int16_t height = heights[index];
      const uint32_t bytes = 240U * height * 2U + 32U;
      if (ESP.getFreeHeap() < bytes + reserve ||
          ESP.getMaxFreeBlockSize() < bytes + 256U) {
        continue;
      }
      if (tile_.createSprite(240, height) != nullptr) {
        bandHeight_ = height;
        return true;
      }
    }
    // Fragmented heaps may not have one 2880-byte block even though enough
    // total memory remains. Smaller bands keep the hardware-scroll path alive;
    // they cost more paint calls, but never require a software animation.
    constexpr int16_t fallbackHeights[] = {
        6, 4, kMinimumTransitionBandHeight};
    for (const int16_t height : fallbackHeights) {
      const uint32_t bytes = 240U * height * 2U + 32U;
      if (ESP.getFreeHeap() < bytes + 8192U ||
          ESP.getMaxFreeBlockSize() < bytes + 256U) {
        continue;
      }
      if (tile_.createSprite(240, height) != nullptr) {
        bandHeight_ = height;
        return true;
      }
    }
    return false;
  }

  void paintTransition(const ScenePage &currentPage, const ScenePage &nextPage,
                       TransitionPlan &plan, uint8_t previous,
                       uint8_t step, uint8_t count, int16_t offsetX,
                       int16_t offsetY, ImageAssetRenderCache &images,
                       bool draftText = false) {
    plan.prepare(previous, step, count);
    const ScenePaintQuality quality =
        draftText ? ScenePaintQuality::Motion : ScenePaintQuality::Full;
    for (int16_t row = 0; row < 240; row += bandHeight_) {
      plan.changes([&](const SceneTransitionSlice &slice) {
        const int16_t top = max<int16_t>(row, slice.bounds.y);
        const int16_t bottom = min<int16_t>(
            row + bandHeight_, slice.bounds.bottom());
        if (top >= bottom) return;
        const auto &page = slice.next ? nextPage : currentPage;
        const int16_t column = slice.bounds.x;
        const int16_t width = slice.bounds.width;
        const int16_t height = bottom - top;
        tile_.resetViewport();
        tile_.setViewport(0, 0, width, height, false);
        tile_.fillRect(0, 0, width, height, page.background);
        paintScenePage(tile_, page, slice.offsetX + offsetX - column,
                        slice.offsetY + offsetY - top, 0, 0, width, height,
                        font_, &images, quality);
        tile_.resetViewport();
        transfer(column, top, width, height);
      });
    }
  }

  void paintNextRowsPhysical(const ScenePage &page, int16_t sourceY,
                             int16_t height, uint16_t physicalY,
                             int16_t offsetX, int16_t offsetY,
                             ImageAssetRenderCache &images) {
    if (sourceY < 0 || height <= 0 || sourceY + height > 240) return;
    for (int16_t row = 0; row < height; row += bandHeight_) {
      const int16_t rows = min<int16_t>(bandHeight_, height - row);
      tile_.resetViewport();
      tile_.setViewport(0, 0, 240, rows, false);
      tile_.fillRect(0, 0, 240, rows, page.background);
      paintScenePage(tile_, page, offsetX,
                     offsetY - sourceY - row, 0, 0, 240, rows,
                     font_, &images, ScenePaintQuality::Full);
      tile_.resetViewport();
      transferPhysical(0, (physicalY + row) % 320, 240, rows);
    }
  }

 private:
  void transfer(int16_t x, int16_t y, int16_t width, int16_t height) {
    MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::SpiTransfer);
    auto *pixels = static_cast<uint16_t *>(tile_.getPointer());
    if (!packTransitionPixels(
            pixels, 240 * bandHeight_, 240, width, height)) return;
    scroll_.pushLogical(x, y, width, height, pixels);
  }

  void transferPhysical(int16_t x, uint16_t y, int16_t width,
                        int16_t height) {
    MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::SpiTransfer);
    auto *pixels = static_cast<uint16_t *>(tile_.getPointer());
    if (!packTransitionPixels(
            pixels, 240 * bandHeight_, 240, width, height)) return;
    scroll_.pushPhysical(x, y, width, height, pixels);
  }

  MiniDisplay &display_;
  DisplayScrollBuffer &scroll_;
  TFT_eSprite tile_;
  FontRenderState font_;
  int16_t bandHeight_ = kMinimumTransitionBandHeight;
};
#endif
