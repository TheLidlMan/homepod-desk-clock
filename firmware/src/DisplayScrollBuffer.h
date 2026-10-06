#pragma once

#include <Arduino.h>

#include "DisplayCompat.h"
#include "PageTransitionTypes.h"

// ST7789 owns 320 GRAM rows while this panel exposes 240 of them. Keep the
// remaining 80 rows as a rolling staging area. Incoming rows are painted while
// hidden, then VSCSAD moves the complete visible image without copying it.
class DisplayScrollBuffer {
 public:
  static constexpr uint16_t kWidth = 240;
  static constexpr uint16_t kVisibleHeight = 240;
  static constexpr uint16_t kGramHeight =
#if defined(ESP8266)
      320;
#else
      240;
#endif

  explicit DisplayScrollBuffer(MiniDisplay &display) : display_(display) {}

  void begin() {
    if (configured_) return;
#if defined(ESP8266)
    display_.startWrite();
    display_.writecommand(ST7789_VSCRDEF);
    write16(0);
    write16(kGramHeight);
    write16(0);
    display_.endWrite();
    configured_ = true;
    setOffset(offset_);
#else
    configured_ = true;
#endif
  }

  uint16_t offset() const { return offset_; }

  void setOffset(uint16_t value) {
    offset_ = value % kGramHeight;
#if defined(ESP8266)
    display_.startWrite();
    display_.writecommand(ST7789_VSCRSADD);
    write16(offset_);
    display_.endWrite();
#endif
  }

  uint16_t movedOffset(PageTransitionDirection direction,
                       uint16_t distance) const {
    distance %= kGramHeight;
    if (direction == PageTransitionDirection::Up) {
      return (offset_ + distance) % kGramHeight;
    }
    return (offset_ + kGramHeight - distance) % kGramHeight;
  }

  // Write a normal visible-space tile into its current rolling GRAM address.
  void pushLogical(int16_t x, int16_t y, int16_t width, int16_t height,
                   uint16_t *pixels) {
    if (!pixels || width <= 0 || height <= 0) return;
#if defined(ESP8266)
    pushPhysical(x, (offset_ + y) % kGramHeight, width, height, pixels);
#else
    display_.pushImage(x, y, width, height, pixels);
#endif
  }

  // Write directly into hidden/physical GRAM. A tile may cross row 319.
  void pushPhysical(int16_t x, uint16_t y, int16_t width, int16_t height,
                    uint16_t *pixels) {
#if defined(ESP8266)
    if (!pixels || width <= 0 || height <= 0 || x < 0 ||
        x + width > kWidth) return;
    const bool swapped = display_.getSwapBytes();
    display_.setSwapBytes(false);
    // TFT_eSPI::setAddrWindow() normally closes its transaction, while
    // pushPixels() assumes one is still active. Keep address selection and the
    // pixel payload atomic: the no-CS SD PRO panel otherwise sees occasional
    // incomplete bands and its physical scroll position diverges from offset_.
    display_.startWrite();
    int16_t row = 0;
    while (row < height) {
      const uint16_t physicalY = (y + row) % kGramHeight;
      const int16_t rows = min<int16_t>(height - row,
          kGramHeight - physicalY);
      display_.setAddrWindow(x, physicalY, width, rows);
      display_.pushPixels(pixels + static_cast<size_t>(row) * width,
                          static_cast<uint32_t>(width) * rows);
      row += rows;
    }
    display_.endWrite();
    display_.setSwapBytes(swapped);
#else
    display_.pushImage(x, y, width, height, pixels);
#endif
  }

 private:
  void write16(uint16_t value) {
#if defined(ESP8266)
    display_.writedata(value >> 8);
    display_.writedata(value & 0xff);
#else
    (void)value;
#endif
  }

  MiniDisplay &display_;
  uint16_t offset_ = 0;
  bool configured_ = false;
};
