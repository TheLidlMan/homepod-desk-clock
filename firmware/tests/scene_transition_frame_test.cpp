#include <cassert>
#include <cstdint>
#include "SceneTransitionFrame.h"

void verify(const SceneTransitionFrame &frame, bool first, bool last) {
  assert(frame.count > 0 && frame.count <= 3);
  // Every destination pixel belongs to precisely one source snapshot.
  for (int y = 0; y < 240; ++y) {
    for (int x = 0; x < 240; ++x) {
      int owners = 0;
      for (uint8_t i = 0; i < frame.count; ++i) {
        const auto &slice = frame.slices[i];
        if (x < slice.bounds.x || y < slice.bounds.y ||
            x >= slice.bounds.right() || y >= slice.bounds.bottom()) continue;
        ++owners;
        assert(x - slice.offsetX >= 0 && x - slice.offsetX < 240);
        assert(y - slice.offsetY >= 0 && y - slice.offsetY < 240);
        if (first) assert(!slice.next);
        if (last) {
          assert(slice.next);
          assert(slice.offsetX == 0 && slice.offsetY == 0);
        }
      }
      assert(owners == 1);
    }
  }
}

int main() {
  PageTransitionConfig config{};
  for (uint8_t direction = 0; direction < 4; ++direction) {
    config.direction = static_cast<PageTransitionDirection>(direction);
    for (int step = 0; step <= 40; ++step) {
      const float progress = step / 40.0F;
      verify(movingSceneFrame(progress, config, false, true), step == 0, step == 40);
      verify(movingSceneFrame(progress, config, true, true), step == 0, step == 40);
      verify(openingSceneFrame(progress, config), step == 0, step == 40);
    }
  }
}
