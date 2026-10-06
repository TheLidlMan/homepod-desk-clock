#include <assert.h>
#include <stdint.h>

#include "SceneGraph.h"

int main() {
  SceneGraph scene;
  SceneNode upper;
  upper.bounds = {10, 10, 20, 20};
  upper.clip = {0, 0, 240, 240};
  upper.id = 20;
  upper.zIndex = 20;
  upper.sourceMask = 1U << 1;
  assert(scene.add(upper));

  SceneNode lower = upper;
  lower.zIndex = 10;
  lower.id = 10;
  lower.sourceMask = 1U << 2;
  assert(scene.add(lower));
  assert(scene.size() == 2);
  assert(scene.node(0).zIndex == 10);
  assert(scene.node(1).zIndex == 20);
  assert(scene.node(0).id == 10);
  assert(scene.node(1).id == 20);
  assert(scene.nodesForSource(1) == (uint64_t{1} << 1));
  assert(scene.nodesForSource(2) == uint64_t{1});

  DirtyRegionSet<> dirty(240, 240);
  dirty.invalidate({-5, -5, 15, 15});
  assert(dirty.size() == 1);
  assert(dirty.region(0).x == 0);
  assert(dirty.region(0).y == 0);
  assert(dirty.region(0).width == 10);
  assert(dirty.region(0).height == 10);

  dirty.invalidate({10, 0, 10, 10});
  assert(dirty.size() == 1);
  assert(dirty.region(0).width == 20);

  dirty.clear();
  dirty.invalidateChange({20, 20, 10, 10}, {30, 20, 10, 10}, 2);
  assert(dirty.region(0).x == 18);
  assert(dirty.region(0).width == 24);

  FrameDeadline deadline;
  deadline.arm(100, 800);
  assert(!deadline.due(899));
  assert(deadline.due(900));
  deadline.complete(1250, 800);
  assert(!deadline.due(2049));
  assert(deadline.due(2050));

  deadline.arm(UINT32_MAX - 100, 200);
  assert(!deadline.due(50));
  assert(deadline.due(100));

  dirty.clear();
  invalidateSceneSource(scene, 1, dirty, 2);
  assert(dirty.size() == 1);
  assert(dirty.region(0).x == 8);
  assert(dirty.region(0).y == 8);
  assert(dirty.region(0).width == 24);
  assert(dirty.region(0).height == 24);

  uint8_t visited[2] = {0xff, 0xff};
  uint8_t visitCount = 0;
  visitSceneNodes(scene, SceneRect{0, 0, 240, 240},
                  [&](uint8_t index, const SceneNode &) {
                    visited[visitCount++] = index;
                  });
  assert(visitCount == 2);
  assert(visited[0] == 0);
  assert(visited[1] == 1);

  SceneTilePlan<> tiles(8);
  tiles.begin(dirty);
  SceneRect tile;
  assert(tiles.next(tile));
  assert(tile.x == 8 && tile.y == 8 && tile.width == 24 && tile.height == 8);
  assert(tiles.next(tile));
  assert(tile.y == 16 && tile.height == 8);
  assert(tiles.next(tile));
  assert(tile.y == 24 && tile.height == 8);
  assert(!tiles.next(tile));
}
