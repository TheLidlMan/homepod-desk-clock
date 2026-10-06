#include <assert.h>
#include <stdint.h>
#include <string.h>

#include "SceneCompositor.h"

namespace {
constexpr int16_t kWidth = 24;
constexpr int16_t kHeight = 24;

void render(SceneGraph &scene, SceneRenderScheduler<> &scheduler,
            uint16_t (&frame)[kWidth * kHeight]) {
  SceneCompositor<kWidth, 4> compositor;
  while (compositor.renderOneTile(
      scene, scheduler,
      [](auto &tile, const SceneRect &bounds) {
        tile.fill(bounds, 0x0000);
      },
      [](auto &tile, const SceneRect &, uint8_t, const SceneNode &node) {
        tile.fill(node.bounds, node.payloadIndex == 1 ? 0xf800 : 0x07e0,
                  node.opacity);
      },
      [&](const SceneRect &bounds, const uint16_t *pixels, size_t) {
        for (int16_t y = 0; y < bounds.height; ++y) {
          memcpy(frame + (bounds.y + y) * kWidth + bounds.x,
                 pixels + y * bounds.width,
                 static_cast<size_t>(bounds.width) * sizeof(uint16_t));
        }
      })) {
  }
}
}  // namespace

int main() {
  static_assert(sizeof(SceneCompositor<240, 8>) <= 3900,
                "The RGB565 compositor must stay within one 240x8 tile");
  static_assert(sizeof(SceneRenderScheduler<>) <= 192,
                "The scheduler must remain small and bounded");

  SceneGraph scene;
  SceneNode background;
  background.bounds = {0, 0, kWidth, kHeight};
  background.clip = background.bounds;
  background.payloadIndex = 1;
  assert(scene.add(background));
  SceneNode moving;
  moving.bounds = {2, 4, 6, 6};
  moving.clip = {0, 0, kWidth, kHeight};
  moving.payloadIndex = 2;
  moving.zIndex = 1;
  assert(scene.add(moving));

  uint16_t dirtyFrame[kWidth * kHeight]{};
  SceneRenderScheduler<> dirtyScheduler(kWidth, kHeight, 4);
  dirtyScheduler.invalidate({0, 0, kWidth, kHeight});
  render(scene, dirtyScheduler, dirtyFrame);

  const SceneRect before = scene.node(1).bounds;
  scene.node(1).bounds = {13, 12, 7, 5};
  dirtyScheduler.invalidateChange(before, scene.node(1).bounds);
  render(scene, dirtyScheduler, dirtyFrame);

  uint16_t fullFrame[kWidth * kHeight]{};
  SceneRenderScheduler<> fullScheduler(kWidth, kHeight, 4);
  fullScheduler.invalidate({0, 0, kWidth, kHeight});
  render(scene, fullScheduler, fullFrame);

  // A dirty update must be pixel-identical to a complete redraw.
  assert(memcmp(dirtyFrame, fullFrame, sizeof(fullFrame)) == 0);

  uint32_t random = 0x6d2b79f5;
  for (uint16_t iteration = 0; iteration < 250; ++iteration) {
    const SceneRect oldBounds = scene.node(1).bounds;
    random = random * 1664525UL + 1013904223UL;
    scene.node(1).bounds = {
        static_cast<int16_t>((random >> 0) % 20),
        static_cast<int16_t>((random >> 5) % 18),
        static_cast<int16_t>(2 + (random >> 10) % 7),
        static_cast<int16_t>(2 + (random >> 15) % 7)};
    dirtyScheduler.invalidateChange(oldBounds, scene.node(1).bounds);
    render(scene, dirtyScheduler, dirtyFrame);

    memset(fullFrame, 0, sizeof(fullFrame));
    fullScheduler.invalidate({0, 0, kWidth, kHeight});
    render(scene, fullScheduler, fullFrame);
    assert(memcmp(dirtyFrame, fullFrame, sizeof(fullFrame)) == 0);
  }
}
