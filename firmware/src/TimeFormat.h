#pragma once

#include <stdint.h>
#include <time.h>

inline void writeTwoDigits(char *output, uint8_t value) {
  output[0] = static_cast<char>('0' + value / 10);
  output[1] = static_cast<char>('0' + value % 10);
}

inline void formatClockTime(char *output, const tm &value, bool seconds,
                            bool twelveHour = false) {
  uint8_t hour = static_cast<uint8_t>(value.tm_hour);
  if (twelveHour) hour = static_cast<uint8_t>((hour + 11) % 12 + 1);
  writeTwoDigits(output, hour);
  output[2] = ':';
  writeTwoDigits(output + 3, static_cast<uint8_t>(value.tm_min));
  if (seconds) {
    output[5] = ':';
    writeTwoDigits(output + 6, static_cast<uint8_t>(value.tm_sec));
    output[8] = '\0';
  } else {
    output[5] = '\0';
  }
}

inline void formatIsoDate(char *output, const tm &value) {
  const uint16_t year = static_cast<uint16_t>(value.tm_year + 1900);
  output[0] = static_cast<char>('0' + year / 1000 % 10);
  output[1] = static_cast<char>('0' + year / 100 % 10);
  output[2] = static_cast<char>('0' + year / 10 % 10);
  output[3] = static_cast<char>('0' + year % 10);
  output[4] = '-';
  writeTwoDigits(output + 5, static_cast<uint8_t>(value.tm_mon + 1));
  output[7] = '-';
  writeTwoDigits(output + 8, static_cast<uint8_t>(value.tm_mday));
  output[10] = '\0';
}
