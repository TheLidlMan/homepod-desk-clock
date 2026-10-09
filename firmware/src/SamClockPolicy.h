#pragma once
#include "ClockConfig.h"

#include <stdint.h>

// Local-time schedule; supports windows crossing midnight.
inline bool clockNightHour(uint8_t hour) { return DESK_NIGHT_START_HOUR < DESK_NIGHT_END_HOUR
      ? hour >= DESK_NIGHT_START_HOUR && hour < DESK_NIGHT_END_HOUR
      : DESK_NIGHT_START_HOUR > DESK_NIGHT_END_HOUR &&
          (hour >= DESK_NIGHT_START_HOUR || hour < DESK_NIGHT_END_HOUR); }

inline uint8_t clockBrightness(uint8_t daytime, bool night) {
  return night && daytime > DESK_NIGHT_BRIGHTNESS ? DESK_NIGHT_BRIGHTNESS : daytime;
}

inline bool clockMusicExpired(uint32_t now, uint32_t updated, bool received) {
  return !received || static_cast<uint32_t>(now - updated) > 25000;
}

inline bool clockMusicAvailable(uint32_t now, uint32_t updated, bool received,
                                bool playing) {
  return playing && !clockMusicExpired(now, updated, received);
}

// A queued page cannot block the receiver that must finish before rendering.
inline bool clockNativePollAllowed(bool transition, int pendingPage, bool receiving) {
  return !transition && (pendingPage < 0 || receiving);
}
