#pragma once
#include <cstddef>
#include <cstring>
struct TestHeap {
  size_t available = 65536;
  size_t calls = 0;
  size_t failAfter = 0;
  size_t getFreeHeap() { return failAfter && ++calls >= failAfter ? 0 : available; }
};
extern TestHeap ESP;
struct TestFS { bool remove(const char *) { return true; } };
extern TestFS LittleFS;
inline size_t strlcpy(char *dest, const char *src, size_t size) {
  const auto length = std::strlen(src);
  if (size) { std::strncpy(dest, src, size - 1); dest[size - 1] = 0; }
  return length;
}
