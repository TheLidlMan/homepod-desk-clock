#include <cassert>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <algorithm>
#include <vector>

#include "ImageRle.h"

class Bytes {
 public:
  Bytes(const uint8_t *data, size_t size) : data_(data), size_(size) {}

  bool readByte(uint8_t &value) {
    if (offset_ == size_) return false;
    value = data_[offset_++];
    return true;
  }

  bool empty() const { return offset_ == size_; }
  bool skipBytes(size_t size) {
    if (size > size_ - offset_) return false;
    offset_ += size;
    return true;
  }

 private:
  const uint8_t *data_;
  size_t size_;
  size_t offset_ = 0;
};

int main() {
  const uint8_t encoded[] = {
      0x82, 0x00, 0xf8,
      0x01, 0xe0, 0x07, 0x1f, 0x00,
  };
  const uint16_t expected[] = {0xf800, 0xf800, 0xf800, 0x07e0, 0x001f};
  Bytes bytes(encoded, sizeof(encoded));
  Rgb565RleDecoder decoder;
  for (uint16_t expectedColor : expected) {
    uint16_t color = 0;
    assert(decoder.next(bytes, color));
    assert(color == expectedColor);
  }
  assert(decoder.packetComplete());
  assert(bytes.empty());

  const uint8_t truncated[] = {0x80, 0x00};
  Bytes broken(truncated, sizeof(truncated));
  Rgb565RleDecoder brokenDecoder;
  uint16_t ignored = 0;
  assert(!brokenDecoder.next(broken, ignored));
  for (uint16_t first = 0; first < 5; ++first) {
    for (uint16_t end = first + 1; end <= 5; ++end) {
      Bytes window(encoded, sizeof(encoded));
      uint16_t output[5] = {};
      assert(decodeRgb565Window(window, 5, first, end, output));
      assert(window.empty());
      for (uint16_t x = 0; x < 5; ++x)
        assert(output[x] == (x >= first && x < end ? expected[x] : 0));
    }
  }
  // Photo-like literal packets and flat repeated runs at every clipping edge.
  std::vector<uint8_t> row;
  uint16_t reference[240];
  for (uint16_t i = 0; i < 240; ++i) reference[i] = i < 128 ? i * 131 : 0x07e0;
  row.push_back(127);
  for (uint16_t i = 0; i < 128; ++i) {
    row.push_back(reference[i] & 255);
    row.push_back(reference[i] >> 8);
  }
  row.insert(row.end(), {static_cast<uint8_t>(128 + 111), 0xe0, 0x07});
  for (uint16_t first = 0; first < 240; ++first)
    for (uint16_t end = first + 1; end <= 240; ++end) {
      uint16_t result[240];
      std::fill_n(result, 240, 0x1234);
      Bytes input(row.data(), row.size());
      assert(decodeRgb565Window(input, 240, first, end, result));
      assert(input.empty());
      for (uint16_t x = 0; x < 240; ++x)
        assert(result[x] == (x >= first && x < end ? reference[x] : 0x1234));
    }
  for (size_t size = 0; size < row.size(); ++size) {
    uint16_t result[240]{};
    Bytes truncatedRow(row.data(), size);
    assert(!decodeRgb565Window(truncatedRow, 240, 10, 12, result));
  }
  puts("image rle: mixed packets and truncation safe");
}
