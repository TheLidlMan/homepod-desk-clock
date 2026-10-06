#include <assert.h>
#include <algorithm>

#include "PageTransitionMath.h"

int main() {
  assert(pageTransitionFrameCount(PageTransitionSpeed::Fast) == 8);
  assert(pageTransitionFrameCount(PageTransitionSpeed::Normal) == 12);
  assert(pageTransitionFrameCount(PageTransitionSpeed::Slow) == 18);
  assert(pageBounceFrameCount(PageTransitionSpeed::Fast) == 11);
  assert(pageBounceFrameCount(PageTransitionSpeed::Normal) == 22);
  assert(pageBounceFrameCount(PageTransitionSpeed::Slow) == 33);
  assert(pageTransitionDurationMs(PageTransitionSpeed::Fast) == 280);
  assert(pageTransitionDurationMs(PageTransitionSpeed::Normal) == 550);
  assert(pageTransitionDurationMs(PageTransitionSpeed::Slow) == 900);

  const PageMotionFrame start =
      pageMotionFrame(0.0F, 240, PageTransitionDirection::Left, false, true,
                      PageTransitionIntensity::Subtle, 3, -2);
  assert(start.currentX == 3 && start.currentY == -2);
  assert(start.nextX == 243 && start.nextY == -2);

  const PageMotionFrame left =
      pageMotionFrame(1.0F, 240, PageTransitionDirection::Left, false, true,
                      PageTransitionIntensity::Subtle, 3, -2);
  assert(left.currentX == -237 && left.currentY == -2);
  assert(left.nextX == 3 && left.nextY == -2);

  const PageMotionFrame right =
      pageMotionFrame(1.0F, 240, PageTransitionDirection::Right, false, true,
                      PageTransitionIntensity::Subtle);
  assert(right.currentX == 240 && right.nextX == 0);

  const PageMotionFrame up =
      pageMotionFrame(1.0F, 240, PageTransitionDirection::Up, false, true,
                      PageTransitionIntensity::Subtle);
  assert(up.currentY == -240 && up.nextY == 0);

  const PageMotionFrame down =
      pageMotionFrame(1.0F, 240, PageTransitionDirection::Down, false, true,
                      PageTransitionIntensity::Subtle);
  assert(down.currentY == 240 && down.nextY == 0);

  const float strongPeak = pageMotionProgress(
      1.0F / 2.75F, true, false, PageTransitionIntensity::Strong);
  const float strongRebound = pageMotionProgress(
      1.5F / 2.75F, true, false, PageTransitionIntensity::Strong);
  assert(strongPeak > strongRebound);

  const float subtlePeak = pageMotionProgress(
      1.0F / 2.75F, true, false, PageTransitionIntensity::Subtle);
  const float subtleRebound = pageMotionProgress(
      1.5F / 2.75F, true, false, PageTransitionIntensity::Subtle);
  assert(subtlePeak > subtleRebound);
  assert(subtlePeak - subtleRebound < strongPeak - strongRebound);
  assert(strongPeak == 1.0F);
  assert(subtlePeak == 1.0F);

  assert(pageMotionProgress(0.0F, true, false,
                            PageTransitionIntensity::Strong) == 0.0F);
  assert(pageMotionProgress(1.0F, true, false,
                            PageTransitionIntensity::Strong) == 1.0F);
}
