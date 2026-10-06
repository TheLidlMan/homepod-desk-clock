#include <cassert>
#include <cstring>

#include "TimeFormat.h"

int main() {
  tm value{};
  value.tm_year = 126;
  value.tm_mon = 8;
  value.tm_mday = 13;
  value.tm_hour = 0;
  value.tm_min = 5;
  value.tm_sec = 9;

  char output[16];
  formatClockTime(output, value, false);
  assert(strcmp(output, "00:05") == 0);
  formatClockTime(output, value, true);
  assert(strcmp(output, "00:05:09") == 0);
  formatClockTime(output, value, false, true);
  assert(strcmp(output, "12:05") == 0);
  value.tm_hour = 13;
  formatClockTime(output, value, true, true);
  assert(strcmp(output, "01:05:09") == 0);
  formatIsoDate(output, value);
  assert(strcmp(output, "2026-09-13") == 0);
}
