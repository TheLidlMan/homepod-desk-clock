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

// Reassociate only when every observed network path has stopped progressing.
constexpr uint32_t kClockNetworkStallMs = 10UL * 60UL * 1000UL;
inline bool clockNetworkRecoveryAllowed(uint32_t now, uint32_t lastApiActivity,
                                       bool homepodConnected) {
  return !homepodConnected && now - lastApiActivity >= kClockNetworkStallMs;
}

// Keep the provisioning AP available while retrying an already saved network.
constexpr uint32_t kClockRecoveryWifiRetryMs = 60000;
inline bool clockRecoveryWifiRetryDue(uint32_t now, uint32_t lastAttempt,
                                      bool configured) {
  return configured && now - lastAttempt >= kClockRecoveryWifiRetryMs;
}

// An outage gets one continuous grace period, independent of retry attempts.
inline bool clockWifiWarningDue(uint32_t now, uint32_t outageStartedAt) {
  return now - outageStartedAt >= 60000;
}
