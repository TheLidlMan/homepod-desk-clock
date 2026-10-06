#pragma once

#if defined(ESP8266)

#include <TFT_eSPI.h>
#if defined(HARDWARE_PROFILE_SDPRO) && defined(TFT_SDA_READ)
#error "SD PRO has no CS: SDA reads must remain disabled"
#endif
using MiniDisplay = TFT_eSPI;

#else

#include <Arduino_GFX_Library.h>
#include <Fonts/FreeMono12pt7b.h>
#include <Fonts/FreeMono18pt7b.h>
#include <Fonts/FreeMono24pt7b.h>
#include <Fonts/FreeMono9pt7b.h>
#include <Fonts/FreeSans12pt7b.h>
#include <Fonts/FreeSans18pt7b.h>
#include <Fonts/FreeSans24pt7b.h>
#include <Fonts/FreeSans9pt7b.h>
#include <Fonts/FreeSansBold12pt7b.h>
#include <Fonts/FreeSansBold18pt7b.h>
#include <Fonts/FreeSansBold24pt7b.h>
#include <Fonts/FreeSansBold9pt7b.h>
#include <Fonts/FreeSerif12pt7b.h>
#include <Fonts/FreeSerif18pt7b.h>
#include <Fonts/FreeSerif24pt7b.h>
#include <Fonts/FreeSerif9pt7b.h>
#include <SPI.h>

constexpr uint16_t TFT_BLACK = 0x0000;
constexpr uint16_t TFT_WHITE = 0xFFFF;
constexpr uint16_t TFT_RED = 0xF800;
constexpr uint16_t TFT_GREEN = 0x07E0;
constexpr uint16_t TFT_BLUE = 0x001F;
constexpr uint16_t TFT_CYAN = 0x07FF;
constexpr uint16_t TFT_YELLOW = 0xFFE0;
constexpr uint16_t TFT_ORANGE = 0xFD20;
constexpr uint16_t TFT_DARKGREY = 0x7BEF;
constexpr uint16_t TFT_LIGHTGREY = 0xC618;

enum TextDatum : uint8_t {
  TL_DATUM,
  TC_DATUM,
  TR_DATUM,
  ML_DATUM,
  MC_DATUM,
  MR_DATUM,
  BL_DATUM,
  BC_DATUM,
  BR_DATUM,
};

class MiniDisplay {
 public:
  int16_t width() const { return gfx_ ? gfx_->width() : TFT_WIDTH; }
  int16_t height() const { return gfx_ ? gfx_->height() : TFT_HEIGHT; }
  uint8_t getTextDatum() const { return datum_; }
  void drawPixel(int16_t x, int16_t y, uint16_t color) { gfx_->drawPixel(x, y, color); }
  void init() {
    bus_ = new Arduino_HWSPI(TFT_DC, TFT_CS, TFT_SCLK, TFT_MOSI,
                             GFX_NOT_DEFINED, &SPI);
    gfx_ = new Arduino_ST7789(bus_, TFT_RST, 0, true, TFT_WIDTH, TFT_HEIGHT,
                              0, 0, 0, 80);
    gfx_->begin(SPI_FREQUENCY);
    gfx_->setTextWrap(false);
  }

  void setRotation(uint8_t rotation) { gfx_->setRotation(rotation); }
  void fillScreen(uint16_t color) { gfx_->fillScreen(color); }
  void fillRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) {
    gfx_->fillRect(x, y, w, h, color);
  }
  void fillRoundRect(int16_t x, int16_t y, int16_t w, int16_t h,
                     int16_t radius, uint16_t color) {
    gfx_->fillRoundRect(x, y, w, h, radius, color);
  }
  void fillCircle(int16_t x, int16_t y, int16_t radius, uint16_t color) {
    gfx_->fillCircle(x, y, radius, color);
  }
  void drawCircle(int16_t x, int16_t y, int16_t radius, uint16_t color) {
    gfx_->drawCircle(x, y, radius, color);
  }
  void drawRect(int16_t x, int16_t y, int16_t w, int16_t h, uint16_t color) {
    gfx_->drawRect(x, y, w, h, color);
  }
  void drawRoundRect(int16_t x, int16_t y, int16_t w, int16_t h, int16_t r, uint16_t color) {
    gfx_->drawRoundRect(x, y, w, h, r, color);
  }
  void drawLine(int16_t x, int16_t y, int16_t x2, int16_t y2, uint16_t color) {
    gfx_->drawLine(x, y, x2, y2, color);
  }
  void drawFastHLine(int16_t x, int16_t y, int16_t w, uint16_t color) {
    gfx_->drawFastHLine(x, y, w, color);
  }
  void drawTriangle(int16_t x, int16_t y, int16_t x2, int16_t y2, int16_t x3, int16_t y3, uint16_t color) {
    gfx_->drawTriangle(x, y, x2, y2, x3, y3, color);
  }
  void fillTriangle(int16_t x, int16_t y, int16_t x2, int16_t y2, int16_t x3, int16_t y3, uint16_t color) {
    gfx_->fillTriangle(x, y, x2, y2, x3, y3, color);
  }
  void startWrite() {}
  void endWrite() {}
  void pushImage(int16_t x, int16_t y, int16_t width, int16_t height,
                 uint16_t *pixels) {
    gfx_->draw16bitRGBBitmap(x, y, pixels, width, height);
  }
  uint16_t color565(uint8_t red, uint8_t green, uint8_t blue) {
    return gfx_->color565(red, green, blue);
  }
  void setTextDatum(TextDatum datum) { datum_ = datum; }
  void setTextColor(uint16_t foreground, uint16_t background) {
    foreground_ = foreground;
    background_ = background;
    gfx_->setTextColor(foreground, background);
  }
  void setTextColor(uint16_t foreground) {
    foreground_ = foreground;
    gfx_->setTextColor(foreground);
  }
  void setFreeFont(const GFXfont *font) {
    font_ = font;
    textSize_ = 1;
    gfx_->setTextSize(1);
    gfx_->setFont(font);
  }
  int16_t textWidth(const String &text) const {
    int16_t x, y;
    uint16_t width, height;
    gfx_->getTextBounds(text, 0, 0, &x, &y, &width, &height);
    return width;
  }
  int16_t fontHeight() const { return font_ ? font_->yAdvance : 8 * textSize_; }
  int16_t drawString(const String &text, int16_t x, int16_t y,
                     uint8_t builtinFont = 0) {
    if (builtinFont) {
      font_ = nullptr;
      textSize_ = builtinFont >= 4 ? 3 : 2;
      gfx_->setFont(nullptr);
      gfx_->setTextSize(textSize_);
    }
    int16_t x1, y1;
    uint16_t width, height;
    gfx_->getTextBounds(text, 0, 0, &x1, &y1, &width, &height);
    int16_t left = x;
    int16_t top = y;
    if (datum_ == TC_DATUM || datum_ == MC_DATUM || datum_ == BC_DATUM) {
      left -= width / 2;
    } else if (datum_ == TR_DATUM || datum_ == MR_DATUM || datum_ == BR_DATUM) {
      left -= width;
    }
    if (datum_ == ML_DATUM || datum_ == MC_DATUM || datum_ == MR_DATUM) {
      top -= height / 2;
    } else if (datum_ == BL_DATUM || datum_ == BC_DATUM || datum_ == BR_DATUM) {
      top -= height;
    }
    gfx_->setCursor(left - x1, top - y1);
    gfx_->print(text);
    return width;
  }

 private:
  Arduino_DataBus *bus_ = nullptr;
  Arduino_GFX *gfx_ = nullptr;
  const GFXfont *font_ = nullptr;
  TextDatum datum_ = TL_DATUM;
  uint8_t textSize_ = 1;
  uint16_t foreground_ = TFT_WHITE;
  uint16_t background_ = TFT_BLACK;
};

#endif
