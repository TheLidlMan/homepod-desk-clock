#include <assert.h>

#include "SceneState.h"

int main() {
  SceneGraph scene;
  SceneNode text;
  text.id = 42;
  text.bounds = {10, 20, 30, 12};
  text.clip = {0, 0, 240, 240};
  text.sourceMask = 1U << 4;
  assert(scene.add(text));
  assert(scene.findById(42) == 0);
  assert(scene.findById(99) == -1);

  SceneRenderScheduler<> scheduler(240, 240, 8);
  SceneState<> state(scene, scheduler);
  assert(state.setBounds(42, {50, 60, 30, 12}, 2));
  assert(scene.node(0).revision == 1);
  assert(scheduler.pending());
  assert(scheduler.beginFrame());
  SceneRect tile;
  assert(scheduler.nextTile(tile));
  assert(tile.x == 8 && tile.y == 18 && tile.width == 74);
  while (scheduler.nextTile(tile)) {
  }

  assert(state.setVisible(42, false));
  assert(!scene.node(0).visible);
  assert(scene.node(0).revision == 2);
  while (scheduler.beginFrame() || scheduler.nextTile(tile)) {
    while (scheduler.nextTile(tile)) {
    }
  }

  state.touchSource(4, 1);
  assert(scene.node(0).revision == 3);
  assert(scheduler.pending());
  assert(!state.touch(99));
}
