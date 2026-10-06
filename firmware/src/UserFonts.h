#pragma once

#include <Arduino.h>
#include <LittleFS.h>

#include "DisplayCompat.h"
#include "CoverageFont.h"

constexpr uint8_t kUserFontSlots = 2;
constexpr uint8_t kUserFontSizes = 4;
constexpr uint16_t kMaxUserFontGlyphs = 384;
constexpr uint32_t kMaxUserFontFileBytes = 180000;
constexpr uint32_t kMaxUserFontPackBytes = 540000;

struct UserFontSlotInfo {
  bool installed = false;
  char name[33]{};
  uint16_t glyphCount = 0;
  uint32_t bytes = 0;
};

struct RenderFont {
  const GFXfont *builtin = nullptr;
  int8_t userSlot = -1;
  uint8_t size = 0;
  const uint8_t *smooth = nullptr;
  const CoverageFont *coverage = nullptr;
};

struct FontRenderState {
  int8_t userSlot = -1;
  int8_t size = -1;
  const uint8_t *smooth = nullptr;
  bool smoothAllowed = true;
  const CoverageFont *coverage = nullptr;
};

class UserFontStore {
 public:
  void begin(bool filesystemReady);
  const UserFontSlotInfo &slot(uint8_t index) const;
  int8_t activeSlot() const { return activeSlot_; }
  bool setActiveSlot(int8_t slot);
  bool remove(uint8_t slot);

  bool beginUpload(uint8_t slot, uint8_t size);
  bool writeUpload(const uint8_t *data, size_t length);
  bool finishUpload();
  void abortUpload();
  bool uploadSucceeded() const { return uploadSucceeded_; }
  bool finalize(uint8_t slot, const char *name, uint16_t glyphCount,
                uint32_t expectedBytes);

  bool available(uint8_t slot, uint8_t size) const;
  const char *fontBaseName(uint8_t slot, uint8_t size) const;

 private:
  bool load();
  bool save();
  bool validateVlw(const char *path, uint16_t *glyphCount,
                   uint32_t *bytes, uint8_t *version = nullptr) const;
  bool validatePack(uint8_t slot, bool compact, uint8_t expectedVersion,
                    uint16_t *glyphCount, uint32_t *bytes) const;
  bool migrateLegacyCompactPack(uint8_t slot);

  bool filesystemReady_ = false;
  int8_t activeSlot_ = -1;
  UserFontSlotInfo slots_[kUserFontSlots]{};
  bool compactSlots_[kUserFontSlots]{};
  File uploadFile_;
  uint8_t uploadSlot_ = 0;
  uint8_t uploadSize_ = 0;
  uint32_t uploadBytes_ = 0;
  bool uploadFailed_ = false;
  bool uploadSucceeded_ = false;
};

extern UserFontStore userFonts;

#if defined(ESP8266)
inline bool smoothFontFits(uint32_t glyphs) {
  // TFT_eSPI allocates seven glyph tables (12 bytes/glyph) without checking
  // malloc results. Keep room for allocator overhead, glyph reads and TCP.
  if (glyphs == 0 || glyphs > kMaxUserFontGlyphs) return false;
  return ESP.getFreeHeap() > glyphs * 12U + 512U + 2048U &&
         ESP.getMaxFreeBlockSize() > glyphs * 4U + 512U;
}
#endif

template <typename Canvas>
void applyRenderFont(Canvas &canvas, const RenderFont &font,
                     FontRenderState &state) {
  state.coverage = font.coverage;
#if defined(ESP8266)
  if (state.smoothAllowed && font.userSlot >= 0 &&
      userFonts.available(font.userSlot, font.size)) {
    if (state.userSlot != font.userSlot || state.size != font.size ||
        state.smooth != nullptr) {
      if (canvas.fontLoaded) canvas.unloadFont();
      if (smoothFontFits(userFonts.slot(font.userSlot).glyphCount)) {
        canvas.loadFont(userFonts.fontBaseName(font.userSlot, font.size),
                        LittleFS);
      }
      if (canvas.fontLoaded) {
        state.userSlot = font.userSlot;
        state.size = font.size;
        state.smooth = nullptr;
        return;
      }
    } else if (canvas.fontLoaded) {
      return;
    }
  }
  if (state.smoothAllowed && font.smooth != nullptr) {
    if (state.smooth != font.smooth || state.userSlot >= 0) {
      if (canvas.fontLoaded) canvas.unloadFont();
      const uint32_t glyphs = (uint32_t(pgm_read_byte(font.smooth)) << 24) |
          (uint32_t(pgm_read_byte(font.smooth + 1)) << 16) |
          (uint32_t(pgm_read_byte(font.smooth + 2)) << 8) |
          pgm_read_byte(font.smooth + 3);
      if (smoothFontFits(glyphs)) canvas.loadFont(font.smooth);
      if (canvas.fontLoaded) {
        state.userSlot = -1;
        state.size = font.size;
        state.smooth = font.smooth;
        return;
      }
    } else if (canvas.fontLoaded) {
      return;
    }
  }
  if (canvas.fontLoaded) canvas.unloadFont();
#endif
  state.userSlot = -1;
  state.size = -1;
  state.smooth = nullptr;
  canvas.setFreeFont(font.builtin);
}
