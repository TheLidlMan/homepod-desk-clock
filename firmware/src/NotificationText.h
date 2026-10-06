#pragma once

#include "NotificationState.h"

// Reject malformed UTF-8, NUL and control characters before copying user data.
inline bool validNotificationText(const char *text, size_t size, size_t maximum) {
  if (!text || size > maximum) return false;
  for (size_t i = 0; i < size;) {
    const auto first = static_cast<uint8_t>(text[i++]);
    if (first < 0x80) {
      if ((first < 32 && first != '\n') || first == 127) return false;
      continue;
    }
    uint8_t more = first >= 0xc2 && first <= 0xdf ? 1 :
        first >= 0xe0 && first <= 0xef ? 2 : first >= 0xf0 && first <= 0xf4 ? 3 : 0;
    if (!more || i + more > size) return false;
    uint32_t code = first & (0x7f >> more);
    for (uint8_t j = 0; j < more; ++j) {
      const auto next = static_cast<uint8_t>(text[i++]);
      if ((next & 0xc0) != 0x80) return false;
      code = (code << 6) | (next & 0x3f);
    }
    if ((more == 1 && code < 0x80) || (more == 2 && code < 0x800) ||
        (more == 3 && code < 0x10000) || code > 0x10ffff ||
        (code >= 0xd800 && code <= 0xdfff)) return false;
  }
  return true;
}

inline size_t notificationCodeEnd(const char *text, size_t start) {
  size_t end = start + 1;
  while ((static_cast<uint8_t>(text[end]) & 0xc0) == 0x80) ++end;
  return end;
}

// Wrapped spans refer to the original message, without a second text copy.
template <typename Measure>
uint8_t wrapNotificationText(const char *text, NotificationLine *lines,
                             uint8_t maximum, int16_t width, Measure measure) {
  size_t cursor = 0;
  uint8_t count = 0;
  char candidate[97];
  while (text[cursor] && count < maximum) {
    while (text[cursor] == ' ' || text[cursor] == '\n') ++cursor;
    if (!text[cursor]) break;
    const size_t start = cursor;
    size_t end = start, space = start;
    while (text[end] && text[end] != '\n') {
      const size_t next = notificationCodeEnd(text, end);
      if (next - start > sizeof(candidate) - 4) break;
      memcpy(candidate, text + start, next - start);
      candidate[next - start] = 0;
      if (measure(candidate) > width && end > start) break;
      if (text[end] == ' ') space = end;
      end = next;
    }
    if (text[end] && text[end] != '\n' && space > start) end = space;
    lines[count++] = {static_cast<uint16_t>(start), static_cast<uint16_t>(end - start), false};
    cursor = end;
  }
  while (text[cursor] == ' ' || text[cursor] == '\n') ++cursor;
  if (count && text[cursor]) {
    auto &last = lines[count - 1];
    last.ellipsis = true;
    for (;;) {
      memcpy(candidate, text + last.start, last.length);
      memcpy(candidate + last.length, "...", 4);
      if (last.length < sizeof(candidate) - 4 && measure(candidate) <= width) break;
      if (!last.length) break;
      do { --last.length; } while (last.length &&
          (static_cast<uint8_t>(text[last.start + last.length]) & 0xc0) == 0x80);
    }
  }
  return count;
}
