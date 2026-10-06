#include <cassert>
#include <limits>
#include "DisplayRefresh.h"

int main() {
  DisplayRefresh clock;
  assert(clock.ready(0));
  clock.setRate(10);
  clock.completed(1000);
  assert(!clock.ready(1099));
  assert(clock.ready(1100));
  clock.setRate(0.1F);
  assert(clock.intervalMs() == 10000);
  assert(!clock.ready(10999));
  assert(clock.ready(11000));
  clock.setRate(0);
  assert(clock.rate() == 0.1F);
  assert(!DisplayRefresh::valid(std::numeric_limits<float>::quiet_NaN()));
  assert(!DisplayRefresh::valid(61));
  clock.setRate(60);
  assert(clock.intervalMs() == 17);
  clock.completed(UINT32_MAX - 10);
  assert(!clock.ready(5));
  assert(clock.ready(6));
}
