#include <assert.h>
#include <stdint.h>

#include "DisplaySnapshotMover.h"

namespace {

constexpr uint16_t kWidth = 8;
constexpr uint16_t kHeight = 6;

class FakeDisplay {
 public:
  FakeDisplay() {
    for (uint16_t y = 0; y < kHeight; ++y) {
      for (uint16_t x = 0; x < kWidth; ++x) pixels[y][x] = y * 16 + x;
    }
  }

  void readRect(int16_t x, int16_t y, int16_t width, int16_t height,
                uint16_t *output) {
    for (int16_t row = 0; row < height; ++row) {
      for (int16_t column = 0; column < width; ++column) {
        *output++ = pixels[y + row][x + column];
      }
    }
  }

  void pushRect(int16_t x, int16_t y, int16_t width, int16_t height,
                uint16_t *input) {
    for (int16_t row = 0; row < height; ++row) {
      for (int16_t column = 0; column < width; ++column) {
        pixels[y + row][x + column] = *input++;
      }
    }
  }

  uint16_t pixels[kHeight][kWidth]{};
};

}  // namespace

int main() {
  DisplaySnapshotMover<kWidth, kHeight, 2> mover;
  uint16_t scratch[DisplaySnapshotMover<kWidth, kHeight, 2>::kScratchPixels];

  {
    FakeDisplay display;
    assert(mover.shift(display, PageTransitionDirection::Left, 3, scratch));
    for (uint16_t y = 0; y < kHeight; ++y) {
      for (uint16_t x = 0; x < kWidth - 3; ++x) {
        assert(display.pixels[y][x] == y * 16 + x + 3);
      }
    }
  }
  {
    FakeDisplay display;
    assert(mover.shift(display, PageTransitionDirection::Right, 3, scratch));
    for (uint16_t y = 0; y < kHeight; ++y) {
      for (uint16_t x = 3; x < kWidth; ++x) {
        assert(display.pixels[y][x] == y * 16 + x - 3);
      }
    }
  }
  {
    FakeDisplay display;
    assert(mover.shift(display, PageTransitionDirection::Up, 3, scratch));
    for (uint16_t y = 0; y < kHeight - 3; ++y) {
      for (uint16_t x = 0; x < kWidth; ++x) {
        assert(display.pixels[y][x] == (y + 3) * 16 + x);
      }
    }
  }
  {
    FakeDisplay display;
    assert(mover.shift(display, PageTransitionDirection::Down, 3, scratch));
    for (uint16_t y = 3; y < kHeight; ++y) {
      for (uint16_t x = 0; x < kWidth; ++x) {
        assert(display.pixels[y][x] == (y - 3) * 16 + x);
      }
    }
  }
  {
    FakeDisplay display;
    assert(mover.copy(display, 2, 1, 1, 2, 4, 3, scratch));
    for (uint16_t y = 0; y < 3; ++y) {
      for (uint16_t x = 0; x < 4; ++x) {
        assert(display.pixels[y + 2][x + 1] == (y + 1) * 16 + x + 2);
      }
    }
  }
}
