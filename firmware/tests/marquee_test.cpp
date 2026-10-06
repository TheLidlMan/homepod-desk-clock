#include <cassert>
#include <initializer_list>
#include "MarqueeState.h"
#include "FreeTextSizing.h"

int main() {
  const auto longText = [](int size, int16_t &width, int16_t &height) {
    height = (size + 1) * 15;
    width = (size + 1) * 300;
  };
  assert(freeTextSize(200, 60, true, longText) == 3);
  assert(freeTextSize(200, 30, true, longText) == 1);
  assert(freeTextSize(200, 60, false, longText) == -1);
  const auto shortValue = [](int size, int16_t &width, int16_t &height) {
    height = (size + 1) * 15;
    width = (size + 1) * 25;
  };
  assert(freeTextSize(80, 60, false, shortValue) == 1);
  assert(freeTextSize(200, 60, false, shortValue) == 3);

  for (uint16_t interval : {50, 100, 800, 10000}) {
    MarqueeTitle item;
    item.overflow = 19;
    item.intervalMs = interval;
    item.stepPixels = interval == 50 ? 1 : interval == 100 ? 2 : 8;
    item.nextActionAt = 1000;
    assert(!stepMarquee(item, 999));
    assert(stepMarquee(item, 1000) && item.drawnOffset == item.stepPixels);
    assert(!stepMarquee(item, 1000));
    assert(!stepMarquee(item, 1000 + interval - 1));
    // Slow render/networking must never cause multiple catch-up steps.
    assert(stepMarquee(item, 100000) &&
           item.drawnOffset == item.stepPixels * 2);
    assert(!stepMarquee(item, 100000));
    while (item.phase != MarqueePhase::PausedAtEnd)
      assert(stepMarquee(item, item.nextActionAt));
    assert(item.drawnOffset == 19);
    assert(item.phase == MarqueePhase::PausedAtEnd);
    while (item.phase != MarqueePhase::PausedAtStart)
      assert(stepMarquee(item, item.nextActionAt));
    assert(item.drawnOffset == 0);
    assert(item.phase == MarqueePhase::PausedAtStart);
    item.nextActionAt = 20; // millis() rollover
    assert(!stepMarquee(item, UINT32_MAX - 10));
    assert(stepMarquee(item, 20));
  }
  assert(marqueeContentHash("value 1") != marqueeContentHash("value 2"));
  MarqueeTitle loop;
  loop.loop = true;
  loop.overflow = 51;
  for (int n = 1; n <= 100; ++n) {
    assert(stepMarquee(loop, loop.nextActionAt));
    assert(loop.drawnOffset == n % 51);
    assert(loop.phase == MarqueePhase::Forward);
  }
}
