#include "StartupScreens.h"

#if defined(ESP8266)
#include <ESP8266WiFi.h>
#else
#include <WiFi.h>
#endif

namespace {

constexpr int16_t kScreenCenter = 120;

}  // namespace

void StartupScreens::drawCenteredBold(const String &text, int16_t y,
                                      uint8_t font, uint16_t color) {
  textRenderer_(text, y, font, color);
}

void StartupScreens::begin() {
  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, TFT_BACKLIGHT_ON);
  display_.init();
  display_.setRotation(0);
#if defined(ESP8266)
  display_.setTextWrap(false, false);
#endif

  const uint16_t background = display_.color565(9, 14, 23);
  const uint16_t panel = display_.color565(25, 34, 47);
  const uint16_t muted = display_.color565(150, 164, 181);
  const uint16_t accent = display_.color565(3, 169, 244);
  display_.fillScreen(background);
  display_.fillRoundRect(12, 12, 216, 216, 12, panel);
  display_.fillRoundRect(12, 12, 216, 6, 3, accent);
  display_.setTextDatum(MC_DATUM);
  display_.setTextColor(accent, panel);
  display_.drawCircle(kScreenCenter, 76, 28, accent);
  display_.drawLine(104, 76, 116, 88, accent);
  display_.drawLine(116, 88, 139, 63, accent);
  drawCenteredBold("MINI-DISPLAY", 130, 4, TFT_WHITE);
  drawCenteredBold("HOME ASSISTANT", 160, 2, muted);
  drawCenteredBold("Starting...", 198, 2, muted);
}

void StartupScreens::showConnecting(const DeviceConfig &config,
                                    uint8_t attempt,
                                    uint32_t connectionStartedAt,
                                    uint32_t timeoutMs) {
  if (!wifiConfigured(config) || WiFi.status() == WL_CONNECTED) return;
  setupUpdatedAt_ = millis();

  const uint16_t background = display_.color565(9, 14, 23);
  const uint16_t panel = display_.color565(25, 34, 47);
  const uint16_t muted = display_.color565(150, 164, 181);
  const uint16_t accent = display_.color565(3, 169, 244);
  const uint16_t warning = display_.color565(245, 180, 0);
  const uint8_t retryLimit = config.wifiRetryLimit
                                 ? config.wifiRetryLimit
                                 : kDefaultWifiRetryLimit;
  const uint32_t elapsed = millis() - connectionStartedAt;
  const uint32_t remainingSeconds =
      elapsed >= timeoutMs ? 0 : (timeoutMs - elapsed + 999) / 1000;
  const uint16_t progressWidth =
      min<uint32_t>(180, elapsed * 180 / timeoutMs);

  if (!connectionVisible_) {
    display_.fillScreen(background);
    display_.fillRoundRect(12, 12, 216, 216, 12, panel);
    display_.fillRoundRect(12, 12, 216, 6, 3, accent);
    display_.setTextDatum(MC_DATUM);
    drawCenteredBold("CONNECTING", 38, 4, TFT_WHITE);
    drawCenteredBold("WI-FI NETWORK", 69, 2, muted);
    drawCenteredBold(config.ssid, 90, 2, TFT_WHITE);
    connectionVisible_ = true;
  }

  display_.fillRect(25, 106, 190, 27, panel);
  drawCenteredBold("ATTEMPT " + String(attempt) + " OF " + String(retryLimit),
                   119, 2, warning);
  display_.fillRect(28, 138, 184, 16, panel);
  display_.drawRoundRect(29, 139, 182, 14, 5, muted);
  if (progressWidth > 0) {
    display_.fillRoundRect(30, 140, progressWidth, 12, 4, accent);
  }
  display_.fillRect(25, 160, 190, 29, panel);
  drawCenteredBold("Waiting up to " + String(remainingSeconds) + " s", 174,
                   2, muted);

  display_.fillRect(25, 190, 190, 25, panel);
  const wl_status_t status = WiFi.status();
  if (status == WL_NO_SSID_AVAIL) {
    drawCenteredBold("Network not found", 202, 2, muted);
  } else if (status == WL_CONNECT_FAILED) {
    drawCenteredBold("Check Wi-Fi password", 202, 2, TFT_RED);
  } else {
    drawCenteredBold("Please wait...", 202, 2, muted);
  }

  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, TFT_BACKLIGHT_ON);
}

void StartupScreens::updateConnectedCountdown(uint8_t secondsRemaining) {
  const uint16_t panel = display_.color565(25, 34, 47);
  display_.fillRect(85, 192, 70, 32, panel);
  drawCenteredBold(String(secondsRemaining), 207, 4, TFT_WHITE);
  countdownShown_ = secondsRemaining;
  setupUpdatedAt_ = millis();
}

void StartupScreens::showConnected(const DeviceConfig &config,
                                   uint8_t secondsRemaining) {
  const uint16_t background = display_.color565(9, 14, 23);
  const uint16_t panel = display_.color565(25, 34, 47);
  const uint16_t muted = display_.color565(150, 164, 181);
  const uint16_t success = display_.color565(46, 204, 113);
  display_.fillScreen(background);
  display_.fillRoundRect(12, 12, 216, 216, 12, panel);
  display_.fillRoundRect(12, 12, 216, 6, 3, success);
  display_.drawCircle(kScreenCenter, 56, 24, success);
  display_.drawLine(108, 56, 117, 65, success);
  display_.drawLine(117, 65, 133, 47, success);
  display_.setTextDatum(MC_DATUM);
  drawCenteredBold("CONNECTED", 94, 4, success);
  drawCenteredBold(config.ssid, 122, 2, muted);
  drawCenteredBold("IP  " + WiFi.localIP().toString(), 148, 2, TFT_WHITE);
  drawCenteredBold("Opening dashboard in", 181, 2, muted);
  updateConnectedCountdown(secondsRemaining);
}

void StartupScreens::showSetup(const DeviceConfig &config,
                               const NetworkSettings &networkSettings,
                               const String &deviceSuffix,
                               uint8_t connectionAttempt) {
  setupStationCount_ = WiFi.softAPgetStationNum();
  setupUpdatedAt_ = millis();

  const uint16_t background = display_.color565(9, 14, 23);
  const uint16_t panel = display_.color565(25, 34, 47);
  const uint16_t muted = display_.color565(150, 164, 181);
  const uint16_t accent = display_.color565(3, 169, 244);
  display_.fillScreen(background);
  display_.fillRoundRect(12, 12, 216, 216, 12, panel);
  display_.fillRoundRect(12, 12, 216, 6, 3, accent);

  display_.setTextDatum(MC_DATUM);
  drawCenteredBold("SETUP MODE", 32, 4, TFT_WHITE);
  const uint8_t retryLimit = config.wifiRetryLimit
                                 ? config.wifiRetryLimit
                                 : kDefaultWifiRetryLimit;
  const bool connectionFailed =
      wifiConfigured(config) && connectionAttempt >= retryLimit;
  if (connectionFailed) {
    drawCenteredBold("WI-FI CONNECTION FAILED", 52, 1, TFT_RED);
  }
  drawCenteredBold("CONNECT TO", connectionFailed ? 69 : 60, 2, muted);
  drawCenteredBold("SDPRO-Setup-" + deviceSuffix,
                   connectionFailed ? 87 : 78, 2, TFT_WHITE);

  drawCenteredBold("OPEN IN BROWSER", connectionFailed ? 107 : 100, 2,
                   muted);
  drawCenteredBold("http://" + WiFi.softAPIP().toString(),
                   connectionFailed ? 125 : 118, 2, accent);

  if (networkSettings.recoveryPassword[0]) {
    drawCenteredBold("PASSWORD", connectionFailed ? 145 : 140, 2, muted);
    const String password = networkSettings.recoveryPassword;
    const int16_t passwordY = connectionFailed ? 162 : 158;
    if (password.length() <= 24) {
      drawCenteredBold(password, passwordY, 2, TFT_WHITE);
    } else if (password.length() <= 36) {
      display_.setFreeFont(nullptr);
      display_.setTextColor(TFT_WHITE, panel);
      display_.drawString(password, kScreenCenter, passwordY, 1);
    } else {
      const size_t split = (password.length() + 1) / 2;
      display_.setFreeFont(nullptr);
      display_.setTextColor(TFT_WHITE, panel);
      display_.drawString(password.substring(0, split), kScreenCenter,
                          passwordY - 5, 1);
      display_.drawString(password.substring(split), kScreenCenter,
                          passwordY + 7, 1);
    }
  }
  drawCenteredBold("CONNECTED DEVICES",
                   networkSettings.recoveryPassword[0] ? 188 : 151, 2,
                   muted);
  drawCenteredBold(String(setupStationCount_),
                   networkSettings.recoveryPassword[0] ? 211 : 184, 4,
                   accent);

  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, TFT_BACKLIGHT_ON);
}
