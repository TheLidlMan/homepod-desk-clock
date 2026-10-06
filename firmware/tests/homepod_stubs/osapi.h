#pragma once
#include <stddef.h>
#include <stdint.h>
static inline int os_get_random(uint8_t *bytes, size_t size) {
  for (size_t i = 0; i < size; ++i) bytes[i] = 0;
  return 0;
}
