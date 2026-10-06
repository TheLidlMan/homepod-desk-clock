#pragma once

#include <Arduino.h>

#include "DeviceSettings.h"
#include "DisplayCompat.h"

using StartupTextRenderer =
    void (*)(const String &, int16_t, uint8_t, uint16_t);

class StartupScreens {
 public:
  StartupScreens(MiniDisplay &display, StartupTextRenderer textRenderer)
      : display_(display), textRenderer_(textRenderer) {}

  void begin();
  void showConnecting(const DeviceConfig &config, uint8_t attempt,
                      uint32_t connectionStartedAt, uint32_t timeoutMs);
  void showConnected(const DeviceConfig &config, uint8_t secondsRemaining);
  void updateConnectedCountdown(uint8_t secondsRemaining);
  void showSetup(const DeviceConfig &config,
                 const NetworkSettings &networkSettings,
                 const String &deviceSuffix, uint8_t connectionAttempt);

  uint8_t setupStationCount() const { return setupStationCount_; }
  uint32_t setupUpdatedAt() const { return setupUpdatedAt_; }
  uint8_t countdownShown() const { return countdownShown_; }
  bool connectionVisible() const { return connectionVisible_; }
  void clearConnection() { connectionVisible_ = false; }

 private:
  void drawCenteredBold(const String &text, int16_t y, uint8_t font,
                        uint16_t color);

  MiniDisplay &display_;
  StartupTextRenderer textRenderer_;
  uint8_t setupStationCount_ = UINT8_MAX;
  uint32_t setupUpdatedAt_ = 0;
  uint8_t countdownShown_ = UINT8_MAX;
  bool connectionVisible_ = false;
};
