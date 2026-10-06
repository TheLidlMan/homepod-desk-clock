#include <assert.h>
#include <stdint.h>

#include "SceneAnimationTimeline.h"

int main() {
  SceneAnimationTimeline timeline;
  SceneAnimationFrame frame;
  timeline.start(1000, 1000, 10);
  assert(timeline.next(1000, frame));
  assert(frame.index == 1 && frame.count == 10);
  assert(!timeline.next(1000, frame));

  // A delayed renderer still emits every visual frame in order.
  assert(timeline.next(1550, frame));
  assert(frame.index == 2);
  assert(timeline.next(1550, frame));
  assert(frame.index == 3);
  assert(timeline.next(1550, frame));
  assert(frame.index == 4);
  assert(timeline.next(1550, frame));
  assert(frame.index == 5);
  assert(timeline.next(1550, frame));
  assert(frame.index == 6);
  assert(!timeline.next(1550, frame));
  assert(timeline.next(2000, frame));
  assert(frame.index == 7);
  assert(timeline.next(2000, frame));
  assert(frame.index == 8);
  assert(timeline.next(2000, frame));
  assert(frame.index == 9);
  assert(timeline.next(2000, frame));
  assert(frame.index == 10);
  assert(!timeline.active());

  timeline.start(UINT32_MAX - 100, 200, 4);
  assert(timeline.next(UINT32_MAX - 100, frame));
  assert(frame.index == 1);
  assert(timeline.next(49, frame));
  assert(frame.index == 2);
  assert(timeline.next(49, frame));
  assert(frame.index == 3);
  assert(timeline.next(49, frame));
  assert(frame.index == 4);

  timeline.start(0, 0, 0);
  assert(timeline.next(0, frame));
  assert(frame.index == 1 && frame.count == 1);

  // Rendering a clock at the fade midpoint must not bunch the fade-in frames.
  timeline.start(1000, 600, 6);
  assert(timeline.next(1000, frame) && frame.index == 1);
  assert(timeline.next(1100, frame) && frame.index == 2);
  timeline.pause(300);
  assert(!timeline.next(1499, frame));
  assert(timeline.next(1500, frame) && frame.index == 3);
}
