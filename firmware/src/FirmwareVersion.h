#pragma once

#include <ctype.h>
#include <stdint.h>
#include <string.h>

struct FirmwareVersion {
  uint32_t major = 0;
  uint32_t minor = 0;
  uint32_t patch = 0;
  bool prerelease = false;
};

inline bool parseFirmwareVersion(const char *text, FirmwareVersion &version) {
  if (!text || *text == '\0') return false;
  if (*text == 'v') ++text;
  uint32_t values[3]{};
  for (uint8_t part = 0; part < 3; ++part) {
    if (!isdigit(static_cast<unsigned char>(*text))) return false;
    do {
      values[part] = values[part] * 10 + (*text++ - '0');
      if (values[part] > 999999) return false;
    } while (isdigit(static_cast<unsigned char>(*text)));
    if (part < 2) {
      if (*text != '.') return false;
      ++text;
    }
  }
  bool prerelease = false;
  if (*text == '-') {
    prerelease = true;
    ++text;
    if (!*text) return false;
    bool identifierStart = true;
    while (*text) {
      const unsigned char character = *text++;
      if (character == '.') {
        if (identifierStart) return false;
        identifierStart = true;
      } else if (!isalnum(character) && character != '-') {
        return false;
      } else {
        identifierStart = false;
      }
    }
    if (identifierStart) return false;
  } else if (*text) {
    return false;
  }
  version = {values[0], values[1], values[2], prerelease};
  return true;
}

inline bool newerFirmwareVersion(const char *available, const char *current) {
  FirmwareVersion next;
  FirmwareVersion installed;
  if (!parseFirmwareVersion(available, next) ||
      !parseFirmwareVersion(current, installed)) {
    return false;
  }
  if (next.major != installed.major) return next.major > installed.major;
  if (next.minor != installed.minor) return next.minor > installed.minor;
  if (next.patch != installed.patch) return next.patch > installed.patch;
  const char *currentSuffix = strchr(current, '-');
  if (currentSuffix && strcmp(currentSuffix, "-dev") == 0) return false;
  return installed.prerelease && !next.prerelease;
}
