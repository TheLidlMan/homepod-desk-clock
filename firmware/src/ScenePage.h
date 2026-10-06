#pragma once

#include <Arduino.h>

#include <memory>
#include <new>

#include "DisplayCompat.h"
#include "GraphPainter.h"
#include "ImageAssets.h"
#include "SceneGraph.h"
#include "TextEffect.h"

struct SceneCard {
  GraphPaintConfig graph{};
  uint16_t background = 0;
  uint16_t progressBackground = 0;
  uint16_t progressForeground = 0;
  uint16_t progressCenter = 0;
  uint16_t progressFill = 0;
  uint8_t flags = 0;
  uint8_t progressX = 0;
  uint8_t progressY = 0;
  uint8_t progressWidth = 0;
  uint16_t imageFrame = 0;
  ImageFit imageFit = ImageFit::Cover;
  bool hasProgress = false;
  bool progressRing = false;
  char image[kImageAssetIdLength + 1]{};
};

struct SceneText {
  const GFXfont *font = nullptr;
  const uint8_t *smoothFont = nullptr;
  const CoverageFont *coverageFont = nullptr;
  uint16_t foreground = 0;
  uint16_t background = 0;
  uint16_t valueOffset = 0;
  int16_t marqueeOffset = 0;
  uint16_t marqueeIntervalMs = 0;
  int16_t marqueeRepeat = 0;
  uint8_t marqueeStepPixels = 1;
  TextEffect effect{};
  uint8_t x = 0;
  uint8_t y = 0;
  int8_t userFontSlot = -1;
  uint8_t userFontSize = 0;
  uint8_t datum = 0;
  uint8_t lineCount = 1;
};

struct SceneFill {
  uint16_t color = 0;
  uint8_t radius = 0;
};

constexpr uint8_t kMaxSceneCards = 18;
constexpr uint8_t kMaxSceneTexts = 43;
constexpr uint8_t kMaxSceneFills = 2;
constexpr uint16_t kMaxSceneTextBytes = 1024;

template <typename Value, size_t Maximum, size_t Initial = 4>
class SceneBuffer {
 public:
  bool ensure(size_t required) {
    if (required <= capacity_) return true;
    if (required > Maximum) return false;
    size_t capacity = capacity_ == 0 ? min(Maximum, Initial) : capacity_;
    while (capacity < required) {
      capacity = capacity > Maximum / 2 ? Maximum : capacity * 2;
    }
    std::unique_ptr<Value[]> next(new (std::nothrow) Value[capacity]{});
    if (!next) return false;
    for (size_t index = 0; index < capacity_; ++index) {
      next[index] = values_[index];
    }
    values_.swap(next);
    capacity_ = capacity;
    return true;
  }

  Value &operator[](size_t index) { return values_[index]; }
  const Value &operator[](size_t index) const { return values_[index]; }
  Value *data() { return values_.get(); }
  const Value *data() const { return values_.get(); }
  size_t allocatedBytes() const { return capacity_ * sizeof(Value); }

 private:
  std::unique_ptr<Value[]> values_;
  size_t capacity_ = 0;
};

struct ScenePage {
  SceneGraph graph;
  uint16_t background = 0;
  uint16_t backgroundImageFrame = 0;
  char backgroundImage[kImageAssetIdLength + 1]{};
  bool freeLayout = false;
  bool transparentCards = false;
  uint8_t cardCount = 0;
  uint8_t textCount = 0;
  uint8_t fillCount = 0;
  uint16_t textBytes = 0;
  SceneBuffer<SceneCard, kMaxSceneCards> cards;
  SceneBuffer<SceneText, kMaxSceneTexts, 8> texts;
  SceneBuffer<SceneFill, kMaxSceneFills, 1> fills;
  SceneBuffer<char, kMaxSceneTextBytes, 128> textPool;

  void clear() {
    graph.clear();
    background = 0;
    backgroundImageFrame = 0;
    backgroundImage[0] = '\0';
    freeLayout = false;
    transparentCards = false;
    cardCount = 0;
    textCount = 0;
    fillCount = 0;
    textBytes = 0;
  }

  size_t allocatedBytes() const {
    return sizeof(ScenePage) + graph.allocatedBytes() + cards.allocatedBytes() +
           texts.allocatedBytes() + fills.allocatedBytes() +
           textPool.allocatedBytes();
  }
};

static_assert(sizeof(ScenePage) <= 128,
              "A retained scene header must remain small");
