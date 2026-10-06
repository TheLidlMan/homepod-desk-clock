#include <assert.h>

#include "SceneRenderScheduler.h"

int main() {
  SceneRenderScheduler<> scheduler(240, 240, 8);
  assert(!scheduler.beginFrame());

  scheduler.invalidate({10, 20, 30, 12});
  assert(scheduler.pending());
  assert(scheduler.beginFrame());
  assert(scheduler.rendering());
  assert(!scheduler.pending());

  SceneRect tile;
  assert(scheduler.nextTile(tile));
  assert(tile.x == 10 && tile.y == 20 && tile.width == 30 && tile.height == 8);

  // Changes arriving while SPI is flushing belong to the next frame.
  scheduler.invalidate({100, 110, 20, 10});
  assert(scheduler.pending());
  assert(!scheduler.beginFrame());

  assert(scheduler.nextTile(tile));
  assert(tile.x == 10 && tile.y == 28 && tile.width == 30 && tile.height == 4);
  assert(!scheduler.nextTile(tile));

  assert(!scheduler.rendering());
  assert(scheduler.pending());

  assert(scheduler.beginFrame());
  assert(scheduler.nextTile(tile));
  assert(tile.x == 100 && tile.y == 110 && tile.width == 20 &&
         tile.height == 8);
  assert(scheduler.nextTile(tile));
  assert(tile.y == 118 && tile.height == 2);
  assert(!scheduler.nextTile(tile));

  SceneGraph scene;
  SceneNode node;
  node.bounds = {40, 50, 20, 20};
  node.clip = {0, 0, 240, 240};
  node.sourceMask = 1U << 3;
  assert(scene.add(node));
  scheduler.invalidateSource(scene, 3, 1);
  assert(scheduler.beginFrame());
  assert(scheduler.nextTile(tile));
  assert(tile.x == 39 && tile.y == 49 && tile.width == 22);
  scheduler.invalidate({0, 0, 8, 8});
  scheduler.reset();
  assert(!scheduler.pending());
  assert(!scheduler.rendering());
  assert(!scheduler.nextTile(tile));
}
