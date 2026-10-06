#pragma once

#include <cstdint>
#include <cstring>
#include <algorithm>

struct WrappedText {
  char text[145]{};
  uint8_t lines = 0;
  int16_t width = 0;
};

// Word wrapping with bounded scratch space. Never split a UTF-8 code point.
template <typename Measure>
WrappedText wrapDisplayText(const char *input, int16_t width,
                            uint8_t maxLines, Measure measure) {
  WrappedText result;
  char candidate[129]{};
  size_t start = 0, written = 0;
  const size_t length = std::min<size_t>(strlen(input), 128);
  while (start < length && result.lines < std::min<uint8_t>(6, maxLines)) {
    size_t end = start, space = start;
    while (end < length && input[end] != '\n') {
      size_t next = end + 1;
      while (next < length && (uint8_t(input[next]) & 0xc0) == 0x80) ++next;
      if (next == length && input[next] && (uint8_t(input[next]) & 0xc0) == 0x80) break;
      memcpy(candidate, input + start, next - start);
      candidate[next - start] = '\0';
      if (measure(candidate) > width && end > start) break;
      if (input[end] == ' ') space = end;
      end = next;
    }
    if (end < length && input[end] != '\n' && space > start) end = space;
    if (end == start && input[end] != '\n') break;
    size_t trimmed = end;
    while (trimmed > start && input[trimmed - 1] == ' ') --trimmed;
    const size_t count = trimmed - start;
    if (written + count + 2 > sizeof(result.text)) break;
    if (result.lines) result.text[written++] = '\n';
    memcpy(result.text + written, input + start, count);
    memcpy(candidate, input + start, count);
    candidate[count] = '\0';
    result.width = std::max<int16_t>(result.width, measure(candidate));
    written += count;
    result.text[written] = '\0';
    ++result.lines;
    start = end;
    if (start < length && input[start] == '\n') ++start;
    else while (start < length && input[start] == ' ') ++start;
  }
  return result;
}
