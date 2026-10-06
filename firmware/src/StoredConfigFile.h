#pragma once

#include <LittleFS.h>

inline bool quarantineStoredConfigFile(const char *path,
                                       const char *quarantinePath) {
  LittleFS.remove(quarantinePath);
  if (!LittleFS.exists(path)) return true;
  if (LittleFS.rename(path, quarantinePath)) return true;
  return LittleFS.remove(path);
}
