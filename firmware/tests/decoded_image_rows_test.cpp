#include <array>
#include <cassert>
#include "DecodedImageRows.h"

int main() {
  DecodedImageRows cache;
  std::array<uint16_t, 240> source{}, output{};
  constexpr auto a = "0123456789abcdef";
  constexpr auto b = "fedcba9876543210";
  assert(!cache.copy(a, 0, 0, 240, output.data()));
  for (int y = 0; y < 4; ++y) {
    for (int x = 0; x < 240; ++x) source[x] = y * 240 + x;
    cache.store(a, 0, y, 240, source.data());
  }
  // Both sides of a curtain reuse the same raw rows, not previously cropped
  // or byte-swapped output. Modifying a result cannot corrupt the cache.
  for (int repeat = 0; repeat < 3; ++repeat) {
    for (int y = 0; y < 4; ++y) {
      assert(cache.copy(a, 0, y, 240, output.data()));
      for (int x = 0; x < 240; ++x) assert(output[x] == y * 240 + x);
      output.fill(0xffff);
    }
  }
  assert(!cache.copy(b, 0, 0, 240, output.data()));
  assert(!cache.copy(a, 0, 0, 120, output.data()));
  source.fill(0x1234);
  cache.store(b, 0, 0, 240, source.data());
  assert(!cache.copy(a, 0, 0, 240, output.data()));
  assert(cache.copy(b, 0, 0, 240, output.data()));
  assert(output == source);
  for (int i = 0; i < 1000; ++i)
    cache.store(a, 0, i % 240, 240, source.data());
  assert(cache.copy(a, 0, 999 % 240, 240, output.data()));
  cache.store(a, 7, 42, 240, source.data());
  assert(cache.copy(a, 7, 42, 240, output.data()));
  assert(!cache.copy(a, 6, 42, 240, output.data()));
  static_assert(sizeof(DecodedImageRows) <= 2048);
}
