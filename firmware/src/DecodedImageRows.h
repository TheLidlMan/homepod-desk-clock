#pragma once

#include <stdint.h>
#include <string.h>

// Four unmodified source rows shared by adjacent crops within a render band.
// Resampling and byte swapping happen only in the caller's scratch buffer.
class DecodedImageRows {
 public:
  bool copy(const char *id, uint16_t frame, uint16_t row, uint16_t width,
            uint16_t *out) const {
    for (const auto &entry : entries_) {
      if (entry.valid && entry.frame == frame && entry.row == row &&
          entry.width == width &&
          strcmp(entry.id, id) == 0) {
        memcpy(out, entry.pixels, width * sizeof(uint16_t));
        return true;
      }
    }
    return false;
  }

  void store(const char *id, uint16_t frame, uint16_t row, uint16_t width,
             const uint16_t *pixels) {
    if (strlen(id) != 16 || !width || width > 240) return;
    auto &entry = entries_[next_];
    next_ = (next_ + 1) % 4;
    memcpy(entry.id, id, 17);
    entry.frame = frame;
    entry.row = row;
    entry.width = width;
    memcpy(entry.pixels, pixels, width * sizeof(uint16_t));
    entry.valid = true;
  }

 private:
  struct Entry {
    char id[17]{};
    uint16_t frame = 0;
    uint16_t row = 0;
    uint16_t width = 0;
    bool valid = false;
    uint16_t pixels[240];
  };
  Entry entries_[4];
  uint8_t next_ = 0;
};
