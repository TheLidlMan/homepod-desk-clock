#include <assert.h>

#include "SceneLayout.h"

int main() {
  SceneRowInput inputs[] = {{1, 2, 12}, {2, 1, 0}};
  SceneRowGeometry rows[2];
  assert(calculateSceneRows({6, 6, 228, 228}, inputs, 2, 4, rows));
  assert(rows[0].bounds.x == 6);
  assert(rows[0].bounds.y == 6);
  assert(rows[0].bounds.height == 74);
  assert(rows[0].content.y == 18);
  assert(rows[0].content.height == 62);
  assert(rows[0].cardWidth == 112);
  assert(rows[1].bounds.y == 84);
  assert(rows[1].bounds.height == 150);

  const SceneRect first = sceneRowCard(rows[0], 0, 4);
  const SceneRect second = sceneRowCard(rows[0], 1, 4);
  assert(first.x == 6 && first.width == 112);
  assert(second.x == 122 && second.width == 112);
  assert(sceneRowCard(rows[0], 2, 4).empty());

  const SceneRect free = calculateFreeFrame(12.5F, 25.0F, 50.0F, 75.0F,
                                             240, 240);
  assert(free.x == 30);
  assert(free.y == 60);
  assert(free.width == 120);
  assert(free.height == 180);

  const SceneRect clipped =
      calculateFreeFrame(90.0F, 90.0F, 50.0F, 50.0F, 240, 240);
  assert(clipped.x == 216 && clipped.y == 216);
  assert(clipped.width == 24 && clipped.height == 24);
}
