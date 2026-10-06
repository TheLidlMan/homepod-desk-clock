#include <cassert>
#include <iostream>
#include "WeatherValue.h"

int main() {
  WeatherValue current("11|0.0|-2.0|65|0|12.5|Now", true);
  assert(current.available && current.condition == 11);
  assert(strcmp(current.fields[1], "0.0") == 0);
  assert(strcmp(current.fields[2], "-2.0") == 0);
  assert(strcmp(current.fields[6], "Now") == 0);
  for (const char *invalid : {"", "sunny", "11|0.0", "99||||||", "-1||||||", "A||||||"}) {
    WeatherValue value(invalid, true);
    assert(!value.available);
  }
  WeatherValue unavailable("11|0.0|-2.0|65|0|12.5|Now", false);
  assert(!unavailable.available);
  std::cout << "weather values: decoding, bounds, missing data passed\n";
}
