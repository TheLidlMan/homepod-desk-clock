#pragma once

#include <cstdint>

// Decode only the source columns used by the visible tile. Packet boundaries
// and the full row length are still checked, even for skipped pixels.
template <typename Reader>
bool decodeRgb565Window(Reader &reader, uint16_t width, uint16_t first,
                        uint16_t end, uint16_t *pixels) {
  if (!pixels || first >= end || end > width) return false;
  uint16_t position = 0;
  while (position < width) {
    uint8_t control;
    if (!reader.readByte(control)) return false;
    const uint16_t count = (control & 127U) + 1U;
    if (count > width - position) return false;
    const uint16_t stop = position + count;
    const uint16_t left = first > position ? first : position;
    const uint16_t right = end < stop ? end : stop;
    if (control & 128U) {
      uint8_t low, high;
      if (!reader.readByte(low) || !reader.readByte(high)) return false;
      const uint16_t color = low | (static_cast<uint16_t>(high) << 8);
      for (uint16_t x = left; x < right; ++x) pixels[x] = color;
    } else if (left >= right) {
      if (!reader.skipBytes(count * 2U)) return false;
    } else {
      if (!reader.skipBytes((left - position) * 2U)) return false;
      for (uint16_t x = left; x < right; ++x) {
        uint8_t low, high;
        if (!reader.readByte(low) || !reader.readByte(high)) return false;
        pixels[x] = low | (static_cast<uint16_t>(high) << 8);
      }
      if (!reader.skipBytes((stop - right) * 2U)) return false;
    }
    position = stop;
  }
  return true;
}

class Rgb565RleDecoder {
 public:
  template <typename Reader>
  bool next(Reader &reader, uint16_t &color) {
    if (remaining_ == 0) {
      uint8_t control = 0;
      if (!reader.readByte(control)) return false;
      repeat_ = (control & 0x80) != 0;
      remaining_ = (control & 0x7f) + 1;
      if (repeat_ && !readColor(reader, repeatedColor_)) return false;
    }
    if (repeat_) {
      color = repeatedColor_;
    } else if (!readColor(reader, color)) {
      return false;
    }
    --remaining_;
    return true;
  }

  bool packetComplete() const { return remaining_ == 0; }

 private:
  template <typename Reader>
  static bool readColor(Reader &reader, uint16_t &color) {
    uint8_t low = 0;
    uint8_t high = 0;
    if (!reader.readByte(low) || !reader.readByte(high)) return false;
    color = low | (static_cast<uint16_t>(high) << 8);
    return true;
  }

  uint8_t remaining_ = 0;
  bool repeat_ = false;
  uint16_t repeatedColor_ = 0;
};
