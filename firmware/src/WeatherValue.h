#pragma once

#include <cstdlib>
#include <cstdint>
#include <cstring>

// condition|temperature|low|humidity|rain probability|wind|time label
struct WeatherValue {
  char storage[49]{};
  const char *fields[7]{};
  uint8_t condition = 15;
  bool available = false;

  WeatherValue(const char *value, bool valid) {
    for (auto &field : fields) field = "";
    if (!value || !valid || strlen(value) > 48) return;
    strcpy(storage, value);
    char *cursor = storage;
    for (uint8_t i = 0; i < 7; ++i) {
      fields[i] = cursor;
      char *separator = strchr(cursor, '|');
      if (i < 6 && !separator) return;
      if (i == 6 && separator) return;
      if (separator) { *separator = '\0'; cursor = separator + 1; }
    }
    char *end = nullptr;
    const long code = strtol(fields[0], &end, 10);
    if (end == fields[0] || *end || code < 0 || code > 15) return;
    condition = code;
    available = true;
  }
};
