#include <cassert>
#include <cstdint>
#include <vector>
#include "SpriteBand.h"
#include "SceneRenderScheduler.h"
#include "TransitionPixelTransfer.h"

struct Sprite {
  size_t limit;
  std::vector<uint16_t> pixels;
  std::vector<uint8_t> attempts;
  void deleteSprite() { std::vector<uint16_t>().swap(pixels); }
  void *createSprite(uint16_t width, uint8_t height) {
    attempts.push_back(height);
    if (size_t(width) * height * 2 + 2 > limit) return nullptr;
    pixels.resize(size_t(width) * height);
    return pixels.data();
  }
};

int main() {
  assert(sceneSpriteBudget(4096, 8192) == 0);
  assert(sceneSpriteBudget(10000, 6320) == 5904);
  assert(sceneSpriteBudget(20000, 6320) == 6320);
  Sprite racing{1000, {}, {}};
  assert(createSpriteBand(racing, 240, 8, 10000) == 2);
  assert((racing.attempts == std::vector<uint8_t>{8, 4, 2}));
  Sprite exhausted{0, {}, {}};
  assert(createSpriteBand(exhausted, 240, 8, 10000) == 0);
  assert(exhausted.pixels.empty());
  assert(createSpriteBand(exhausted, 0, 8, 10000) == 0);
  assert(createSpriteBand(exhausted, 240, 0, 10000) == 0);

  for (uint8_t expected : {8, 4, 2, 1}) {
    Sprite sprite{size_t(240) * expected * 2 + 2, {}, {}};
    const auto rows = createSpriteBand(sprite, 240, 8, sprite.limit + 32);
    assert(rows == expected);
    SceneRenderScheduler<> scheduler(240, 240, 8);
    scheduler.setTileHeight(rows);
    const SceneRect region{13, 5, 17, 19};
    scheduler.invalidate(region);
    std::vector<unsigned> visits(240 * 240);
    std::vector<uint16_t> output(240 * 240);
    assert(scheduler.beginFrame());
    SceneRect tile;
    while (scheduler.nextTile(tile)) {
      assert(tile.height > 0 && tile.height <= rows);
      for (int y = 0; y < tile.height; ++y)
        for (int x = 0; x < tile.width; ++x)
          sprite.pixels[y * 240 + x] = uint16_t((tile.y + y) * 240 + tile.x + x);
      assert(packTransitionPixels(sprite.pixels.data(), sprite.pixels.size(),
                                  240, tile.width, tile.height));
      for (int y = 0; y < tile.height; ++y)
        for (int x = 0; x < tile.width; ++x) {
          const auto index = (tile.y + y) * 240 + tile.x + x;
          output[index] = sprite.pixels[y * tile.width + x];
          ++visits[index];
        }
    }
    for (int y = 0; y < 240; ++y)
      for (int x = 0; x < 240; ++x) {
        const bool inside = x >= region.x && x < region.right() &&
                            y >= region.y && y < region.bottom();
        assert(visits[y * 240 + x] == unsigned(inside));
        if (inside) assert(output[y * 240 + x] == uint16_t(y * 240 + x));
      }
    assert(!scheduler.pending() && !scheduler.rendering());
    // Reusing a sprite must not report 8 rows for an old smaller allocation.
    sprite.limit = 480 * 8 + 2;
    assert(createSpriteBand(sprite, 240, 8, 10000) == 8);
    assert(sprite.pixels.size() == 240 * 8);
  }
}
