#include <array>
#include <cassert>
#include "ImageRowResampler.h"

int main() {
  uint32_t random = 73451;
  for (unsigned test = 0; test < 30000; ++test) {
    const auto next = [&]() { random = random * 1664525U + 1013904223U; return random; };
    const uint16_t sourceWidth = 1 + next() % 240;
    const uint16_t sourceX = next() % sourceWidth;
    const uint16_t sampledWidth = 1 + next() % (sourceWidth - sourceX);
    const uint16_t destinationWidth = 1 + next() % 240;
    const uint16_t firstColumn = next() % destinationWidth;
    const uint16_t outputWidth = 1 + next() % (destinationWidth - firstColumn);
    std::array<uint16_t, 240> original;
    for (auto &pixel : original) pixel = next();
    for (bool swap : {false, true}) {
      auto row = original;
      assert(resampleImageRow(row.data(), row.size(), sourceWidth, sourceX,
                               sampledWidth, destinationWidth, firstColumn,
                               outputWidth, swap));
      for (uint16_t x = 0; x < outputWidth; ++x) {
        uint16_t expected = original[sourceX + uint32_t(firstColumn + x) *
                                                  sampledWidth / destinationWidth];
        if (swap) expected = (expected << 8) | (expected >> 8);
        assert(row[x] == expected);
      }
    }
  }
}
