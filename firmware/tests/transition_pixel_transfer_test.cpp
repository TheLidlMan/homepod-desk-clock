#include <assert.h>
#include <stdint.h>
#include <array>

#include "TransitionPixelTransfer.h"

int main() {
  // Real transfer helper, including overlapping copies, narrow curtain strips
  // and partial edge tiles. Canaries protect both ends of the fixed buffer.
  std::array<uint16_t, 962> memory{};
  for (size_t stride : {4U, 8U, 30U, 240U}) {
    for (size_t width = 1; width <= stride; ++width) {
      for (size_t height = 1; height <= 960 / stride; ++height) {
        memory.front() = 0x1234;
        memory.back() = 0xabcd;
        for (size_t i = 0; i < 960; ++i) memory[i + 1] = i ^ 0x5a5a;
        assert(packTransitionPixels(memory.data() + 1, 960, stride, width, height));
        for (size_t y = 0; y < height; ++y)
          for (size_t x = 0; x < width; ++x)
            assert(memory[1 + y * width + x] == ((y * stride + x) ^ 0x5a5a));
        assert(memory.front() == 0x1234 && memory.back() == 0xabcd);
      }
    }
  }
  const auto unchanged = memory;
  assert(!packTransitionPixels(nullptr, 960, 4, 4, 240));
  assert(!packTransitionPixels(memory.data(), 960, 0, 1, 1));
  assert(!packTransitionPixels(memory.data(), 960, 4, 0, 1));
  assert(!packTransitionPixels(memory.data(), 960, 4, 4, 0));
  assert(!packTransitionPixels(memory.data(), 960, 4, 5, 1));
  assert(!packTransitionPixels(memory.data(), 960, 4, 4, 241));
  assert(!packTransitionPixels(memory.data(), 960, SIZE_MAX, SIZE_MAX, SIZE_MAX));
  assert(memory == unchanged);
}
