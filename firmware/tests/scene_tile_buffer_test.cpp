#include <assert.h>
#include <stdint.h>

#include "SceneGraph.h"
#include "SceneTileBuffer.h"

int main() {
  SceneTileBuffer<8, 4> tile;
  assert(tile.begin({10, 20, 8, 4}, 0x0000));
  assert(tile.pixelCount() == 32);
  assert(!tile.begin({0, 0, 9, 4}, 0));
  assert(tile.begin({10, 20, 8, 4}, 0x0000));

  tile.fill({8, 18, 5, 5}, 0xf800);
  assert(tile.pixel(10, 20) == 0xf800);
  assert(tile.pixel(12, 22) == 0xf800);
  assert(tile.pixel(13, 22) == 0x0000);

  tile.fill({10, 20, 1, 1}, 0x001f, 128);
  const uint16_t mixed = tile.pixel(10, 20);
  assert(((mixed >> 11) & 0x1f) >= 15);
  assert((mixed & 0x1f) >= 15);

  tile.line(10, 23, 17, 23, 0x07e0);
  for (int16_t x = 10; x <= 17; ++x) assert(tile.pixel(x, 23) == 0x07e0);

  SceneGraph scene;
  SceneNode behind;
  behind.bounds = {10, 20, 8, 4};
  behind.clip = behind.bounds;
  behind.zIndex = 0;
  behind.payloadIndex = 1;
  assert(scene.add(behind));
  SceneNode front = behind;
  front.bounds = {12, 21, 2, 2};
  front.clip = front.bounds;
  front.zIndex = 1;
  front.payloadIndex = 2;
  assert(scene.add(front));

  assert(tile.begin({10, 20, 8, 4}, 0));
  visitSceneNodes(scene, tile.bounds(), [&](uint8_t, const SceneNode &node) {
    tile.fill(node.bounds, node.payloadIndex == 1 ? 0xf800 : 0x001f,
              node.opacity);
  });
  assert(tile.pixel(11, 21) == 0xf800);
  assert(tile.pixel(12, 21) == 0x001f);
}
