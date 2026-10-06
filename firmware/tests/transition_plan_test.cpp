#include <array>
#include <cassert>
#include <cstdint>

#include "TransitionPlan.h"

using Raster = std::array<uint32_t, 240 * 240>;
uint32_t pixel(bool next, int x, int y) {
  assert(x >= 0 && x < 240 && y >= 0 && y < 240);
  return (next ? 0x10000U : 0U) | static_cast<uint32_t>(y * 240 + x);
}
void initial(Raster &raster) {
  for (int y = 0; y < 240; ++y)
    for (int x = 0; x < 240; ++x) raster[y * 240 + x] = pixel(false, x, y);
}
void apply(Raster &raster, TransitionPlan &plan, uint8_t previous, uint8_t step) {
  // Same band-first traversal as the firmware, but record source pixels on
  // the host instead of using LCD SPI. Changed rectangles may never overlap.
  std::array<uint8_t, 240 * 240> owners{};
  plan.prepare(previous, step, 12);
  for (int row = 0; row < 240; row += 4) {
    plan.changes([&](const SceneTransitionSlice &slice) {
      const auto &r = slice.bounds;
      assert(r.x >= 0 && r.y >= 0 && r.right() <= 240 && r.bottom() <= 240);
      for (int y = row; y < row + 4; ++y) {
        if (y < r.y || y >= r.bottom()) continue;
        for (int x = r.x; x < r.right(); ++x) {
          assert(++owners[y * 240 + x] == 1);
          raster[y * 240 + x] = pixel(slice.next, x - slice.offsetX, y - slice.offsetY);
        }
      }
    });
  }
}
int main() {
  Raster sequential, skipped;
  for (int type = 0; type <= static_cast<int>(PageTransitionType::Spiral); ++type) {
    for (int direction = 0; direction < 4; ++direction) {
      for (int tiles = 0; tiles < 3; ++tiles) {
        PageTransitionConfig config{};
        config.type = static_cast<PageTransitionType>(type);
        config.direction = static_cast<PageTransitionDirection>(direction);
        config.tileSize = static_cast<PageTransitionTileSize>(tiles);
        TransitionPlan plan(config, 93851);
        initial(sequential);
        initial(skipped);
        uint8_t last = 0;
        for (uint8_t step = 1; step <= 12; ++step) {
          apply(sequential, plan, step - 1, step);
          if (step == 1 || step == 5 || step == 12) {
            apply(skipped, plan, last, step);
            assert(skipped == sequential);
            last = step;
          }
        }
        for (int y = 0; y < 240; ++y)
          for (int x = 0; x < 240; ++x)
            assert(sequential[y * 240 + x] == pixel(true, x, y));
      }
    }
  }
}
