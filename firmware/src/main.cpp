#include <Arduino.h>
#include <ArduinoJson.h>
#include <memory>
#include <new>
#include "DeviceSettings.h"
#include "DashboardValues.h"
#include "CardValue.h"
#include "MarqueeState.h"
#include "DisplayRefresh.h"
#include "NotificationRequest.h"
#include "FeatureFlags.h"
#include "FirmwareVersion.h"
#include "StoredConfig.h"
#include "StoredConfigFile.h"
#if defined(ESP8266)
#include <ESP8266mDNS.h>
#include "RequestBodyWebServer.h"
#if MINI_DISPLAY_FEATURE_TLS
#include "DualWebServer.h"
#else
#include <ESP8266WebServer.h>
#endif
#include <ESP8266WiFi.h>
#include <sntp.h>
#include <Updater.h>
#else
#include <esp_sntp.h>
#include <ESPmDNS.h>
#include <WebServer.h>
#include <WiFi.h>
#include <Update.h>
#endif
#include <LittleFS.h>
#include <WiFiUdp.h>
#include "DisplayCompat.h"
#include "DisplayFonts.h"
#include "DisplayScrollBuffer.h"
#include "NotificationPainter.h"
#include "ApiAccessPolicy.h"
#include "AnimatedImagePlayback.h"
#include "DashboardPageLoader.h"
#include "CrashDiagnostics.h"
#include "RuntimeProfiler.h"
#include "ImageAssets.h"
#include "GraphHistory.h"
#include "DisplayDataResponse.h"
#include "JsonStreamWriter.h"
#include "ScenePageRenderer.h"
#include "ScenePageCompiler.h"
#include "SceneTextCompiler.h"
#include "SceneUpdatePainter.h"
#include "FreeTextFrame.h"
#include "ImageAssetApi.h"
#include "PageTransitionRenderer.h"
#include "ScreenCapture.h"
#include "SceneLayout.h"
#include "SceneCompileFailure.h"
#include "SceneRenderScheduler.h"
#include "StartupScreens.h"
#include "TextEffect.h"
#include "TransitionPixelTransfer.h"
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
#include "TlsCertificateManager.h"
#endif
#include "TimeFormat.h"
#include "UserFonts.h"
#include "SamClockPolicy.h"
#include "StandaloneWeather.h"
#include "SamHomePod.h"
#include "WebAssets.generated.h"

namespace {

constexpr uint32_t kConnectTimeoutMs = 20000;
#ifndef MINI_DISPLAY_VERSION
#error "MINI_DISPLAY_VERSION must be supplied by the build"
#endif
constexpr char kFirmwareVersion[] = MINI_DISPLAY_VERSION;
#if defined(HARDWARE_PROFILE_GEEKMAGIC_ESP32C2)
constexpr char kHardwareProfile[] = "geekmagic-smalltv-esp32c2";
constexpr char kHardwareModel[] = "GeekMagic SmallTV (ESP32-C2)";
#elif defined(HARDWARE_PROFILE_GEEKMAGIC_PRO)
constexpr char kHardwareProfile[] = "geekmagic-smalltv-pro";
constexpr char kHardwareModel[] = "GeekMagic SmallTV Pro";
#elif defined(HARDWARE_PROFILE_GEEKMAGIC_NOCS)
constexpr char kHardwareProfile[] = "geekmagic-smalltv-nocs";
constexpr char kHardwareModel[] = "GeekMagic SmallTV (no CS)";
#elif defined(HARDWARE_PROFILE_GEEKMAGIC_CS15)
constexpr char kHardwareProfile[] = "geekmagic-smalltv-cs15";
constexpr char kHardwareModel[] = "GeekMagic SmallTV / Ultra (CS15)";
#else
constexpr char kHardwareProfile[] = "juzipi-sd-pro";
constexpr char kHardwareModel[] = "JUZIPi SD PRO";
#endif
constexpr char kDashboardPath[] = "/dashboard.json";
constexpr char kDashboardTempPath[] = "/dashboard.tmp";
constexpr char kDashboardBackupPath[] = "/dashboard.bak";
constexpr char kDashboardInvalidPath[] = "/dashboard.invalid";
constexpr char kDisplaySettingsPath[] = "/display.json";
constexpr char kDisplaySettingsTempPath[] = "/display.tmp";
constexpr char kDisplaySettingsInvalidPath[] = "/display.invalid";
constexpr uint16_t kDisplaySettingsSchemaVersion = 1;
constexpr uint16_t kDefaultFirmwareNoticeDurationSeconds = 60;
constexpr uint16_t kDefaultFirmwareReminderHours = 24;
constexpr uint16_t kMaximumFirmwareReminderHours = 24 * 30;
constexpr uint32_t kFirmwareNoticeRetryMs = 60000;
constexpr size_t kMaxDashboardBytes = 12 * 1024;
constexpr size_t kMaxDataBytes = 8 * 1024;
constexpr uint8_t kMaxPages = 16;
constexpr uint8_t kMaxPixelShift = 10;
constexpr uint32_t kPixelShiftIntervalMs = 60000;
constexpr uint32_t kDiagnosticsCaptureTimeoutMs = 15000;
constexpr uint8_t kExtendLeft = 1U << 0;
constexpr uint8_t kExtendRight = 1U << 1;
constexpr uint8_t kExtendTop = 1U << 2;
constexpr uint8_t kExtendBottom = 1U << 3;

void drawStartupText(const String &text, int16_t y, uint8_t font,
                     uint16_t color);

DeviceConfig config{};
NetworkSettings networkSettings{};
#if defined(ESP8266)
#if MINI_DISPLAY_FEATURE_TLS
DualWebServer server(80, 443);
#else
RequestBodyWebServer<ESP8266WebServer> server(80);
#endif
#else
WebServer server(80);
#endif

struct HttpChunkSink {
  void operator()(const char *bytes, size_t length) const {
    server.sendContent(bytes, length);
    yield();
  }
};

HttpChunkSink httpChunkSink;
JsonStreamWriter<HttpChunkSink> jsonStreamWriter(httpChunkSink);
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
TlsCertificateManager tlsCertificates;
#endif
MiniDisplay display;
DisplayScrollBuffer displayScrollBuffer(display);
SceneRenderScheduler<> sceneScheduler(240, 240, kSceneUpdateBandHeight);
AnimatedImagePlayback animatedImages;
bool animatedFrameRenderActive = false;
std::unique_ptr<ScenePage> activeScene;
bool activeSceneReady = false;
uint8_t activeScenePage = 0xff;
uint32_t bootId = 0;
uint32_t connectStartedAt = 0;
uint8_t wifiAttemptCount = 0;
bool wifiWasConnected = false;
bool accessPointRunning = false;
bool startupSequenceActive = true;
uint32_t startupConnectedAt = 0;
uint32_t reconnectCount = 0;
wl_status_t lastDisconnectStatus = WL_IDLE_STATUS;
bool routesReady = false;
bool filesystemReady = false;
bool mdnsReady = false;
bool displayOn = true;
uint8_t displayBrightness = 100;
uint8_t daytimeBrightness = 70;
bool clockNightMode = false;
int8_t clockNightOverride = -1;
time_t clockNightOverrideUntil = 0;
uint8_t displayPixelShift = 0;
DisplayRefresh displayRefresh;
NotificationCenter notifications;
NotificationPosition notificationPosition = NotificationPosition::Top;
bool notificationAuthEnabled = true;
bool firmwareNotificationsEnabled = true;
uint16_t firmwareNoticeDurationSeconds =
    kDefaultFirmwareNoticeDurationSeconds;
uint16_t firmwareReminderHours = kDefaultFirmwareReminderHours;
char firmwareAvailableVersion[24]{};
uint32_t firmwareLastNoticeEpoch = 0;
uint32_t firmwareNoticeRetryAt = 30000;
SceneRect notificationPaintedBounds{};
uint32_t notificationPaintedRevision = 0;
uint32_t notificationFrameAt = 0;
char displayTimezone[64] = "CET-1CEST,M3.5.0,M10.5.0/3";
FontRenderState displayFontState;
StartupScreens startupScreens(display, drawStartupText);
int8_t pixelShiftX = 0;
int8_t pixelShiftY = 0;
uint32_t pixelShiftAt = 0;
bool pageRotationAuto = false;
int16_t pendingPageIndex = -1;
uint8_t activePageIndex = 0;
uint32_t pageShownAt = 0;
time_t lastClockTick = static_cast<time_t>(-1);

struct DashboardPage {
  char id[33];
  uint32_t durationMs;
  PageTransitionConfig transition;
  bool hasClock;
  bool clockShowsSeconds;
};

DashboardPage dashboardPages[kMaxPages]{};
uint8_t dashboardPageCount = 0;
DashboardPageLoader pageDefinition;

DashboardValues dashboardValues;
StandaloneWeather standaloneWeather;
SamHomePod samHomePod;
CardValueResolver cardValues(dashboardValues);
uint32_t pendingChangedValues = 0;
uint32_t transitionDeferredValues = 0;
bool pageTransitionActive = false;
bool fullRenderPending = false;
uint32_t fullRenderNotBefore = 0;
uint32_t lastValueUpdateAt = 0;
bool hasValueUpdate = false;
uint32_t lastMusicUpdateAt = 0;
bool hasMusicUpdate = false;
constexpr uint16_t kRenderRetryDelayMs = 750;
constexpr uint8_t kMaxMarqueeTitles = kMaxSceneTexts;
MarqueeTitle marqueeTitles[kMaxMarqueeTitles]{};
uint8_t marqueeTitleCount = 0;
String diagnosticsLastData;
uint32_t diagnosticsCaptureAt = 0;
uint32_t minimumFreeHeapBytes = UINT32_MAX;
char lastTransitionType[12] = "none";
uint32_t lastTransitionDurationMs = 0;

enum class RenderFailure : uint8_t {
  None,
  DashboardUnavailable,
  FileOpen,
  Json,
  Page,
  SceneAllocation,
  SceneCompilation,
};

RenderFailure lastRenderFailure = RenderFailure::None;
SceneCompileFailure lastSceneCompileFailure = SceneCompileFailure::None;
SceneTextCompiler sceneText(display, displayFontState, cardValues,
                            lastSceneCompileFailure);
ScenePageCompiler sceneCompiler(display, sceneText, dashboardValues,
                                cardValues, graphHistory,
                                lastSceneCompileFailure);

const char *renderFailureName() {
  switch (lastRenderFailure) {
    case RenderFailure::None: return "none";
    case RenderFailure::DashboardUnavailable: return "dashboard_unavailable";
    case RenderFailure::FileOpen: return "file_open";
    case RenderFailure::Json: return "json";
    case RenderFailure::Page: return "page";
    case RenderFailure::SceneAllocation: return "scene_allocation";
    case RenderFailure::SceneCompilation: return "scene_compilation";
  }
  return "unknown";
}

#if defined(ESP8266)
char lastResetReason[48]{};
#endif

bool renderDashboardPage();
bool renderDashboardPage(const uint32_t *changedValues,
                         bool clear = true);
void registerDashboardMarquees(JsonObjectConst, ScenePage &scene,
                               bool preserve = false);
void updateAnimatedImages();
void invalidateSceneBand(const SceneRect &bounds, uint8_t expansion = 0);
void invalidateSceneRegion(const SceneRect &bounds, bool exact);
bool renderPendingScene(const ScenePage &scene);
void showPageWithTransition(uint8_t nextPageIndex);
void showSetupScreen();
void startAccessPoint();

void recordFreeHeap() {
  minimumFreeHeapBytes = min(minimumFreeHeapBytes, ESP.getFreeHeap());
}

void updatePixelShift() {
  if (displayPixelShift == 0) {
    pixelShiftX = 0;
    pixelShiftY = 0;
    return;
  }
  int8_t nextX = pixelShiftX;
  int8_t nextY = pixelShiftY;
  for (uint8_t attempt = 0; attempt < 8 && nextX == pixelShiftX &&
                            nextY == pixelShiftY;
       ++attempt) {
    nextX = random(-displayPixelShift, displayPixelShift + 1);
    nextY = random(-displayPixelShift, displayPixelShift + 1);
  }
  if (nextX == pixelShiftX && nextY == pixelShiftY) {
    nextX = pixelShiftX == displayPixelShift ? -displayPixelShift
                                             : pixelShiftX + 1;
  }
  pixelShiftX = nextX;
  pixelShiftY = nextY;
}

bool saveDisplaySettings();

void resetStoredDisplaySettings(const __FlashStringHelper *reason) {
  Serial.print(F("Stored display settings reset: "));
  Serial.println(reason);
  quarantineStoredConfigFile(kDisplaySettingsPath,
                             kDisplaySettingsInvalidPath);
  saveDisplaySettings();
}

void loadDisplaySettings() {
  if (!filesystemReady || !LittleFS.exists(kDisplaySettingsPath)) return;
  File file = LittleFS.open(kDisplaySettingsPath, "r");
  if (!file) return;
  StaticJsonDocument<512> document;
  const auto error = deserializeJson(document, file);
  file.close();
  if (error || !document.is<JsonObject>()) {
    resetStoredDisplaySettings(F("malformed JSON"));
    return;
  }

  JsonObjectConst root = document.as<JsonObjectConst>();
  const StoredConfigSchema schema = inspectStoredConfigSchema(
      root, kDisplaySettingsSchemaVersion);
  if (schema.state == StoredConfigSchemaState::Newer) {
    resetStoredDisplaySettings(F("newer schema"));
    return;
  }
  if (schema.state == StoredConfigSchemaState::Older) {
    resetStoredDisplaySettings(F("unsupported older schema"));
    return;
  }
  if (schema.state == StoredConfigSchemaState::Invalid) {
    resetStoredDisplaySettings(F("invalid schema"));
    return;
  }
  bool repaired = schema.legacy;
  const int brightness = root["brightness"] | 100;
  if (root["brightness"].is<int>() && brightness >= 0 && brightness <= 100) {
    displayBrightness = brightness;
  } else {
    repaired = true;
  }
  const int pixelShift = root["pixelShift"] | 0;
  if (root["pixelShift"].is<int>() && pixelShift >= 0 &&
      pixelShift <= kMaxPixelShift) {
    displayPixelShift = pixelShift;
  } else {
    repaired = true;
  }
  const float refreshRate = root["refreshRateHz"] | 60.0F;
  if (root["refreshRateHz"].is<float>() &&
      DisplayRefresh::valid(refreshRate)) {
    displayRefresh.setRate(refreshRate);
  } else {
    repaired = true;
  }
  if (!root["notificationPosition"].is<const char *>() ||
      !parseNotificationPosition(root["notificationPosition"],
                                 notificationPosition, display.width(),
                                 display.height())) {
    repaired = true;
  }
  const int maxVisible = root["notificationMaxVisible"] |
                         static_cast<int>(NotificationCenter::kCapacity);
  if (!root["notificationMaxVisible"].is<int>() ||
      !notifications.setMaxVisible(maxVisible)) {
    repaired = true;
  }
  if (root["notificationAuthEnabled"].is<bool>()) {
    notificationAuthEnabled = root["notificationAuthEnabled"];
  } else {
    repaired = true;
  }
  if (root["firmwareNotificationsEnabled"].is<bool>()) {
    firmwareNotificationsEnabled = root["firmwareNotificationsEnabled"];
  } else {
    repaired = true;
  }
  const int duration = root["firmwareNoticeDurationSeconds"] |
                       static_cast<int>(kDefaultFirmwareNoticeDurationSeconds);
  if (root["firmwareNoticeDurationSeconds"].is<int>() && duration >= 5 &&
      duration <= 300) {
    firmwareNoticeDurationSeconds = duration;
  } else {
    repaired = true;
  }
  const int reminder = root["firmwareReminderHours"] |
                       static_cast<int>(kDefaultFirmwareReminderHours);
  if (root["firmwareReminderHours"].is<int>() && reminder >= 1 &&
      reminder <= kMaximumFirmwareReminderHours) {
    firmwareReminderHours = reminder;
  } else {
    repaired = true;
  }
  const char *availableVersion = root["firmwareAvailableVersion"] | "";
  FirmwareVersion available;
  if ((!availableVersion[0] ||
       parseFirmwareVersion(availableVersion, available)) &&
      strlen(availableVersion) < sizeof(firmwareAvailableVersion)) {
    strlcpy(firmwareAvailableVersion, availableVersion,
            sizeof(firmwareAvailableVersion));
  } else {
    repaired = true;
  }
  if (root["firmwareLastNoticeEpoch"].is<uint32_t>()) {
    firmwareLastNoticeEpoch = root["firmwareLastNoticeEpoch"];
  } else {
    repaired = true;
  }
  const char *timezone = root["timezone"] | kDefaultTimezone;
  if (root["timezone"].is<const char *>() &&
      ::timezoneValid(timezone, sizeof(displayTimezone))) {
    strlcpy(displayTimezone, timezone, sizeof(displayTimezone));
  } else {
    repaired = true;
  }
  updatePixelShift();
  pixelShiftAt = millis();
  if (repaired) saveDisplaySettings();
}

bool saveDisplaySettings() {
  if (!filesystemReady) return false;
  File file = LittleFS.open(kDisplaySettingsTempPath, "w");
  if (!file) return false;
  StaticJsonDocument<512> document;
  document["schemaVersion"] = kDisplaySettingsSchemaVersion;
  document["brightness"] = daytimeBrightness;
  document["pixelShift"] = displayPixelShift;
  document["refreshRateHz"] = displayRefresh.rate();
  document["notificationPosition"] = notificationPositionName(notificationPosition);
  document["notificationMaxVisible"] = notifications.maxVisible();
  document["notificationAuthEnabled"] = notificationAuthEnabled;
  document["firmwareNotificationsEnabled"] = firmwareNotificationsEnabled;
  document["firmwareNoticeDurationSeconds"] =
      firmwareNoticeDurationSeconds;
  document["firmwareReminderHours"] = firmwareReminderHours;
  document["firmwareAvailableVersion"] = firmwareAvailableVersion;
  document["firmwareLastNoticeEpoch"] = firmwareLastNoticeEpoch;
  document["timezone"] = displayTimezone;
  if (serializeJson(document, file) == 0) {
    file.close();
    LittleFS.remove(kDisplaySettingsTempPath);
    return false;
  }
  file.close();
  LittleFS.remove(kDisplaySettingsPath);
  return LittleFS.rename(kDisplaySettingsTempPath, kDisplaySettingsPath);
}

bool timezoneValid(const char *value) {
  return ::timezoneValid(value, sizeof(displayTimezone));
}

void applyTimezone() {
  setenv("TZ", displayTimezone, 1);
  tzset();
}

void loadNetworkSettings() {
  ::loadNetworkSettings(networkSettings, filesystemReady);
}

bool saveNetworkSettings() {
  return ::saveNetworkSettings(networkSettings, filesystemReady);
}

bool networkExtrasValid(const JsonDocument &document) {
  return ::networkExtrasValid(document, networkSettings);
}

void updateNetworkExtras(const JsonDocument &document) {
  ::updateNetworkExtras(document, networkSettings);
}

bool configValid() {
  return deviceConfigValid(config);
}

bool wifiConfigured() { return ::wifiConfigured(config); }

void loadConfig() {
  loadDeviceConfig(config);
}

void saveConfig() {
  saveDeviceConfig(config);
}

String deviceSuffix() { return ::deviceSuffix(); }

String configuredHostname() {
  return ::configuredHostname(config);
}

const char *configuredUsername() {
  return ::configuredUsername(config);
}

bool usernameValid(const char *username) {
  return ::usernameValid(username);
}

const char *disconnectReason() {
  if (reconnectCount == 0) return "None";
  switch (lastDisconnectStatus) {
    case WL_NO_SSID_AVAIL:
      return "Network not found";
    case WL_CONNECT_FAILED:
      return "Authentication failed";
    case WL_CONNECTION_LOST:
      return "Connection lost";
    case WL_DISCONNECTED:
      return "Disconnected";
    default:
      return "Unknown";
  }
}

void configureIpAddress() {
  ::configureIpAddress(networkSettings);
}

void configureTimeService() {
  ::configureTimeService(networkSettings, displayTimezone);
}

String currentNtpServer() {
  return ::currentNtpServer(networkSettings);
}

bool hostnameValid(const char *hostname) {
  return ::hostnameValid(hostname);
}

bool directOtaAuthenticated() {
  if (!configValid()) {
    if (accessPointRunning) return true;
    server.send(403, "text/plain", "Setup mode is not active");
    return false;
  }
  if (!config.directOtaEnabled) {
    server.send(403, "text/plain", "Direct OTA is disabled");
    return false;
  }
  if (!config.otaAuthEnabled) return true;
  if (server.authenticate(configuredUsername(), config.otaPassword)) return true;
  server.requestAuthentication();
  return false;
}

bool webAuthenticated() {
  if (accessPointRunning) return true;
  if (!config.apiAuthEnabled) return true;
  if (server.authenticate(configuredUsername(), config.apiPassword)) return true;
  server.requestAuthentication();
  return false;
}

bool apiAccessAllowed(bool requirePassword) {
  const auto policy = apiAccessPolicy(accessPointRunning, configValid(), requirePassword, config.apiPassword[0]);
  if (policy == ApiAccessPolicy::SetupMode) {
    server.send(403, "application/json", "{\"error\":\"setup_mode\"}");
    return false;
  }
  if (policy == ApiAccessPolicy::NotConfigured) {
    server.send(403, "application/json", "{\"error\":\"not_configured\"}");
    return false;
  }
  if (policy == ApiAccessPolicy::Open) return true;
  if (policy == ApiAccessPolicy::PasswordMissing) {
    server.send(403, "application/json", "{\"error\":\"password_not_configured\"}");
    return false;
  }
  char expected[sizeof(config.apiPassword) + 8];
  snprintf(expected, sizeof(expected), "Bearer %s", config.apiPassword);
  if (server.header("Authorization") == expected) return true;
  if (server.authenticate(configuredUsername(), config.apiPassword)) return true;
  server.requestAuthentication();
  return false;
}

bool apiAuthenticated() { return apiAccessAllowed(config.apiAuthEnabled); }

ImageAssetApi imageAssetApi(server, filesystemReady, apiAuthenticated);

void sendJsonError(int status, const __FlashStringHelper *error,
                   const __FlashStringHelper *message) {
  StaticJsonDocument<256> document;
  document["error"] = error;
  document["message"] = message;
  String body;
  body.reserve(192);
  serializeJson(document, body);
  server.send(status, "application/json", body);
}

void applyBacklight() {
  pinMode(TFT_BL, OUTPUT);
  if (!displayOn || displayBrightness == 0) {
    digitalWrite(TFT_BL, !TFT_BACKLIGHT_ON);
    return;
  }
  #if defined(ESP8266)
  analogWriteRange(100);
  const int pwm = TFT_BACKLIGHT_ON == LOW ? 100 - displayBrightness
                                          : displayBrightness;
  #else
  analogWriteResolution(TFT_BL, 8);
  const int brightness = map(displayBrightness, 0, 100, 0, 255);
  const int pwm = TFT_BACKLIGHT_ON == LOW ? 255 - brightness : brightness;
  #endif
  analogWrite(TFT_BL, pwm);
}

void updateClockNightMode() {
  const time_t now = time(nullptr);
  if (now < 1000000000) return;
  if (clockNightOverride >= 0 && now >= clockNightOverrideUntil)
    clockNightOverride = -1;
  struct tm local{};
  localtime_r(&now, &local);
  clockNightMode = clockNightOverride >= 0
      ? clockNightOverride != 0 : clockNightHour(local.tm_hour);
  const uint8_t brightness = clockBrightness(daytimeBrightness, clockNightMode);
  if (brightness != displayBrightness) {
    displayBrightness = brightness;
    applyBacklight();
  }
}

void setClockValue(const char *name, const char *text) {
  DashboardValue *slot = dashboardValues.find(name, true);
  if (!slot || (slot->available && strcmp(slot->state, text) == 0)) return;
  strlcpy(slot->state, text, sizeof(slot->state));
  slot->available = true;
  pendingChangedValues |= 1UL << dashboardValues.indexOf(slot);
}

bool clockMusicReady() {
  const DashboardValue *playing = dashboardValues.find("music_playing", false);
  return clockMusicAvailable(millis(), lastMusicUpdateAt, hasMusicUpdate,
      playing && playing->available && strcmp(playing->state, "true") == 0);
}

void updateStandaloneClock() {
  const time_t now = time(nullptr);
  if (now < 1000000000) return;
  updateClockNightMode();
  static time_t dateMinute = 0;
  if (now / 60 != dateMinute) {
    dateMinute = now / 60;
    struct tm local{};
    localtime_r(&now, &local);
    static const char *days[] = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};
    static const char *months[] = {"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"};
    char date[48];
    snprintf(date, sizeof(date), "%s, %d %s", days[local.tm_wday], local.tm_mday, months[local.tm_mon]);
    setClockValue("date", date);
  }
  if (!pageTransitionActive && pendingPageIndex < 0 && !samHomePod.receiving())
    standaloneWeather.update(setClockValue);
  if (clockNativePollAllowed(pageTransitionActive, pendingPageIndex, samHomePod.receiving())) {
    // Compiled scenes own their strings; release the disposable JSON tree
    // after all render views have ended, before large HomePod allocations.
    pageDefinition.clear();
    samHomePod.update([](const char *name, const char *text) {
      if (strcmp(name, "music_playing") == 0) {
        lastMusicUpdateAt = millis();
        hasMusicUpdate = true;
      }
      setClockValue(name, text);
    }, [](const char *id) {
      for (uint8_t i = 0; i < dashboardPageCount; ++i)
        if (strcmp(dashboardPages[i].id, id) == 0) {
          pendingPageIndex = i;
          break;
        }
    }, !standaloneWeather.busy());
    if (samHomePod.artworkChanged() && dashboardPageCount &&
        strcmp(dashboardPages[activePageIndex].id, "music") == 0)
      invalidateSceneRegion({61, 40, 118, 118}, true);
  }
  if (dashboardPageCount && pendingPageIndex < 0 &&
      strcmp(dashboardPages[activePageIndex].id, "music") == 0 &&
      !clockMusicReady()) {
    for (uint8_t i = 0; i < dashboardPageCount; ++i)
      if (strcmp(dashboardPages[i].id, "clock") == 0) {
        pendingPageIndex = i;
        break;
      }
  }
}

void requestFullRender(uint16_t delayMs = 0) {
  fullRenderPending = true;
  fullRenderNotBefore = millis() + delayMs;
}

void showCurrentPage() {
  if (dashboardPageCount) {
    if (renderDashboardPage()) {
      fullRenderPending = false;
      fullRenderNotBefore = 0;
      return;
    }
    // Rendering needs a contiguous JSON allocation. HTTP handling can
    // temporarily fragment the small ESP8266 heap, so preserve the last good
    // frame and retry after request-owned buffers have been released.
    requestFullRender(kRenderRetryDelayMs);
    return;
  }
  display.fillScreen(TFT_BLACK);
  if (display.fontLoaded) display.unloadFont();
  displayFontState = FontRenderState{};
  display.setTextDatum(MC_DATUM);
  display.setFreeFont(builtInFontFor("sans-bold", 1));
  display.setTextColor(TFT_WHITE, TFT_BLACK);
  display.drawString("MINI-DISPLAY", 120, 92);
  display.setFreeFont(builtInFontFor("sans-bold", 0));
  display.setTextColor(TFT_YELLOW, TFT_BLACK);
  display.drawString("WAITING FOR DASHBOARD", 120, 135);
  paintNotification(display, notifications, 0, 0);
}

DashboardValue *findValue(const char *source, bool create) {
  return dashboardValues.find(source, create);
}

void applyDisplayFont(const RenderFont &font) {
  applyRenderFont(display, font, displayFontState);
}

void drawStartupText(const String &text, int16_t y, uint8_t font,
                     uint16_t color) {
  const uint8_t size = font >= 4 ? 1 : 0;
  applyDisplayFont(
      RenderFont{builtInFontFor("sans-bold", size), -1, size});
  display.setTextColor(color);
  display.drawString(text, 120, y);
}

void resetMarqueeTitles() {
  marqueeTitleCount = 0;
}

void drawMarqueeTitle(MarqueeTitle &item, int16_t offset) {
  if (pageTransitionActive) return;
  if (!activeSceneReady || !activeScene) return;
  const int16_t index = activeScene->graph.findById(item.sceneNodeId);
  if (index < 0) return;
  SceneNode &node = activeScene->graph.node(index);
  activeScene->texts[node.payloadIndex].marqueeOffset = offset;
  invalidateSceneBand(node.clip);
  // Recompose the background and overlapping cards before pushing the tile.
  // Never erase a title with a flat rectangle directly on the LCD.
  item.drawnOffset = offset;
}


void updateMarqueeTitles() {
  if (pageTransitionActive) return;
  if (!displayOn || displayBrightness == 0 || marqueeTitleCount == 0 ||
      !activeSceneReady || !activeScene || !displayRefresh.ready(millis())) return;
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::Marquee);
  const uint32_t now = millis();
  bool anyChanged = false;
  for (uint8_t index = 0; index < marqueeTitleCount; ++index) {
    MarqueeTitle &item = marqueeTitles[index];
    if (!stepMarquee(item, now)) continue;
    drawMarqueeTitle(item, item.drawnOffset);
    anyChanged = true;
  }
  if (!anyChanged) return;
  // Recompose all dirty text regions together. The main loop gives page and
  // data work priority before the next marquee frame.
  if (!renderPendingScene(*activeScene)) requestFullRender();
  // Rendering can take longer than one display interval on image-backed pages.
  // Count that work as frame time instead of adding another idle interval.
  displayRefresh.completed(now);
}

bool compileScenePage(JsonObjectConst source, ScenePage &page) {
  return sceneCompiler.compile(source, page);
}

void invalidateSceneBand(const SceneRect &bounds, uint8_t expansion) {
  const int16_t left = max<int16_t>(
      0, bounds.x + pixelShiftX - expansion);
  const int16_t right = min<int16_t>(
      240, bounds.right() + pixelShiftX + expansion);
  const int16_t top = max<int16_t>(
      0, ((bounds.y + pixelShiftY - expansion) / kSceneUpdateBandHeight) *
             kSceneUpdateBandHeight);
  const int16_t bottom = min<int16_t>(
      240, ((bounds.bottom() + pixelShiftY + expansion +
             kSceneUpdateBandHeight - 1) /
            kSceneUpdateBandHeight) * kSceneUpdateBandHeight);
  if (right > left && bottom > top) {
    sceneScheduler.invalidate(
        {left, top, static_cast<int16_t>(right - left),
         static_cast<int16_t>(bottom - top)});
  }
}

void invalidateSceneRegion(const SceneRect &bounds, bool exact) {
  (void)exact;
  invalidateSceneBand(bounds, 1);
}

bool invalidateChangedSceneSources(const ScenePage &scene,
                                   uint32_t changedValues) {
  bool affected = false;
  for (uint8_t nodeIndex = 0; nodeIndex < scene.graph.size(); ++nodeIndex) {
    const SceneNode &node = scene.graph.node(nodeIndex);
    if ((node.sourceMask & changedValues) == 0) continue;
    affected = true;
    invalidateSceneBand(node.bounds, 2);
  }
  return affected;
}

bool renderPendingScene(const ScenePage &scene) {
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::SceneRender);
  if (!sceneScheduler.pending() && !sceneScheduler.rendering()) return true;
  if (!displayRefresh.ready(millis())) return true;
#if defined(ESP8266)
  if (display.fontLoaded) display.unloadFont();
  displayFontState = FontRenderState{};
  std::unique_ptr<SceneUpdatePainter> painter(
      new (std::nothrow) SceneUpdatePainter(display));
  if (!painter || !painter->begin()) return false;
  MINI_DISPLAY_PROFILE_MEMORY(RuntimeProfilePoint::SceneRender);
  auto &band = painter->band;
  auto &font = painter->font;
  auto &images = painter->images;
  images.setCooperativeYield(!animatedFrameRenderActive);
  while (sceneScheduler.beginFrame() || sceneScheduler.rendering()) {
    SceneRect tile;
    while (sceneScheduler.nextTile(tile)) {
      if (tile.width <= 0 || tile.width > 240 ||
          tile.height <= 0 || tile.height > kSceneUpdateBandHeight) {
        band.deleteSprite();
        return false;
      }
      {
        MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::SceneTilePaint);
        band.fillSprite(scene.background);
        paintScenePage(band, scene, pixelShiftX - tile.x,
                       pixelShiftY - tile.y, 0, 0, tile.width, tile.height,
                       font, &images);
        paintNotification(band, notifications, -tile.x, -tile.y);
      }
      {
        MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::SpiTransfer);
        uint16_t *pixels = static_cast<uint16_t *>(band.getPointer());
        if (!packTransitionPixels(
                pixels, 240 * kSceneUpdateBandHeight, 240, tile.width,
                tile.height)) {
          band.deleteSprite();
          return false;
        }
        displayScrollBuffer.pushLogical(
            tile.x, tile.y, tile.width, tile.height, pixels);
      }
      if (!animatedFrameRenderActive) yield();
    }
  }
  if (band.fontLoaded) band.unloadFont();
  band.deleteSprite();
  displayRefresh.completed(millis());
  return true;
#else
  paintScenePage(display, scene, pixelShiftX, pixelShiftY, 0, 0, 240, 240,
                 displayFontState);
  paintNotification(display, notifications, 0, 0);
  displayRefresh.completed(millis());
  return true;
#endif
}

void updateNotifications() {
  if ((!notifications.active() && notificationPaintedBounds.empty()) || !displayOn ||
      !displayBrightness || !displayRefresh.ready(millis()) || millis() - notificationFrameAt < 33) return;
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::Notification);
  const bool wasActive = notifications.active();
  bool animate = displayRefresh.intervalMs() < 120;
#if defined(ESP8266)
  // Repainting every animation frame temporarily needs the compositor band,
  // image cache and Wi-Fi SDK heap at the same time. Degrade to one-step
  // presentation before the allocator becomes fragmented or starves Wi-Fi.
  animate = animate && ESP.getFreeHeap() >= 20 * 1024 &&
            ESP.getMaxFreeBlockSize() >= 8 * 1024;
#endif
  notifications.advance(millis(), display.width(), display.height(), animate,
      prepareNotification);
  const SceneRect next = notifications.bounds();
  const bool changed = notifications.revision() != notificationPaintedRevision ||
      next.x != notificationPaintedBounds.x || next.y != notificationPaintedBounds.y ||
      next.width != notificationPaintedBounds.width || next.height != notificationPaintedBounds.height;
  bool painted = true;
  if (changed) {
    SceneRect damage = clipSceneRect(sceneRectUnion(next, notificationPaintedBounds), display.width(), display.height());
    if (!damage.empty()) {
      // Overlay coordinates are physical pixels and never inherit pixel shift.
      const int16_t top =
          (damage.y / kSceneUpdateBandHeight) * kSceneUpdateBandHeight;
      const int16_t bottom = std::min<int16_t>(
          display.height(),
          (damage.bottom() + kSceneUpdateBandHeight - 1) /
              kSceneUpdateBandHeight * kSceneUpdateBandHeight);
      sceneScheduler.invalidate({0, top, static_cast<int16_t>(display.width()), static_cast<int16_t>(bottom - top)});
      if (activeSceneReady && activeScene) {
        painted = renderPendingScene(*activeScene);
      } else {
        // Notifications also work before any dashboard has been configured.
#if defined(ESP8266)
        std::unique_ptr<SceneUpdatePainter> painter(new (std::nothrow) SceneUpdatePainter(display));
        painted = painter && painter->begin();
        if (painted) {
          for (int16_t y = top; y < bottom; y += kSceneUpdateBandHeight) {
            painter->band.fillSprite(TFT_BLACK);
            if (!dashboardPageCount) {
              painter->band.setTextDatum(MC_DATUM);
              painter->band.setFreeFont(builtInFontFor("sans-bold", 1));
              painter->band.setTextColor(TFT_WHITE, TFT_BLACK);
              painter->band.drawString("MINI-DISPLAY", 120, 92 - y);
              painter->band.setFreeFont(builtInFontFor("sans-bold", 0));
              painter->band.setTextColor(TFT_YELLOW, TFT_BLACK);
              painter->band.drawString("WAITING FOR DASHBOARD", 120, 135 - y);
            }
            paintNotification(painter->band, notifications, 0, -y);
            displayScrollBuffer.pushLogical(
                0, y, 240, kSceneUpdateBandHeight,
                static_cast<uint16_t *>(painter->band.getPointer()));
            yield();
          }
          displayRefresh.completed(millis());
        }
#else
        display.fillRect(0, top, display.width(), bottom - top, TFT_BLACK);
        paintNotification(display, notifications, 0, 0);
        displayRefresh.completed(millis());
#endif
      }
    }
  }
  if (painted) {
    notificationPaintedBounds = next;
    notificationPaintedRevision = notifications.revision();
    notifications.presented(millis());
    if (wasActive && !notifications.active()) {
      if (!activeSceneReady) requestFullRender();
    }
  }
  notificationFrameAt = millis();
}

void updateFirmwareNotificationReminder() {
  const uint32_t nowMs = millis();
  if (static_cast<int32_t>(nowMs - firmwareNoticeRetryAt) < 0 ||
      !firmwareNotificationsEnabled ||
      strcmp(kHardwareProfile, "juzipi-sd-pro") != 0 ||
      !newerFirmwareVersion(firmwareAvailableVersion, kFirmwareVersion) ||
      !displayOn || !displayBrightness ||
      notifications.count() == NotificationCenter::kCapacity) {
    return;
  }
  const time_t now = time(nullptr);
  if (now <= 1000000000) {
    firmwareNoticeRetryAt = nowMs + kFirmwareNoticeRetryMs;
    return;
  }
  const uint32_t nowEpoch = static_cast<uint32_t>(now);
  const uint32_t reminderSeconds =
      static_cast<uint32_t>(firmwareReminderHours) * 60U * 60U;
  if (firmwareLastNoticeEpoch && nowEpoch >= firmwareLastNoticeEpoch &&
      nowEpoch - firmwareLastNoticeEpoch < reminderSeconds) {
    firmwareNoticeRetryAt =
        nowMs + min<uint32_t>(kFirmwareNoticeRetryMs,
                              (reminderSeconds -
                               (nowEpoch - firmwareLastNoticeEpoch)) *
                                  1000U);
    return;
  }
  std::unique_ptr<DisplayNotification> item(
      new (std::nothrow) DisplayNotification());
  if (!item) {
    firmwareNoticeRetryAt = nowMs + kFirmwareNoticeRetryMs;
    return;
  }
  strlcpy(item->title, "Firmware update", sizeof(item->title));
  snprintf(item->message, sizeof(item->message), "Version %s is available",
           firmwareAvailableVersion);
  item->durationMs =
      static_cast<uint32_t>(firmwareNoticeDurationSeconds) * 1000U;
  item->position = notificationPosition;
  item->severity = NotificationSeverity::Info;
  item->icon = NotificationIcon::Info;
  prepareNotification(*item, display.width(), display.height());
  if (!notifications.enqueue(std::move(item))) {
    firmwareNoticeRetryAt = nowMs + kFirmwareNoticeRetryMs;
    return;
  }
  firmwareLastNoticeEpoch = nowEpoch;
  firmwareNoticeRetryAt = nowMs + kFirmwareNoticeRetryMs;
  saveDisplaySettings();
}

bool renderDashboardPage() { return renderDashboardPage(nullptr); }

bool loadPageDefinition(uint8_t index) {
  if (pageDefinition.contains(index)) return true;
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::PageLoad);
  File file = LittleFS.open(kDashboardPath, "r");
  if (!file) return false;
  return pageDefinition.load(file, index);
}

bool renderDashboardPage(const uint32_t *changedValues, bool clear) {
  lastRenderFailure = RenderFailure::None;
  if (!filesystemReady || !LittleFS.exists(kDashboardPath) ||
      activePageIndex >= dashboardPageCount) {
    lastRenderFailure = RenderFailure::DashboardUnavailable;
    return false;
  }
  const bool partial = changedValues != nullptr && activeSceneReady &&
                       activeScenePage == activePageIndex;
  const bool preserveAnimations = activeSceneReady &&
                                  activeScenePage == activePageIndex;
  const bool preserveMarquees =
      marqueeTitleCount > 0 && (changedValues != nullptr || !clear);
  {
  recordFreeHeap();
  if (!loadPageDefinition(activePageIndex)) {
    lastRenderFailure = RenderFailure::Json;
    return false;
  }
  JsonObjectConst page = pageDefinition.page();
  if (!activeScene) activeScene.reset(new (std::nothrow) ScenePage());
  if (!activeScene) {
    lastRenderFailure = RenderFailure::SceneAllocation;
    return false;
  }
  if (partial) {
    if (!invalidateChangedSceneSources(*activeScene, *changedValues)) {
      return true;
    }
  } else {
    sceneScheduler.invalidate({0, 0, 240, 240});
  }
  if (!compileScenePage(page, *activeScene)) {
    activeSceneReady = false;
    lastRenderFailure = RenderFailure::SceneCompilation;
    return false;
  }
  // New text can grow or move after fitting/mapping. Clear both old and new
  // bounds, not only the bounds compiled for the previous value.
  registerDashboardMarquees(page, *activeScene, preserveMarquees);
  animatedImages.bind(*activeScene, millis(), preserveAnimations);
  if (partial) invalidateChangedSceneSources(*activeScene, *changedValues);
  }
  if (!renderPendingScene(*activeScene)) {
    activeSceneReady = false;
    lastRenderFailure = RenderFailure::SceneAllocation;
    return false;
  }
  activeSceneReady = true;
  activeScenePage = activePageIndex;
  return true;
}

void updateAnimatedImages() {
  if (pageTransitionActive || !displayOn || !displayBrightness ||
      !activeSceneReady || !activeScene ||
      sceneScheduler.pending() ||
      !displayRefresh.ready(millis())) return;
  const bool changed = animatedImages.update(
      *activeScene, millis(), [](const SceneRect &bounds, bool exact) {
        invalidateSceneRegion(bounds, exact);
      });
  if (!changed) return;
  // Finish one GIF frame as one uninterrupted visual operation. Yielding
  // between bands exposes a moving refresh seam and makes frame time depend on
  // unrelated Wi-Fi work. Page transitions already pause this path entirely.
  animatedFrameRenderActive = true;
  const bool rendered = renderPendingScene(*activeScene);
  animatedFrameRenderActive = false;
  if (!rendered) requestFullRender();
  yield();
}

void registerDashboardMarquees(JsonObjectConst page, ScenePage &scene,
                               bool preserve) {
  struct Position {
    uint32_t nextActionAt;
    uint32_t contentHash;
    uint16_t id;
    int16_t offset;
    MarqueePhase phase;
  };
  uint8_t previousCount = preserve ? marqueeTitleCount : 0;
  std::unique_ptr<Position[]> previous(previousCount ? new (std::nothrow) Position[previousCount] : nullptr);
  if (!previous) previousCount = 0;
  for (uint8_t index = 0; index < previousCount; ++index) {
    const MarqueeTitle &item = marqueeTitles[index];
    previous[index] = {item.nextActionAt, item.contentHash, item.sceneNodeId,
                       item.drawnOffset, item.phase};
  }
  resetMarqueeTitles();
  {
    for (uint16_t index = 0; index < scene.graph.size(); ++index) {
      SceneNode &node = scene.graph.node(index);
      if (node.type != SceneNodeType::Text) continue;
      SceneText &text = scene.texts[node.payloadIndex];
      if (!text.marqueeIntervalMs || marqueeTitleCount >= kMaxMarqueeTitles) continue;
      RenderFont font{text.font, text.userFontSlot, text.userFontSize, text.smoothFont};
      font.coverage = text.coverageFont;
      applyDisplayFont(font);
      MarqueeTitle &item = marqueeTitles[marqueeTitleCount++];
      item = MarqueeTitle{};
      item.sceneNodeId = node.id;
      item.contentHash = marqueeContentHash(scene.textPool.data() + text.valueOffset);
      item.overflow = max<int16_t>(0, display.textWidth(scene.textPool.data() + text.valueOffset) - node.clip.width);
      item.loop = text.marqueeRepeat > 0;
      if (item.loop) item.overflow = text.marqueeRepeat;
      item.nextActionAt = millis() + kMarqueeStartPauseMs;
      item.intervalMs = text.marqueeIntervalMs;
      item.stepPixels = text.marqueeStepPixels;
      item.phase = MarqueePhase::PausedAtStart;
    }
  }
  for (uint8_t index = 0; index < marqueeTitleCount; ++index) {
    MarqueeTitle &item = marqueeTitles[index];
    for (uint8_t old = 0; old < previousCount; ++old) {
      if (previous[old].id != item.sceneNodeId || previous[old].contentHash != item.contentHash) continue;
      item.drawnOffset = constrain(previous[old].offset, 0, item.overflow);
      item.phase = previous[old].phase;
      item.nextActionAt = previous[old].nextActionAt;
      const int16_t node = scene.graph.findById(item.sceneNodeId);
      if (node >= 0)
        scene.texts[scene.graph.node(node).payloadIndex].marqueeOffset = item.drawnOffset;
      break;
    }
  }
}

void showPageWithTransition(uint8_t nextPageIndex) {
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::Transition);
  if (nextPageIndex >= dashboardPageCount || nextPageIndex == activePageIndex) {
    return;
  }
  // Never paint the music face from page rotation or a button before data arrives.
  if (strcmp(dashboardPages[nextPageIndex].id, "music") == 0 && !clockMusicReady()) {
    pageShownAt = millis();
    return;
  }
  const auto showWithoutTransition = [&]() {
    activePageIndex = nextPageIndex;
    showCurrentPage();
    // A skipped animation still starts a new, full page dwell interval.
    pageShownAt = millis();
  };
  const PageTransitionConfig &transition =
      dashboardPages[activePageIndex].transition;
  if (transition.type == PageTransitionType::None || notifications.active()) {
    showWithoutTransition();
    return;
  }
  if (!filesystemReady || !LittleFS.exists(kDashboardPath)) {
    showWithoutTransition();
    return;
  }
  if (!activeSceneReady || activeScenePage != activePageIndex) {
    if (!renderDashboardPage()) {
      showWithoutTransition();
      return;
    }
  }
  File file = LittleFS.open(kDashboardPath, "r");
  if (!file) {
    showWithoutTransition();
    return;
  }
  std::unique_ptr<ScenePage> nextPage(new (std::nothrow) ScenePage());
  if (!nextPage) {
    file.close();
    showWithoutTransition();
    return;
  }
  bool compiledNext = false;
  {
    // Each page is parsed separately so transitions never retain the complete
    // dashboard JSON tree in the small ESP8266 heap.
    recordFreeHeap();
    MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::PageLoad);
    if (pageDefinition.load(file, nextPageIndex)) {
      compiledNext = compileScenePage(pageDefinition.page(), *nextPage);
      if (compiledNext) registerDashboardMarquees(pageDefinition.page(), *nextPage);
    }
    MINI_DISPLAY_PROFILE_MEMORY(RuntimeProfilePoint::Transition);
  }
  file.close();
  if (!compiledNext) {
    nextPage.reset();
    showWithoutTransition();
    return;
  }
  std::unique_ptr<PageTransitionRenderer> renderer(
      new (std::nothrow) PageTransitionRenderer(
          display, displayOn, displayBrightness, applyBacklight,
          displayFontState, displayScrollBuffer));
  if (!renderer) {
    nextPage.reset();
    showWithoutTransition();
    return;
  }
  pageTransitionActive = true;
  renderer->render(*activeScene, *nextPage, transition, pixelShiftX,
                  pixelShiftY, displayRefresh.intervalMs());
  displayRefresh.completed(millis());
  strlcpy(lastTransitionType, renderer->lastTypeName(),
          sizeof(lastTransitionType));
  lastTransitionDurationMs = renderer->lastDurationMs();
  renderer.reset();
  pageTransitionActive = false;
  activeScene.swap(nextPage);
  activePageIndex = nextPageIndex;
  activeScenePage = nextPageIndex;
  activeSceneReady = true;
  animatedImages.bind(*activeScene, millis());
  for (uint8_t index = 0; index < marqueeTitleCount; ++index) {
    marqueeTitles[index].nextActionAt = millis() + kMarqueeStartPauseMs;
  }
  pendingChangedValues |= transitionDeferredValues;
  transitionDeferredValues = 0;
  pageShownAt = millis();
}

struct DashboardLoadFailure {
  const __FlashStringHelper *message = nullptr;
  bool retryable = false;
};

bool loadDashboardMetadata(Stream &stream, DashboardLoadFailure *failure = nullptr) {
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::DashboardValidation);
  if (failure) failure->message = F("Invalid dashboard structure");
  const auto reject = [&](const __FlashStringHelper *message, bool retryable = false) {
    if (failure) { failure->message = message; failure->retryable = retryable; }
    return false;
  };
  StaticJsonDocument<768> filter;
  filter["version"] = true;
  filter["pages"][0]["id"] = true;
  filter["pages"][0]["durationSeconds"] = true;
  filter["pages"][0]["transition"] = true;
  filter["pages"][0]["backgroundImage"] = true;
  filter["pages"][0]["layout"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["type"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["source"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["showSeconds"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["image"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["backgroundImage"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["imageFit"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["frame"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["titleFrame"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["valueFrame"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["graph"] = true;
  filter["pages"][0]["rows"][0]["cards"][0]["weather"] = true;
  filter["defaults"]["pageDurationSeconds"] = true;
  filter["transition"] = true;

  DynamicJsonDocument document(6144);
  recordFreeHeap();
  const auto error = deserializeJson(
      document, stream, DeserializationOption::Filter(filter));
  if (error) {
    if (error == DeserializationError::NoMemory) {
      return document.capacity() == 0
          ? reject(F("Not enough free memory to validate dashboard; retry shortly"), true)
          : reject(F("Dashboard metadata exceeds device memory limit"));
    }
    return reject(F("Malformed dashboard JSON"));
  }
  const StoredConfigSchema schema = inspectStoredConfigSchema(
      document.as<JsonObjectConst>(), 1, "version");
  if (schema.state == StoredConfigSchemaState::Newer) {
    return reject(F("Dashboard schema is newer than this firmware"));
  }
  if (schema.state == StoredConfigSchemaState::Older) {
    return reject(F("Dashboard schema migration is unavailable"));
  }
  if (schema.state == StoredConfigSchemaState::Invalid || schema.legacy) {
    return reject(F("Invalid dashboard schema version"));
  }
  if (!document["pages"].is<JsonArray>()) {
    return false;
  }

  const uint32_t defaultSeconds =
      document["defaults"]["pageDurationSeconds"] | 10;
  JsonArray pages = document["pages"].as<JsonArray>();
  if (pages.size() == 0 || pages.size() > kMaxPages) return false;
  if (!graphHistory.validate(pages)) return reject(F("Invalid graph settings"));

  PageTransitionConfig legacyTransition;
  if (!PageTransitionRenderer::parse(document["transition"], legacyTransition)) {
    return false;
  }
  uint8_t count = 0;
  for (JsonObject page : pages) {
    if (failure) failure->message = F("Invalid page id, duration, layout, transition or background image");
    const char *id = page["id"];
    if (id == nullptr || id[0] == '\0' || strlen(id) > 32) return false;
    const uint32_t seconds = page["durationSeconds"] | defaultSeconds;
    if (seconds == 0 || seconds > 86400) return false;
    PageTransitionConfig parsedTransition;
    if (!page["transition"].isNull() &&
        !PageTransitionRenderer::parse(page["transition"],
                                       parsedTransition)) {
      return false;
    }
    JsonArray rows = page["rows"].as<JsonArray>();
    const char *layout = page["layout"] | "rows";
    if (strcmp(layout, "free") && strcmp(layout, "rows")) return false;
    const bool freeLayout = strcmp(layout, "free") == 0;
    uint8_t cardCount = 0;
    uint16_t textBudget = 1 + rows.size();
    bool hasWeather = false;
    const char *pageImage = page["backgroundImage"] | "";
    if (pageImage[0] &&
        (!validImageAssetId(String(pageImage)) ||
         !LittleFS.exists(imageAssetPath(String(pageImage))))) return false;
    if (rows.size() == 0 || rows.size() > 6) return false;
    for (JsonObject row : rows) {
      JsonArray cards = row["cards"].as<JsonArray>();
      if ((!freeLayout && cards.size() == 0) || cards.size() > (freeLayout ? kMaxSceneCards : 3)) return false;
      cardCount += cards.size();
      if (cardCount > kMaxSceneCards) return false;
      for (JsonObject card : cards) {
        if (failure) failure->message = F("Invalid card settings, placement, count or image");
        if (freeLayout) {
          for (const char *name : {"frame", "titleFrame", "valueFrame"}) {
            if (strcmp(name, "frame") && !card.containsKey(name)) continue;
            if (!validFreeTextFrame(card[name])) return false;
          }
        }
        const char *type = card["type"];
        if (type == nullptr ||
            (strcmp(type, "clock") != 0 && strcmp(type, "number") != 0 &&
             strcmp(type, "status") != 0 && strcmp(type, "text") != 0 &&
             strcmp(type, "image") != 0 && strcmp(type, "chart") != 0 && strcmp(type, "weather") != 0)) {
          return false;
        }
        const bool needsSource = strcmp(type, "number") == 0 ||
                                 strcmp(type, "status") == 0;
        if (needsSource && card["source"].isNull()) return false;
        if (strcmp(type, "weather") == 0) {
          hasWeather = true;
          JsonArray weatherSources = card["weather"]["sources"];
          if (weatherSources.isNull() || weatherSources.size() < 1 || weatherSources.size() > 5) return false;
          for (JsonVariant weatherSource : weatherSources)
            if (!weatherSource.is<const char *>() || strlen(weatherSource.as<const char *>()) > 64) return false;
          JsonArray fields = card["weather"]["fields"];
          if (!card["weather"]["fields"].isNull() && fields.isNull()) return false;
          if (!fields.isNull() && (fields.size() == 0 || fields.size() > 8)) return false;
          for (JsonVariant field : fields) {
            if (!field.is<const char *>()) return false;
            const char *name = field.as<const char *>();
            if (strcmp(name, "icon") && strcmp(name, "condition") &&
                strcmp(name, "temperature") && strcmp(name, "low") &&
                strcmp(name, "label") && strcmp(name, "humidity") &&
                strcmp(name, "precipitation") && strcmp(name, "wind")) return false;
          }
          textBudget += 1 + weatherSources.size() * (fields.isNull() ? 3 : fields.size());
        } else {
          textBudget += 2;
        }
        if (strcmp(type, "image") == 0 && card["image"].isNull()) return false;
        const char *image = strcmp(type, "image") == 0
                                ? card["image"] | ""
                                : strcmp(card["backgroundMode"] | "", "image") == 0 ||
                                          card["backgroundMode"].isNull()
                                      ? card["backgroundImage"] | ""
                                      : "";
        if (image[0] &&
            (!validImageAssetId(String(image)) ||
             !LittleFS.exists(imageAssetPath(String(image))))) return false;
        const char *fit = card["imageFit"] | "cover";
        if (strcmp(fit, "cover") != 0 && strcmp(fit, "contain") != 0 &&
            strcmp(fit, "stretch") != 0) return false;
      }
    }
    if (hasWeather && textBudget > kMaxSceneTexts) return reject(F("Too many weather details on one page"));
    ++count;
  }

  if (!graphHistory.configure(pages)) {
    return reject(F("Not enough free memory for graph history"), true);
  }
  // GraphPaintConfig retains pointers into GraphHistory. A successful
  // reconfiguration replaces that storage, so no compiled scene may be
  // painted again until it has resolved the new series addresses.
  activeSceneReady = false;
  activeScenePage = 0xff;
  pendingPageIndex = -1;
  count = 0;
  for (JsonObject page : pages) {
    DashboardPage &parsed = dashboardPages[count++];
    strlcpy(parsed.id, page["id"], sizeof(parsed.id));
    const uint32_t seconds = page["durationSeconds"] | defaultSeconds;
    parsed.durationMs = seconds * 1000UL;
    parsed.hasClock = false;
    parsed.clockShowsSeconds = false;
    for (JsonObject row : page["rows"].as<JsonArray>()) {
      for (JsonObject card : row["cards"].as<JsonArray>()) {
        if (strcmp(card["type"] | "", "clock") == 0) {
          parsed.hasClock = true;
          parsed.clockShowsSeconds =
              parsed.clockShowsSeconds || (card["showSeconds"] | false);
        }
      }
    }
    if (page["transition"].isNull()) {
      parsed.transition = legacyTransition;
    } else {
      PageTransitionRenderer::parse(page["transition"], parsed.transition);
    }
  }
  for (uint8_t index = count; index < kMaxPages; ++index) {
    memset(&dashboardPages[index], 0, sizeof(dashboardPages[index]));
  }
  dashboardPageCount = count;
  if (activePageIndex >= dashboardPageCount) activePageIndex = 0;
  pageShownAt = millis();
  return true;
}

void loadStoredDashboard() {
  if (!filesystemReady || !LittleFS.exists(kDashboardPath)) return;
  File file = LittleFS.open(kDashboardPath, "r");
  if (!file) return;
  DashboardLoadFailure failure;
  const bool valid = loadDashboardMetadata(file, &failure);
  file.close();
  if (valid) return;
  Serial.print(F("Stored dashboard rejected: "));
  Serial.println(failure.message ? failure.message
                                 : F("invalid dashboard metadata"));
  if (failure.retryable) return;
  pageDefinition.clear();
  graphHistory.reset();
  activeScene.reset();
  activeSceneReady = false;
  activeScenePage = 0xff;
  dashboardPageCount = 0;
  activePageIndex = 0;
  quarantineStoredConfigFile(kDashboardPath, kDashboardInvalidPath);
}

void sendApiInfo() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<384> document;
  document["deviceId"] = "sdpro-" + deviceSuffix();
  document["name"] = "Home Assistant Mini-Display";
  document["model"] = kHardwareModel;
  document["hardwareProfile"] = kHardwareProfile;
  document["firmwareVersion"] = kFirmwareVersion;
  document["apiVersion"] = 1;
  document["width"] = 240;
  document["height"] = 240;
  JsonArray capabilities = document.createNestedArray("capabilities");
  capabilities.add("dashboard-v1");
  capabilities.add("brightness");
  capabilities.add("pixel-shift");
  capabilities.add("page-control");
  capabilities.add("user-fonts");
  capabilities.add("image-assets");
  capabilities.add("animated-image-assets");
  if (ScreenCapture::supported()) capabilities.add("screenshot-bmp");
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  capabilities.add("https");
#endif
  String body;
  body.reserve(384);
  serializeJson(document, body);
  server.send(200, "application/json", body);
}

void sendApiCrash() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<512> document;
  writeCrashDiagnostics(document.to<JsonObject>());
  String body;
  serializeJson(document, body);
  server.send(200, "application/json", body);
}

#if MINI_DISPLAY_RUNTIME_PROFILE
void sendApiPerformance() {
  if (!apiAuthenticated()) return;
  runtimeProfiler.sampleMemory();
  const uint32_t cpuMHz = ESP.getCpuFreqMHz();
  char chunk[256];
  server.sendHeader("Cache-Control", "no-store");
  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  const int headerLength = snprintf(
      chunk, sizeof(chunk),
      "{\"cpuMHz\":%u,\"freeHeapBytes\":%lu,\"maximumFreeBlockBytes\":%lu,"
      "\"heapFragmentationPercent\":%u,\"minimumFreeHeapBytes\":%lu,"
      "\"minimumMaximumBlockBytes\":%lu,\"minimumFreeStackBytes\":%lu,"
      "\"metrics\":[",
      cpuMHz, static_cast<unsigned long>(ESP.getFreeHeap()),
      static_cast<unsigned long>(ESP.getMaxFreeBlockSize()),
      ESP.getHeapFragmentation(),
      static_cast<unsigned long>(runtimeProfiler.minimumFreeHeap()),
      static_cast<unsigned long>(runtimeProfiler.minimumLargestBlock()),
      static_cast<unsigned long>(runtimeProfiler.minimumFreeStack()));
  server.send(200, "application/json", "");
  server.sendContent(chunk, headerLength);
  for (uint8_t index = 0;
       index < static_cast<uint8_t>(RuntimeProfilePoint::Count); ++index) {
    const auto point = static_cast<RuntimeProfilePoint>(index);
    const RuntimeProfileMetric &metric = runtimeProfiler.metric(point);
    const uint64_t averageCycles =
        metric.count ? metric.totalCycles / metric.count : 0;
    const int length = snprintf(
        chunk, sizeof(chunk),
        "%s{\"name\":\"%s\",\"count\":%lu,\"lastUs\":%lu,"
        "\"averageUs\":%llu,\"maximumUs\":%lu,",
        index ? "," : "", RuntimeProfiler::name(point),
        static_cast<unsigned long>(metric.count),
        static_cast<unsigned long>(metric.lastCycles / cpuMHz),
        static_cast<unsigned long long>(averageCycles / cpuMHz),
        static_cast<unsigned long>(metric.maximumCycles / cpuMHz));
    server.sendContent(chunk, length);
    const int memoryLength = snprintf(
        chunk, sizeof(chunk),
        "\"minimumFreeHeapBytes\":%lu,\"minimumMaximumBlockBytes\":%lu,"
        "\"minimumFreeStackBytes\":%lu,\"maximumFragmentationPercent\":%u}",
        static_cast<unsigned long>(metric.minimumFreeHeap == UINT32_MAX
                                       ? 0 : metric.minimumFreeHeap),
        static_cast<unsigned long>(metric.minimumLargestBlock == UINT32_MAX
                                       ? 0 : metric.minimumLargestBlock),
        static_cast<unsigned long>(metric.minimumFreeStack == UINT32_MAX
                                       ? 0 : metric.minimumFreeStack),
        metric.maximumFragmentation);
    server.sendContent(chunk, memoryLength);
  }
  server.sendContent("]}");
  server.sendContent("");
}

void resetApiPerformance() {
  if (!apiAuthenticated()) return;
  runtimeProfiler.reset();
  server.send(204);
}
#endif

void sendApiStatus() {
  if (!apiAuthenticated()) return;
  server.sendHeader("Cache-Control", "no-store");
  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  server.send(200, "application/json", "");
  auto &response = jsonStreamWriter;
  response.begin();
  response.field("connected", WiFi.status() == WL_CONNECTED);
  response.field("ip", WiFi.status() == WL_CONNECTED
                           ? WiFi.localIP().toString()
                           : WiFi.softAPIP().toString());
  response.field("displayOn", displayOn);
  response.field("brightness", displayBrightness);
  response.field("dayBrightness", daytimeBrightness);
  response.field("nightMode", clockNightMode);
  response.field("nightSchedule", "Configured in ClockConfig.h");
  response.field("nativeWeather", true);
  response.field("weatherLastSuccess", static_cast<uint32_t>(standaloneWeather.lastSuccess()));
  response.field("nativeHomePod", true);
  response.field("nativeHomePodArtwork", samHomePod.artworkAvailable());
  response.field("nativeHomePodArtworkError", samHomePod.artworkError());
  response.field("nativeHomePodArtworkConversionMs", samHomePod.artworkConversionMillis());
  response.field("nativeHomePodArtworkEdge", samHomePod.artworkEdge());
  response.field("nativeHomePodConnected", samHomePod.connected());
  response.field("nativeHomePodPairingMs", samHomePod.pairingMillis());
  response.field("nativeHomePodPhase", samHomePod.phase());
  response.field("nativeHomePodRecordSpools", samHomePod.recordSpools());
  response.field("nativeHomePodSpoolMaxMs", samHomePod.recordSpoolMaxMillis());
  response.field("nativeHomePodStage", samHomePod.diagnostics().stage);
  response.field("nativeHomePodError", samHomePod.diagnostics().error);
  response.field("nativeHomePodTransportError", samHomePod.diagnostics().transport_error);
  response.field("nativeHomePodControlStatus", samHomePod.diagnostics().control_status);
  response.field("nativeHomePodMessages", samHomePod.diagnostics().messages);
  response.field("nativeHomePodEventRecords", samHomePod.diagnostics().event_records);
  response.field("nativeHomePodEventReplies", samHomePod.diagnostics().event_replies);
  response.field("nativeHomePodMetadata", samHomePod.diagnostics().metadata_present);
  response.field("nativeHomePodPeakAllocation", samHomePod.diagnostics().peak_frame_allocation);
  response.field("nativeHomePodMinimumHeap", samHomePod.minimumHeap());
  response.field("nativeHomePodRejectedRecord", samHomePod.diagnostics().rejected_record_bytes);
  response.field("nativeHomePodPendingFrame", samHomePod.diagnostics().pending_frame_bytes);
  response.field("nativeHomePodAllocationRejectReason", samHomePod.diagnostics().allocation_reject_reason);
  response.field("nativeHomePodLargestDataFrame", samHomePod.diagnostics().max_frame);
  response.field("pixelShift", displayPixelShift);
  response.field("refreshRateHz", displayRefresh.rate());
  response.field("notificationPosition",
                 notificationPositionName(notificationPosition));
  response.field("notificationCount", notifications.count());
  response.field("notificationMaxVisible", notifications.maxVisible());
  response.field("notificationAuthEnabled", notificationAuthEnabled);
  response.beginArray("notificationPositions");
  for (uint8_t index = 0;
       index < notificationPositionCount(display.width(), display.height());
       ++index) {
    response.element(
        notificationPositionName(static_cast<NotificationPosition>(index)));
  }
  response.end();
  response.field("timezone", displayTimezone);
  time_t now = time(nullptr);
  if (now > 1000000000) {
    struct tm localTime;
    localtime_r(&now, &localTime);
    char timeBuffer[9];
    char dateBuffer[11];
    formatClockTime(timeBuffer, localTime, true);
    formatIsoDate(dateBuffer, localTime);
    response.field("localTime", timeBuffer);
    response.field("localDate", dateBuffer);
  } else {
    response.field("localTime", "--:--:--");
    response.field("localDate", "Not synchronized");
  }
  response.field("ntpServer", currentNtpServer());
  response.field("ntpFromDhcp", networkSettings.ntpFromDhcp);
  response.field("timeSynchronized", now > 1000000000);
  response.field("ssid", config.ssid);
  response.field("hostname", configuredHostname());
  response.field("staticIpEnabled", networkSettings.staticIpEnabled);
  response.field("gateway", WiFi.gatewayIP().toString());
  response.field("dns1", WiFi.dnsIP(0).toString());
  response.field("dns2", WiFi.dnsIP(1).toString());
  response.field("wifiChannel",
                 WiFi.status() == WL_CONNECTED ? WiFi.channel() : 0);
  response.field("bssid",
                 WiFi.status() == WL_CONNECTED ? WiFi.BSSIDstr() : "");
  response.field("mac", WiFi.macAddress());
  response.field("reconnectCount", reconnectCount);
  response.field("lastDisconnectReason", disconnectReason());
  response.field("wifiRetryLimit", config.wifiRetryLimit
                                       ? config.wifiRetryLimit
                                       : kDefaultWifiRetryLimit);
  response.field("recoverySsid", "SDPRO-Setup-" + deviceSuffix());
  response.field("recoveryPasswordSet",
                 networkSettings.recoveryPassword[0] != '\0');
  response.field("apiAuthEnabled", config.apiAuthEnabled != 0);
  response.field("apiPasswordSet", config.apiPassword[0] != '\0');
  response.field("directOtaEnabled", config.directOtaEnabled != 0);
  response.field("otaAuthEnabled", config.otaAuthEnabled != 0);
  response.field("otaPasswordSet", config.otaPassword[0] != '\0');
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  response.field("httpsEnabled", tlsCertificates.enabled());
  response.field("httpsAvailable", tlsCertificates.ready());
  response.field("httpsPort", 443);
  response.field("tlsCertificateSource",
                 tlsCertificates.ready() ? tlsCertificates.source() : "none");
  response.field("tlsCertificateAlgorithm",
                 tlsCertificates.ready() ? "ECDSA P-256" : "none");
  response.field("tlsCertificateFingerprint", tlsCertificates.fingerprint());
#else
  response.field("httpsEnabled", false);
  response.field("httpsAvailable", false);
#endif
  response.field("filesystemReady", filesystemReady);
  uint32_t storageTotalBytes = 0;
  uint32_t storageUsedBytes = 0;
#if defined(ESP8266)
  FSInfo filesystemInfo;
  if (filesystemReady && LittleFS.info(filesystemInfo)) {
    storageTotalBytes = filesystemInfo.totalBytes;
    storageUsedBytes = filesystemInfo.usedBytes;
  }
#else
  if (filesystemReady) {
    storageTotalBytes = LittleFS.totalBytes();
    storageUsedBytes = LittleFS.usedBytes();
  }
#endif
  response.field("storageTotalBytes", storageTotalBytes);
  response.field("storageUsedBytes", storageUsedBytes);
  response.field("storageFreeBytes",
                 storageTotalBytes > storageUsedBytes
                     ? storageTotalBytes - storageUsedBytes
                     : 0);
  response.field("defaultFont", userFonts.activeSlot() < 0
                                    ? "builtin"
                                    : userFonts.activeSlot() == 0 ? "font1"
                                                                  : "font2");
  response.beginArray("fonts");
  for (uint8_t index = 0; index < kUserFontSlots; ++index) {
    const UserFontSlotInfo &info = userFonts.slot(index);
    response.beginObject();
    response.field("id", index == 0 ? "font1" : "font2");
    response.field("installed", info.installed);
    response.field("name", info.name);
    response.end();
  }
  response.end();
  response.field("mdnsReady", mdnsReady);
  response.field("setupMode", accessPointRunning);
  response.field("dashboardPageCount", dashboardPageCount);
  response.field("trackedValueCount", dashboardValues.size());
  response.field("graphHistoryBytes", graphHistory.bytes());
  response.field("graphStorageError", graphHistory.storageError());
  response.field("renderError", renderFailureName());
  response.field("sceneCompileError",
                 sceneCompileFailureName(lastSceneCompileFailure));
  response.field("sceneBytes", activeScene ? activeScene->allocatedBytes() : 0);
  response.field("pageDefinitionBytes", pageDefinition.allocatedBytes());
  response.field("pageDefinitionParses", pageDefinition.parseCount());
  response.field("sceneNodes", activeSceneReady && activeScene
                                   ? activeScene->graph.size()
                                   : 0);
  response.field("lastTransition", lastTransitionType);
  response.field("lastTransitionDurationMs", lastTransitionDurationMs);
  response.field("page", dashboardPageCount
                             ? dashboardPages[activePageIndex].id
                             : "");
  response.field("rotation", pageRotationAuto ? "auto" : "manual");
  response.field("bootId", bootId);
  response.field("uptimeSeconds", millis() / 1000UL);
  response.field("freeHeapBytes", ESP.getFreeHeap());
#if defined(ESP8266)
  response.field("totalHeapBytes", 81920);
  response.field("usedHeapBytes", 81920 - ESP.getFreeHeap());
  response.field("minimumFreeHeapBytes", minimumFreeHeapBytes);
  response.field("maximumFreeBlockBytes", ESP.getMaxFreeBlockSize());
  response.field("heapFragmentationPercent", ESP.getHeapFragmentation());
  response.field("resetReason", lastResetReason);
  response.field("resetInfo", ESP.getResetInfo());
#else
  response.field("totalHeapBytes", ESP.getHeapSize());
  response.field("usedHeapBytes", ESP.getHeapSize() - ESP.getFreeHeap());
#endif
  response.field("wifiRssiDbm",
                 WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -127);
  response.field("lastValueUpdateAgeSeconds",
                 hasValueUpdate
                     ? static_cast<int32_t>((millis() - lastValueUpdateAt) /
                                            1000UL)
                     : -1);
  response.field("firmwareVersion", kFirmwareVersion);
  response.beginArray("pages");
  for (uint8_t index = 0; index < dashboardPageCount; ++index) {
    response.element(dashboardPages[index].id);
  }
  response.end();
  response.finish();
  server.sendContent("");
}

void sendApiDashboard() {
  if (!apiAuthenticated()) return;
  if (!filesystemReady || !LittleFS.exists(kDashboardPath)) {
    server.send(404, "application/json", "{\"error\":\"dashboard_not_found\"}");
    return;
  }
  File file = LittleFS.open(kDashboardPath, "r");
  server.streamFile(file, "application/json");
  file.close();
}

void receiveApiDashboard() {
  if (!apiAuthenticated()) return;
  // Validation and dashboard replacement must not reuse the previous schema.
  // Evict even on rejection; the unchanged on-disk dashboard reloads lazily.
  pageDefinition.clear();
  if (!filesystemReady) {
    sendJsonError(503, F("filesystem_unavailable"), F("LittleFS unavailable"));
    return;
  }
  const String &body = server.arg("plain");
  if (body.isEmpty() || body.length() > kMaxDashboardBytes) {
    sendJsonError(413, F("dashboard_too_large"), F("Dashboard exceeds limit"));
    return;
  }
  File temporary = LittleFS.open(kDashboardTempPath, "w");
  if (!temporary || temporary.print(body) != body.length()) {
    if (temporary) temporary.close();
    LittleFS.remove(kDashboardTempPath);
    sendJsonError(507, F("write_failed"), F("Could not store dashboard"));
    return;
  }
  temporary.close();
#if defined(ESP8266)
  server.releaseRequestBody();
  // Glyph tables are a disposable rendering cache, not framebuffer pixels.
  // Reload lazily on the next render, after request validation has finished.
  if (display.fontLoaded) display.unloadFont();
  displayFontState = FontRenderState{};
#endif
  File validation = LittleFS.open(kDashboardTempPath, "r");
  DashboardLoadFailure failure;
  const bool valid = validation && loadDashboardMetadata(validation, &failure);
  validation.close();
  if (!valid) {
    LittleFS.remove(kDashboardTempPath);
    sendJsonError(failure.retryable ? 503 : 422,
                  failure.retryable ? F("display_busy") : F("invalid_dashboard"),
                  failure.message ? failure.message : F("Could not read uploaded dashboard"));
    return;
  }
  LittleFS.remove(kDashboardBackupPath);
  const bool hadDashboard = LittleFS.exists(kDashboardPath);
  if (hadDashboard &&
      !LittleFS.rename(kDashboardPath, kDashboardBackupPath)) {
    LittleFS.remove(kDashboardTempPath);
    sendJsonError(507, F("commit_failed"), F("Could not back up dashboard"));
    return;
  }
  if (!LittleFS.rename(kDashboardTempPath, kDashboardPath)) {
    if (hadDashboard) LittleFS.rename(kDashboardBackupPath, kDashboardPath);
    sendJsonError(507, F("commit_failed"), F("Could not activate dashboard"));
    return;
  }
  LittleFS.remove(kDashboardBackupPath);
  if (server.arg("render") != "false") {
    pageShownAt = millis();
    requestFullRender();
  }
  server.send(204);
}

void receiveApiData() {
  if (!apiAuthenticated()) return;
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::DataRequest);
  const String &body = server.arg("plain");
  if (body.isEmpty() || body.length() > kMaxDataBytes) {
    sendJsonError(413, F("data_too_large"), F("Data update exceeds limit"));
    return;
  }
  StaticJsonDocument<128> filter;
  filter["values"] = true;
  filter["series"] = true;
  filter["render"] = true;
  const size_t documentCapacity = min<size_t>(
      4096, max<size_t>(1024, body.length() + 1024));
  DynamicJsonDocument document(documentCapacity);
  recordFreeHeap();
  const auto error = deserializeJson(document, body,
      DeserializationOption::Filter(filter));
  MINI_DISPLAY_PROFILE_MEMORY(RuntimeProfilePoint::DataRequest);
  if (error || !document["values"].is<JsonObject>()) {
    sendJsonError(422, F("invalid_data"), F("Expected values object"));
    return;
  }
  JsonObject values = document["values"].as<JsonObject>();
  uint32_t changedValueMask = 0;
  if (document.containsKey("series")) {
    if (pageTransitionActive) {
      sendJsonError(503, F("display_busy"), F("Retry history update after transition"));
      return;
    }
    if (!document["series"].is<JsonObjectConst>() ||
        !graphHistory.receiveSnapshot(document["series"])) {
      sendJsonError(422, F("invalid_history"), F("Invalid or unconfigured history series"));
      return;
    }
    changedValueMask = UINT32_MAX;
  }
  for (JsonPair pair : values) {
    if (strcmp(pair.key().c_str(), "music_playing") == 0) {
      lastMusicUpdateAt = millis();
      hasMusicUpdate = true;
    }
    DashboardValue *slot = findValue(pair.key().c_str(), true);
    if (slot == nullptr) continue;
    JsonObject value = pair.value().as<JsonObject>();
    const char *state = value["state"] | "unknown";
    const bool available = value["available"] | false;
    if (slot->available == available && strcmp(slot->state, state) == 0) {
      continue;
    }
    strlcpy(slot->state, state, sizeof(slot->state));
    slot->available = available;
    changedValueMask |= 1UL << dashboardValues.indexOf(slot);
  }
  if (document["render"] | true) {
    if (pageTransitionActive) {
      transitionDeferredValues |= changedValueMask;
    } else {
      pendingChangedValues |= changedValueMask;
    }
  }
  lastValueUpdateAt = millis();
  hasValueUpdate = true;
  if (diagnosticsCaptureAt != 0 &&
      millis() - diagnosticsCaptureAt <= kDiagnosticsCaptureTimeoutMs) {
    diagnosticsLastData = body;
  }
  server.send(204);
}

void sendApiLatestData() {
  if (!apiAuthenticated()) return;
  const uint32_t now = millis();
  if (diagnosticsCaptureAt == 0 ||
      now - diagnosticsCaptureAt > kDiagnosticsCaptureTimeoutMs) {
    diagnosticsLastData = String();
  }
  diagnosticsCaptureAt = now == 0 ? 1 : now;
  if (diagnosticsLastData.isEmpty()) {
    server.send(204);
    return;
  }
  server.sendHeader("Cache-Control", "no-store");
  server.send(200, "application/json", diagnosticsLastData);
}

void sendApiData() {
  if (!apiAuthenticated()) return;
  server.sendHeader("Cache-Control", "no-store");
  server.setContentLength(CONTENT_LENGTH_UNKNOWN);
  server.send(200, "application/json", "");
  writeDisplayData(httpChunkSink, dashboardValues.data(), dashboardValues.size(),
                   graphHistory);
  server.sendContent("");
}

void sendApiScreenshot() {
  if (!apiAuthenticated()) return;
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::Screenshot);
  if (!ScreenCapture::supported()) {
    sendJsonError(501, F("screenshot_unsupported"),
                  F("Display readback is not supported by this hardware"));
    return;
  }

  if (!activeSceneReady || !activeScene ||
      activeScenePage != activePageIndex) {
    sendJsonError(503, F("capture_unavailable"),
                  F("Current scene is not ready"));
    return;
  }
  // Capture's sprite/cache and RGB row must not share the small ESP8266 stack
  // with image rendering, LittleFS and TCP. Allocate only for this request.
  std::unique_ptr<ScreenCapture> capture(new (std::nothrow) ScreenCapture(display));
  if (!capture || !capture->begin()) {
    sendJsonError(503, F("capture_unavailable"),
                  F("Not enough memory to capture the display"));
    return;
  }

  // Page transitions run synchronously. The web server dispatches this
  // handler only after a transition finishes, then this handler freezes loop-
  // driven marquee and page animations until the complete frame is captured.
  server.sendHeader("Cache-Control", "no-store");
  server.sendHeader("Content-Disposition",
                    "inline; filename=\"mini-display.bmp\"");
  server.setContentLength(ScreenCapture::kBmpSize);
  server.send(200, "image/bmp", "");
  capture->streamBmp(*activeScene, pixelShiftX, pixelShiftY, server.client(), &notifications);
}

void receiveApiNotification() {
  if (!apiAccessAllowed(notificationAuthEnabled)) return;
  if (server.arg("plain").length() > 4096) {
    sendJsonError(413, F("notification_too_large"), F("Notification body exceeds 4096 bytes"));
    return;
  }
  if (!displayOn || !displayBrightness) {
    sendJsonError(409, F("display_off"), F("Turn on the display before sending notifications"));
    return;
  }
  if (notifications.count() == NotificationCenter::kCapacity) {
    server.sendHeader("Retry-After", String(notifications.current()->durationMs / 1000));
    sendJsonError(429, F("notification_queue_full"), F("Notification queue is full"));
    return;
  }
#if defined(ESP8266)
  // Leave room for the compositor and its drawing state.
  constexpr size_t spriteBytes =
      240 * kSceneUpdateBandHeight * sizeof(uint16_t);
  constexpr size_t reserve = sizeof(SceneUpdatePainter) + spriteBytes + 1024;
  if (ESP.getFreeHeap() < reserve + sizeof(DisplayNotification) + 1024 ||
      ESP.getMaxFreeBlockSize() < spriteBytes + 1024) {
    sendJsonError(503, F("notification_unavailable"), F("Not enough rendering memory"));
    return;
  }
#endif
  DynamicJsonDocument document(1024);
  const auto error = deserializeJson(document, server.arg("plain"));
  if (error) {
    sendJsonError(400, F("invalid_json"), F("Invalid or oversized notification JSON"));
    return;
  }
  std::unique_ptr<DisplayNotification> item(new (std::nothrow) DisplayNotification());
  if (!item) {
    sendJsonError(503, F("notification_unavailable"), F("Not enough memory for a notification"));
    return;
  }
  const char *invalid = parseNotificationRequest(document.as<JsonVariantConst>(), *item,
      notificationPosition, display.width(), display.height());
  if (invalid) {
    // All validation runs before the queue or display is modified.
    StaticJsonDocument<256> response;
    response["error"] = "invalid_notification";
    response["message"] = invalid;
    String body;
    serializeJson(response, body);
    server.send(422, "application/json", body);
    return;
  }
  prepareNotification(*item, display.width(), display.height());
  notifications.enqueue(std::move(item));
  server.send(202, "application/json", "{\"accepted\":true}");
}

void dismissApiNotifications() {
  if (!apiAccessAllowed(notificationAuthEnabled)) return;
  notifications.dismissAll();
  server.send(204);
}

void receiveApiDisplay() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<384> document;
  if (deserializeJson(document, server.arg("plain"))) {
    sendJsonError(400, F("invalid_json"), F("Expected JSON object"));
    return;
  }
  bool settingsChanged = false;
  if (document.containsKey("nightMode") &&
      !document["nightMode"].isNull() && !document["nightMode"].is<bool>()) {
    sendJsonError(422, F("invalid_night_mode"), F("Night mode must be true, false or null for automatic"));
    return;
  }
  if (document.containsKey("notificationMaxVisible") &&
      (!document["notificationMaxVisible"].is<int>() || document["notificationMaxVisible"].as<int>() < 1 ||
       document["notificationMaxVisible"].as<int>() > NotificationCenter::kCapacity)) {
    sendJsonError(422, F("invalid_notification_limit"), F("Visible notification limit must be 1-3"));
    return;
  }
  if (document.containsKey("notificationAuthEnabled") && !document["notificationAuthEnabled"].is<bool>()) {
    sendJsonError(422, F("invalid_notification_auth"), F("Notification protection must be true or false"));
    return;
  }
  NotificationPosition nextNotificationPosition = notificationPosition;
  if (document.containsKey("notificationPosition") && !parseNotificationPosition(
      document["notificationPosition"].as<const char *>(), nextNotificationPosition, display.width(), display.height())) {
    sendJsonError(422, F("invalid_notification_position"), F("Unsupported notification position"));
    return;
  }
  if (document.containsKey("refreshRateHz")) {
    const float rate = document["refreshRateHz"].as<float>();
    if (!document["refreshRateHz"].is<float>() || !DisplayRefresh::valid(rate)) {
      sendJsonError(422, F("invalid_refresh_rate"), F("Refresh rate must be 0.1-60 Hz"));
      return;
    }
    settingsChanged = displayRefresh.rate() != rate;
    displayRefresh.setRate(rate);
  }
  if (document.containsKey("on")) displayOn = document["on"].as<bool>();
  if (document.containsKey("brightness")) {
    const int value = document["brightness"].as<int>();
    if (value < 0 || value > 100) {
      sendJsonError(422, F("invalid_brightness"), F("Brightness must be 0-100"));
      return;
    }
    settingsChanged = settingsChanged || daytimeBrightness != value;
    daytimeBrightness = value;
    displayBrightness = value;
  }
  if (document.containsKey("pixelShift")) {
    const int value = document["pixelShift"].as<int>();
    if (value < 0 || value > kMaxPixelShift) {
      sendJsonError(422, F("invalid_pixel_shift"),
                    F("Pixel shift must be 0-10"));
      return;
    }
    settingsChanged = settingsChanged || displayPixelShift != value;
    displayPixelShift = value;
    updatePixelShift();
    pixelShiftAt = millis();
    requestFullRender();
  }
  if (document.containsKey("timezone")) {
    const char *value = document["timezone"] | "";
    if (!timezoneValid(value)) {
      sendJsonError(422, F("invalid_timezone"),
                    F("Timezone rule must contain 1-63 printable characters"));
      return;
    }
    const bool timezoneChanged = strcmp(displayTimezone, value) != 0;
    settingsChanged = settingsChanged || timezoneChanged;
    strlcpy(displayTimezone, value, sizeof(displayTimezone));
    applyTimezone();
    if (timezoneChanged) {
      lastClockTick = static_cast<time_t>(-1);
      requestFullRender();
    }
  }
  settingsChanged = settingsChanged || notificationPosition != nextNotificationPosition;
  notificationPosition = nextNotificationPosition;
  if (document.containsKey("notificationMaxVisible")) {
    const uint8_t value = document["notificationMaxVisible"].as<uint8_t>();
    settingsChanged = settingsChanged || notifications.maxVisible() != value;
    notifications.setMaxVisible(value);
  }
  if (document.containsKey("notificationAuthEnabled")) {
    const bool value = document["notificationAuthEnabled"].as<bool>();
    settingsChanged = settingsChanged || notificationAuthEnabled != value;
    notificationAuthEnabled = value;
  }
  if (document.containsKey("nightMode")) {
    clockNightOverride = document["nightMode"].isNull() ? -1 : document["nightMode"].as<bool>() ? 1 : 0;
    const time_t now = time(nullptr);
    struct tm boundary{};
    localtime_r(&now, &boundary);
    boundary.tm_hour = clockNightOverride == 1 ? 12 : 2;
    boundary.tm_min = boundary.tm_sec = 0;
    boundary.tm_isdst = -1;
    clockNightOverrideUntil = mktime(&boundary);
    if (clockNightOverrideUntil <= now) {
      ++boundary.tm_mday;
      boundary.tm_isdst = -1;
      clockNightOverrideUntil = mktime(&boundary);
    }
  }
  updateClockNightMode();
  if (settingsChanged) saveDisplaySettings();
  applyBacklight();
  server.send(204);
}

void sendApiFonts() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<640> document;
  document["active"] = userFonts.activeSlot();
  document["maxSlots"] = kUserFontSlots;
  document["maxGlyphs"] = kMaxUserFontGlyphs;
  document["maxPackBytes"] = kMaxUserFontPackBytes;
  JsonArray sizes = document.createNestedArray("sizes");
  sizes.add(18);
  sizes.add(24);
  sizes.add(36);
  sizes.add(48);
  JsonArray slots = document.createNestedArray("slots");
  for (uint8_t index = 0; index < kUserFontSlots; ++index) {
    const UserFontSlotInfo &info = userFonts.slot(index);
    JsonObject value = slots.createNestedObject();
    value["slot"] = index;
    value["installed"] = info.installed;
    value["name"] = info.name;
    value["glyphs"] = info.glyphCount;
    value["bytes"] = info.bytes;
  }
  String body;
  body.reserve(512);
  serializeJson(document, body);
  server.send(200, "application/json", body);
}

void receiveApiFontSelection() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<64> document;
  if (deserializeJson(document, server.arg("plain"))) {
    sendJsonError(400, F("invalid_json"), F("Expected JSON object"));
    return;
  }
  const int active = document["active"] | -2;
  if (!userFonts.setActiveSlot(active)) {
    sendJsonError(422, F("invalid_font"),
                  F("Select an installed font slot or built-in font"));
    return;
  }
  displayFontState = FontRenderState{};
  requestFullRender();
  server.send(204);
}

void receiveApiFontUpload(uint8_t slot, uint8_t size) {
  if (!apiAuthenticated()) return;
  HTTPUpload &upload = server.upload();
  if (upload.status == UPLOAD_FILE_START) {
    userFonts.beginUpload(slot, size);
  } else if (upload.status == UPLOAD_FILE_WRITE) {
    userFonts.writeUpload(upload.buf, upload.currentSize);
  } else if (upload.status == UPLOAD_FILE_END) {
    userFonts.finishUpload();
  } else if (upload.status == UPLOAD_FILE_ABORTED) {
    userFonts.abortUpload();
  }
  yield();
}

void finishApiFontUpload() {
  if (!apiAuthenticated()) return;
  if (!userFonts.uploadSucceeded()) {
    sendJsonError(422, F("invalid_font_file"),
                  F("Font file is invalid or too large"));
    return;
  }
  server.send(204);
}

void receiveApiFontCommit(uint8_t slot) {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<160> document;
  if (deserializeJson(document, server.arg("plain"))) {
    sendJsonError(400, F("invalid_json"), F("Expected JSON object"));
    return;
  }
  const char *name = document["name"] | "";
  const int glyphs = document["glyphs"] | 0;
  const uint32_t bytes = document["bytes"] | 0;
  if (!userFonts.finalize(slot, name, glyphs, bytes)) {
    sendJsonError(422, F("invalid_font_pack"),
                  F("Font pack is incomplete, invalid, or too large"));
    return;
  }
  server.send(204);
}

void receiveApiFontDelete(uint8_t slot) {
  if (!apiAuthenticated()) return;
  if (!userFonts.remove(slot)) {
    sendJsonError(500, F("storage_error"), F("Could not remove font"));
    return;
  }
  displayFontState = FontRenderState{};
  requestFullRender();
  server.send(204);
}

void receiveApiPage() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<192> document;
  if (deserializeJson(document, server.arg("plain"))) {
    sendJsonError(400, F("invalid_json"), F("Expected JSON object"));
    return;
  }
  const char *mode = document["mode"];
  const char *command = document["command"];
  const char *id = document["id"];
  if (mode) {
    if (strcmp(mode, "auto") != 0 && strcmp(mode, "manual") != 0) {
      sendJsonError(422, F("invalid_page_mode"), F("Expected auto or manual"));
      return;
    }
    pageRotationAuto = strcmp(mode, "auto") == 0;
    pageShownAt = millis();
    server.send(204);
    return;
  } else if (command && dashboardPageCount) {
    const uint8_t current = pendingPageIndex >= 0
                                ? pendingPageIndex : activePageIndex;
    if (strcmp(command, "next") == 0) {
      pendingPageIndex = (current + 1) % dashboardPageCount;
      server.send(204);
      return;
    } else if (strcmp(command, "previous") == 0) {
      pendingPageIndex =
          (current + dashboardPageCount - 1) % dashboardPageCount;
      server.send(204);
      return;
    } else if (strcmp(command, "reload") != 0) {
      sendJsonError(422, F("invalid_command"), F("Unknown page command"));
      return;
    }
    pendingPageIndex = -1;
  } else if (id && dashboardPageCount) {
    bool found = false;
    for (uint8_t index = 0; index < dashboardPageCount; ++index) {
      if (strcmp(id, dashboardPages[index].id) == 0) {
        pageRotationAuto = false;
        pendingPageIndex = index;
        found = true;
        break;
      }
    }
    if (!found) {
      sendJsonError(404, F("page_not_found"), F("Unknown page id"));
      return;
    }
    pageShownAt = millis();
    server.send(204);
    return;
  } else {
    sendJsonError(422, F("invalid_page_request"), F("Expected mode, command, or id"));
    return;
  }
  pageShownAt = millis();
  requestFullRender();
  server.send(204);
}

void receiveApiRestart() {
  if (!apiAuthenticated()) return;
  server.send(204);
  delay(100);
  ESP.restart();
}

void receiveApiSetupMode() {
  if (!apiAuthenticated()) return;
  memset(config.ssid, 0, sizeof(config.ssid));
  memset(config.wifiPassword, 0, sizeof(config.wifiPassword));
  saveConfig();
  server.send(204);
  delay(250);
  WiFi.disconnect(true);
  startAccessPoint();
}

void receiveApiFactoryReset() {
  if (!apiAuthenticated()) return;
  if (filesystemReady && !LittleFS.format()) {
    sendJsonError(500, F("storage_error"), F("Could not erase settings"));
    return;
  }
  if (!eraseDeviceConfig()) {
    sendJsonError(500, F("storage_error"), F("Could not erase settings"));
    return;
  }
  server.send(204);
  delay(250);
#if defined(ESP8266)
  WiFi.disconnect(true);
#else
  WiFi.disconnect(true, true);
#endif
  ESP.restart();
}

void startAccessPoint() {
  if (accessPointRunning) return;
  if (configValid() && config.resetApiAuthOnRecovery) {
    memset(config.apiPassword, 0, sizeof(config.apiPassword));
    config.apiAuthEnabled = 0;
    saveConfig();
  }
  WiFi.mode(wifiConfigured() ? WIFI_AP_STA : WIFI_AP);
  const String ssid = "SDPRO-Setup-" + deviceSuffix();
  if (networkSettings.recoveryPassword[0]) {
    WiFi.softAP(ssid.c_str(), networkSettings.recoveryPassword);
  } else {
    WiFi.softAP(ssid.c_str());
  }
  accessPointRunning = true;
  startupScreens.clearConnection();
  showSetupScreen();
  Serial.printf("Setup AP: %s, http://%s/\n", ssid.c_str(),
                WiFi.softAPIP().toString().c_str());
}

void sendWebApp() {
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  if (tlsCertificates.enabled() && !server.secureRequest() &&
      !accessPointRunning) {
    server.sendHeader("Location",
                      "https://" + WiFi.localIP().toString() + server.uri());
    server.send(308, "text/plain", "Use HTTPS");
    return;
  }
#endif
  if (!accessPointRunning && configValid() && !webAuthenticated()) return;
  server.sendHeader("Cache-Control", "no-store");
  server.sendHeader("Content-Encoding", "gzip");
  server.sendHeader("Vary", "Accept-Encoding");
  server.send_P(200, PSTR("text/html; charset=utf-8"),
                reinterpret_cast<PGM_P>(kWebAppGzip), kWebAppGzipSize);
}

void sendDashboardSchema() {
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  if (tlsCertificates.enabled() && !server.secureRequest() &&
      !accessPointRunning) {
    server.sendHeader("Location",
                      "https://" + WiFi.localIP().toString() + server.uri());
    server.send(308, "text/plain", "Use HTTPS");
    return;
  }
#endif
  server.sendHeader("Cache-Control", "public, max-age=3600");
  server.sendHeader("Content-Encoding", "gzip");
  server.send_P(200, PSTR("application/schema+json"),
                reinterpret_cast<PGM_P>(kDashboardSchemaGzip),
                kDashboardSchemaGzipSize);
}

void sendApiSetup() {
  if (!accessPointRunning) {
    sendJsonError(409, F("setup_inactive"), F("Setup mode is not active"));
    return;
  }
  const bool configured = configValid();
  StaticJsonDocument<1024> document;
  document["configured"] = configured;
  document["ssid"] = configured ? config.ssid : "";
  document["hostname"] = configuredHostname();
  document["username"] = configured ? configuredUsername() : "admin";
  document["retryLimit"] = configured && config.wifiRetryLimit
                               ? config.wifiRetryLimit
                               : kDefaultWifiRetryLimit;
  document["resetApiAuthOnRecovery"] =
      configured && config.resetApiAuthOnRecovery;
  document["apiAuthEnabled"] = configured ? config.apiAuthEnabled != 0 : true;
  document["apiPasswordSet"] = configured && config.apiPassword[0];
  document["otaAuthEnabled"] = configured ? config.otaAuthEnabled != 0 : true;
  document["otaPasswordSet"] = configured && config.otaPassword[0];
  document["directOtaEnabled"] =
      configured ? config.directOtaEnabled != 0 : true;
  document["recoverySsid"] = "SDPRO-Setup-" + deviceSuffix();
  document["recoveryPasswordSet"] =
      networkSettings.recoveryPassword[0] != '\0';
  document["ntpServer"] = networkSettings.ntpServer;
  document["ntpFromDhcp"] = networkSettings.ntpFromDhcp;
  document["staticIpEnabled"] = networkSettings.staticIpEnabled;
  document["staticIp"] = networkSettings.staticIp;
  document["gateway"] = networkSettings.gateway;
  document["subnet"] = networkSettings.subnet;
  document["dns1"] = networkSettings.dns1;
  document["dns2"] = networkSettings.dns2;
  String body;
  body.reserve(768);
  serializeJson(document, body);
  server.send(200, "application/json", body);
}

void receiveApiSetup() {
  if (!accessPointRunning) {
    sendJsonError(409, F("setup_inactive"), F("Setup mode is not active"));
    return;
  }
  StaticJsonDocument<1024> document;
  if (deserializeJson(document, server.arg("plain"))) {
    sendJsonError(400, F("invalid_json"), F("Expected JSON object"));
    return;
  }
  const bool configured = configValid();
  const char *ssid = document["ssid"] | "";
  const char *wifiPassword = document["wifiPassword"] | "";
  const char *hostname = document["hostname"] | "";
  const char *username =
      document["username"] | (configured ? configuredUsername() : "admin");
  const char *legacyPassword = document["password"] | "";
  const char *apiPassword = document["apiPassword"] | legacyPassword;
  const char *otaPassword = document["otaPassword"] | legacyPassword;
  const bool apiAuthEnabled =
      document["apiAuthEnabled"] | (configured && config.apiAuthEnabled);
  const bool otaAuthEnabled =
      document["otaAuthEnabled"] | (configured && config.otaAuthEnabled);
  const bool directOtaEnabled =
      document["directOtaEnabled"] | (configured && config.directOtaEnabled);
  const int retryLimit = document["retryLimit"] |
                         static_cast<int>(kDefaultWifiRetryLimit);
  const size_t nextApiPasswordLength =
      apiPassword[0] ? strlen(apiPassword) : strlen(config.apiPassword);
  const size_t nextOtaPasswordLength =
      otaPassword[0] ? strlen(otaPassword) : strlen(config.otaPassword);
  if (!ssid[0] || strlen(ssid) > 32 || strlen(wifiPassword) > 64 ||
      !hostnameValid(hostname) || !usernameValid(username) || retryLimit < 1 ||
      retryLimit > 10 ||
      strlen(apiPassword) > 32 || strlen(otaPassword) > 32 ||
      !networkExtrasValid(document) ||
      (apiAuthEnabled && nextApiPasswordLength < 8) ||
      (directOtaEnabled && otaAuthEnabled && nextOtaPasswordLength < 8)) {
    sendJsonError(422, F("invalid_configuration"),
                  F("Check Wi-Fi and password values"));
    return;
  }
  DeviceConfig next = configured ? config : DeviceConfig{};
  strlcpy(next.ssid, ssid, sizeof(next.ssid));
  if (!configured || wifiPassword[0]) {
    strlcpy(next.wifiPassword, wifiPassword, sizeof(next.wifiPassword));
  }
  strlcpy(next.hostname, hostname, sizeof(next.hostname));
  strlcpy(next.username, username, sizeof(next.username));
  if (apiPassword[0]) {
    strlcpy(next.apiPassword, apiPassword, sizeof(next.apiPassword));
  }
  if (otaPassword[0]) {
    strlcpy(next.otaPassword, otaPassword, sizeof(next.otaPassword));
  }
  next.apiAuthEnabled = apiAuthEnabled;
  next.otaAuthEnabled = otaAuthEnabled;
  next.directOtaEnabled = directOtaEnabled;
  next.wifiRetryLimit = retryLimit;
  next.resetApiAuthOnRecovery =
      document["resetApiAuthOnRecovery"] | false;
  updateNetworkExtras(document);
  if (!saveNetworkSettings()) {
    sendJsonError(500, F("storage_error"), F("Could not save network settings"));
    return;
  }
  config = next;
  saveConfig();
  server.send(204);
  delay(400);
  ESP.restart();
}

void sendApiNetwork() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<1024> document;
  document["ssid"] = config.ssid;
  document["hostname"] = configuredHostname();
  document["ip"] = WiFi.status() == WL_CONNECTED
                       ? WiFi.localIP().toString()
                       : WiFi.softAPIP().toString();
  document["rssiDbm"] = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : -127;
  document["gateway"] = WiFi.gatewayIP().toString();
  document["dns1Current"] = WiFi.dnsIP(0).toString();
  document["dns2Current"] = WiFi.dnsIP(1).toString();
  document["channel"] = WiFi.status() == WL_CONNECTED ? WiFi.channel() : 0;
  document["bssid"] =
      WiFi.status() == WL_CONNECTED ? WiFi.BSSIDstr() : "";
  document["mac"] = WiFi.macAddress();
  document["reconnectCount"] = reconnectCount;
  document["lastDisconnectReason"] = disconnectReason();
  document["retryLimit"] = config.wifiRetryLimit
                               ? config.wifiRetryLimit
                               : kDefaultWifiRetryLimit;
  document["resetApiAuthOnRecovery"] =
      config.resetApiAuthOnRecovery != 0;
  document["recoverySsid"] = "SDPRO-Setup-" + deviceSuffix();
  document["recoveryPasswordSet"] =
      networkSettings.recoveryPassword[0] != '\0';
  document["ntpServer"] = networkSettings.ntpServer;
  document["ntpFromDhcp"] = networkSettings.ntpFromDhcp;
  document["staticIpEnabled"] = networkSettings.staticIpEnabled;
  document["staticIp"] = networkSettings.staticIp;
  document["staticGateway"] = networkSettings.gateway;
  document["staticSubnet"] = networkSettings.subnet;
  document["staticDns1"] = networkSettings.dns1;
  document["staticDns2"] = networkSettings.dns2;
  String body;
  body.reserve(768);
  serializeJson(document, body);
  server.send(200, "application/json", body);
}

void receiveApiNetwork() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<1280> document;
  if (deserializeJson(document, server.arg("plain"))) {
    sendJsonError(400, F("invalid_json"), F("Expected JSON object"));
    return;
  }
  const char *ssid = document["ssid"] | "";
  const char *password = document["password"] | "";
  const char *hostname = document["hostname"] | "";
  const int retryLimit = document["retryLimit"] |
                         static_cast<int>(kDefaultWifiRetryLimit);
  if (!ssid[0] || strlen(ssid) > 32 || strlen(password) > 64 ||
      !hostnameValid(hostname) || retryLimit < 1 || retryLimit > 10 ||
      !networkExtrasValid(document)) {
    sendJsonError(422, F("invalid_network"), F("Invalid Wi-Fi settings"));
    return;
  }
  strlcpy(config.ssid, ssid, sizeof(config.ssid));
  if (password[0]) {
    strlcpy(config.wifiPassword, password, sizeof(config.wifiPassword));
  }
  strlcpy(config.hostname, hostname, sizeof(config.hostname));
  config.wifiRetryLimit = retryLimit;
  config.resetApiAuthOnRecovery =
      document["resetApiAuthOnRecovery"] | false;
  updateNetworkExtras(document);
  if (!saveNetworkSettings()) {
    sendJsonError(500, F("storage_error"), F("Could not save network settings"));
    return;
  }
  saveConfig();
  server.send(204);
  delay(400);
  ESP.restart();
}

void receiveApiNetworkTest() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<1280> document;
  if (deserializeJson(document, server.arg("plain"))) {
    sendJsonError(400, F("invalid_json"), F("Expected JSON object"));
    return;
  }
  const char *ssid = document["ssid"] | "";
  const char *password = document["password"] | "";
  const char *hostname = document["hostname"] | "";
  const int retryLimit = document["retryLimit"] |
                         static_cast<int>(kDefaultWifiRetryLimit);
  if (!ssid[0] || strlen(ssid) > 32 || strlen(password) > 64 ||
      !hostnameValid(hostname) || retryLimit < 1 || retryLimit > 10 ||
      !networkExtrasValid(document)) {
    sendJsonError(422, F("invalid_network"), F("Invalid network settings"));
    return;
  }
  server.send(204);
}

void sendApiSecurity() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<512> document;
  document["apiAuthEnabled"] = config.apiAuthEnabled != 0;
  document["otaAuthEnabled"] = config.otaAuthEnabled != 0;
  document["directOtaEnabled"] = config.directOtaEnabled != 0;
  document["username"] = configuredUsername();
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  document["httpsSupported"] = true;
  document["httpsEnabled"] = tlsCertificates.enabled();
  document["httpsAvailable"] = tlsCertificates.ready();
  document["httpsPort"] = 443;
  document["tlsCertificateSource"] =
      tlsCertificates.ready() ? tlsCertificates.source() : "none";
  document["tlsCertificateAlgorithm"] =
      tlsCertificates.ready() ? "ECDSA P-256" : "none";
  document["tlsCertificateFingerprint"] = tlsCertificates.fingerprint();
#else
  document["httpsSupported"] = false;
  document["httpsEnabled"] = false;
  document["httpsAvailable"] = false;
#endif
  String body;
  body.reserve(448);
  serializeJson(document, body);
  server.send(200, "application/json", body);
}

void receiveApiSecurity() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<256> document;
  if (deserializeJson(document, server.arg("plain"))) {
    sendJsonError(400, F("invalid_json"), F("Expected JSON object"));
    return;
  }
  const bool apiAuthEnabled =
      document["apiAuthEnabled"] | (config.apiAuthEnabled != 0);
  const bool otaAuthEnabled =
      document["otaAuthEnabled"] | (config.otaAuthEnabled != 0);
  const bool directOtaEnabled =
      document["directOtaEnabled"] | (config.directOtaEnabled != 0);
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  const bool httpsEnabled =
      document["httpsEnabled"] | tlsCertificates.enabled();
  if (httpsEnabled && !tlsCertificates.ready()) {
    sendJsonError(422, F("certificate_required"),
                  F("Generate or upload a certificate first"));
    return;
  }
#endif
  const char *username = document["username"] | configuredUsername();
  const char *apiPassword = document["apiPassword"] | "";
  const char *otaPassword = document["otaPassword"] | "";
  const size_t nextApiPasswordLength =
      apiPassword[0] ? strlen(apiPassword) : strlen(config.apiPassword);
  const size_t nextOtaPasswordLength =
      otaPassword[0] ? strlen(otaPassword) : strlen(config.otaPassword);
  if (!usernameValid(username) || strlen(apiPassword) > 32 ||
      strlen(otaPassword) > 32 ||
      (apiAuthEnabled && nextApiPasswordLength < 8) ||
      (directOtaEnabled && otaAuthEnabled && nextOtaPasswordLength < 8)) {
    sendJsonError(422, F("invalid_security"),
                  F("Check username and password settings"));
    return;
  }
  if (apiPassword[0]) {
    strlcpy(config.apiPassword, apiPassword, sizeof(config.apiPassword));
  }
  if (otaPassword[0]) {
    strlcpy(config.otaPassword, otaPassword, sizeof(config.otaPassword));
  }
  strlcpy(config.username, username, sizeof(config.username));
  config.apiAuthEnabled = apiAuthEnabled;
  config.otaAuthEnabled = otaAuthEnabled;
  config.directOtaEnabled = directOtaEnabled;
  saveConfig();
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  if (!tlsCertificates.setEnabled(httpsEnabled)) {
    sendJsonError(500, F("storage_error"),
                  F("Could not save HTTPS settings"));
    return;
  }
#endif
  server.send(204);
}

#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
bool tlsUploadSucceeded = false;

void receiveApiTlsUpload(bool certificate) {
  if (!apiAuthenticated()) return;
  HTTPUpload &upload = server.upload();
  if (upload.status == UPLOAD_FILE_START) {
    tlsUploadSucceeded = tlsCertificates.beginUpload(certificate);
  } else if (upload.status == UPLOAD_FILE_WRITE) {
    tlsUploadSucceeded =
        tlsUploadSucceeded && tlsCertificates.writeUpload(
                                  certificate, upload.buf, upload.currentSize);
  } else if (upload.status == UPLOAD_FILE_END) {
    tlsUploadSucceeded =
        tlsUploadSucceeded && tlsCertificates.finishUpload(certificate);
  } else if (upload.status == UPLOAD_FILE_ABORTED) {
    tlsCertificates.abortUpload(certificate);
    tlsUploadSucceeded = false;
  }
  yield();
}

void finishApiTlsUpload() {
  if (!apiAuthenticated()) return;
  if (!tlsUploadSucceeded) {
    sendJsonError(422, F("invalid_upload"), F("Certificate upload failed"));
    return;
  }
  server.send(204);
}

void installApiTlsUploads() {
  if (!apiAuthenticated()) return;
  if (!tlsCertificates.installUploads()) {
    sendJsonError(422, F("invalid_certificate"),
                  F("Certificate and private key do not match"));
    return;
  }
  server.send(204);
  delay(300);
  ESP.restart();
}

void generateApiTlsCertificate() {
  if (!apiAuthenticated()) return;
  if (!tlsCertificates.generate(configuredHostname(), WiFi.localIP())) {
    sendJsonError(500, F("certificate_generation_failed"),
                  F("Could not generate certificate"));
    return;
  }
  server.send(204);
  delay(300);
  ESP.restart();
}
#endif

void sendApiFirmwareSettings() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<256> document;
  document["notificationsEnabled"] = firmwareNotificationsEnabled;
  document["notificationDurationSeconds"] =
      firmwareNoticeDurationSeconds;
  document["reminderHours"] = firmwareReminderHours;
  document["availableVersion"] = firmwareAvailableVersion;
  document["updateAvailable"] =
      newerFirmwareVersion(firmwareAvailableVersion, kFirmwareVersion);
  String body;
  body.reserve(192);
  serializeJson(document, body);
  server.send(200, "application/json", body);
}

void receiveApiFirmwareSettings() {
  if (!apiAuthenticated()) return;
  StaticJsonDocument<256> document;
  if (deserializeJson(document, server.arg("plain"))) {
    sendJsonError(400, F("invalid_json"), F("Expected JSON object"));
    return;
  }
  if (document.containsKey("notificationsEnabled") &&
      !document["notificationsEnabled"].is<bool>()) {
    sendJsonError(422, F("invalid_firmware_notifications"),
                  F("Notification setting must be true or false"));
    return;
  }
  if (document.containsKey("notificationDurationSeconds") &&
      (!document["notificationDurationSeconds"].is<unsigned>() ||
       document["notificationDurationSeconds"].as<unsigned>() < 5 ||
       document["notificationDurationSeconds"].as<unsigned>() > 300)) {
    sendJsonError(422, F("invalid_firmware_notification_duration"),
                  F("Notification duration must be 5-300 seconds"));
    return;
  }
  if (document.containsKey("reminderHours") &&
      (!document["reminderHours"].is<unsigned>() ||
       document["reminderHours"].as<unsigned>() < 1 ||
       document["reminderHours"].as<unsigned>() >
           kMaximumFirmwareReminderHours)) {
    sendJsonError(422, F("invalid_firmware_reminder"),
                  F("Reminder interval must be 1-720 hours"));
    return;
  }
  FirmwareVersion parsed;
  const char *availableVersion = nullptr;
  if (document.containsKey("availableVersion")) {
    availableVersion = document["availableVersion"].as<const char *>();
    if (!availableVersion || strlen(availableVersion) >=
                                 sizeof(firmwareAvailableVersion) ||
        !parseFirmwareVersion(availableVersion, parsed)) {
      sendJsonError(422, F("invalid_firmware_version"),
                    F("Expected a semantic firmware version"));
      return;
    }
  }
  bool changed = false;
  if (document.containsKey("notificationsEnabled")) {
    const bool value = document["notificationsEnabled"].as<bool>();
    if (value && !firmwareNotificationsEnabled) firmwareNoticeRetryAt = millis();
    changed = changed || firmwareNotificationsEnabled != value;
    firmwareNotificationsEnabled = value;
  }
  if (document.containsKey("notificationDurationSeconds")) {
    const uint16_t value =
        document["notificationDurationSeconds"].as<uint16_t>();
    changed = changed || firmwareNoticeDurationSeconds != value;
    firmwareNoticeDurationSeconds = value;
  }
  if (document.containsKey("reminderHours")) {
    const uint16_t value = document["reminderHours"].as<uint16_t>();
    changed = changed || firmwareReminderHours != value;
    firmwareReminderHours = value;
  }
  if (availableVersion &&
      strcmp(firmwareAvailableVersion, availableVersion) != 0) {
    strlcpy(firmwareAvailableVersion, availableVersion,
            sizeof(firmwareAvailableVersion));
    firmwareLastNoticeEpoch = 0;
    firmwareNoticeRetryAt = millis();
    changed = true;
  }
  if (changed) saveDisplaySettings();
  server.send(204);
}

void finishFirmwareUpdate() {
  const bool success = !Update.hasError();
  server.send(success ? 200 : 500, "text/plain",
              success ? "Update complete. Restarting..." : "Update failed");
  if (success) {
    delay(250);
    ESP.restart();
  } else {
    requestFullRender();
  }
}

void showFirmwareUpdateNotice() {
  std::unique_ptr<DisplayNotification> item(
      new (std::nothrow) DisplayNotification());
  if (!item) return;
  strlcpy(item->title, "Firmware update", sizeof(item->title));
  strlcpy(item->message, "Do not power off", sizeof(item->message));
  item->severity = NotificationSeverity::Warning;
  item->icon = NotificationIcon::Power;
  item->position = NotificationPosition::Top;

  NotificationCenter notice;
  notice.setMaxVisible(1);
  if (!notice.enqueue(std::move(item))) return;
  notice.advance(millis(), display.width(), display.height(), false,
                 prepareNotification);

  if (!displayOn || displayBrightness == 0) {
    displayOn = true;
    displayBrightness = max<uint8_t>(displayBrightness, 40);
    applyBacklight();
  }
#if defined(ESP8266)
  std::unique_ptr<SceneUpdatePainter> painter(
      new (std::nothrow) SceneUpdatePainter(display));
  if (!painter || !painter->begin()) return;
  for (int16_t y = 0; y < display.height(); y += kSceneUpdateBandHeight) {
    painter->band.fillSprite(TFT_BLACK);
    paintNotification(painter->band, notice, 0, -y);
    displayScrollBuffer.pushLogical(
        0, y, display.width(), kSceneUpdateBandHeight,
        static_cast<uint16_t *>(painter->band.getPointer()));
    yield();
  }
#else
  display.fillScreen(TFT_BLACK);
  paintNotification(display, notice, 0, 0);
#endif
}

void prepareFirmwareUpdate() {
  samHomePod.stop();
  pageRotationAuto = false;
  pageTransitionActive = false;
  pendingPageIndex = -1;
  pendingChangedValues = 0;
  transitionDeferredValues = 0;
  resetMarqueeTitles();
  sceneScheduler.reset();
  activeScene.reset();
  activeSceneReady = false;
  activeScenePage = 0xff;
  pageDefinition.clear();
  graphHistory.reset();
  diagnosticsLastData = String();
#if defined(ESP8266)
  if (display.fontLoaded) display.unloadFont();
  displayFontState = FontRenderState{};
#endif
  showFirmwareUpdateNotice();
}

void receiveFirmwareUpdate() {
  HTTPUpload &upload = server.upload();
  if (upload.status == UPLOAD_FILE_START) {
    prepareFirmwareUpdate();
#if defined(ESP8266)
    WiFiUDP::stopAll();
    // getFreeSketchSpace() already excludes the running sketch and rounds its
    // end to a flash-sector boundary. Keeping the final sector available lets
    // two maximum-sized images alternate without progressively shrinking the
    // next OTA slot.
    Update.begin(ESP.getFreeSketchSpace() & 0xFFFFF000);
#else
    Update.begin(UPDATE_SIZE_UNKNOWN);
#endif
  } else if (upload.status == UPLOAD_FILE_WRITE) {
    Update.write(upload.buf, upload.currentSize);
  } else if (upload.status == UPLOAD_FILE_END) {
    Update.end(true);
  } else if (upload.status == UPLOAD_FILE_ABORTED) {
    Update.end();
  }
  yield();
}

void finishDirectUpdate() {
  if (!directOtaAuthenticated()) return;
  finishFirmwareUpdate();
}

void receiveDirectUpdate() {
  if (!directOtaAuthenticated()) return;
  receiveFirmwareUpdate();
}

void finishPanelUpdate() {
  if (!apiAuthenticated()) return;
  finishFirmwareUpdate();
}

void receivePanelUpdate() {
  if (!apiAuthenticated()) return;
  receiveFirmwareUpdate();
}

void configureRoutes() {
#if defined(ESP8266)
  server.prepareDashboardRequests([] {
    // HTTP parsing itself needs room for the incoming body before the handler
    // can stage it on flash. The LCD retains its pixels, so release all
    // reproducible scene state before ESP8266WebServer allocates the body.
    if (display.fontLoaded) display.unloadFont();
    displayFontState = FontRenderState{};
    resetMarqueeTitles();
    sceneScheduler.reset();
    activeScene.reset();
    activeSceneReady = false;
    activeScenePage = 0xff;
    pageDefinition.clear();
    diagnosticsLastData = String();
    requestFullRender();
  });
#endif
  if (routesReady) return;
  server.on("/", HTTP_GET, sendWebApp);
  server.on("/display", HTTP_GET, sendWebApp);
  server.on("/network", HTTP_GET, sendWebApp);
  server.on("/security", HTTP_GET, sendWebApp);
  server.on("/diagnostics", HTTP_GET, sendWebApp);
  server.on("/update", HTTP_GET, sendWebApp);
  server.on("/schema/dashboard.schema.json", HTTP_GET, sendDashboardSchema);
  server.on("/update", HTTP_POST, finishDirectUpdate, receiveDirectUpdate);
  server.on("/api/v1/firmware", HTTP_GET, sendApiFirmwareSettings);
  server.on("/api/v1/firmware", HTTP_PUT, receiveApiFirmwareSettings);
  server.on("/api/v1/firmware", HTTP_POST, finishPanelUpdate,
            receivePanelUpdate);
  server.on("/api/v1/setup", HTTP_GET, sendApiSetup);
  server.on("/api/v1/setup", HTTP_PUT, receiveApiSetup);
  server.on("/api/v1/info", HTTP_GET, sendApiInfo);
  server.on("/api/v1/status", HTTP_GET, sendApiStatus);
  server.on("/api/v1/network", HTTP_GET, sendApiNetwork);
  server.on("/api/v1/network", HTTP_PUT, receiveApiNetwork);
  server.on("/api/v1/network/test", HTTP_POST, receiveApiNetworkTest);
  server.on("/api/v1/security", HTTP_GET, sendApiSecurity);
  server.on("/api/v1/security", HTTP_PUT, receiveApiSecurity);
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  server.on("/api/v1/tls/certificate", HTTP_POST, finishApiTlsUpload,
            [] { receiveApiTlsUpload(true); });
  server.on("/api/v1/tls/private-key", HTTP_POST, finishApiTlsUpload,
            [] { receiveApiTlsUpload(false); });
  server.on("/api/v1/tls/install", HTTP_POST, installApiTlsUploads);
  server.on("/api/v1/tls/generate", HTTP_POST, generateApiTlsCertificate);
#endif
  server.on("/api/v1/dashboard", HTTP_GET, sendApiDashboard);
  server.on("/api/v1/dashboard", HTTP_PUT, receiveApiDashboard);
  imageAssetApi.begin();
  server.on("/api/v1/data", HTTP_PATCH, receiveApiData);
  server.on("/api/v1/data", HTTP_GET, sendApiData);
  server.on("/api/v1/data/latest", HTTP_GET, sendApiLatestData);
  server.on("/api/v1/screenshot", HTTP_GET, sendApiScreenshot);
  server.on("/api/v1/crash", HTTP_GET, sendApiCrash);
#if MINI_DISPLAY_RUNTIME_PROFILE
  server.on("/api/v1/debug/performance", HTTP_GET, sendApiPerformance);
  server.on("/api/v1/debug/performance", HTTP_DELETE,
            resetApiPerformance);
#endif
  server.on("/api/v1/display", HTTP_PUT, receiveApiDisplay);
  server.on("/api/v1/notifications", HTTP_POST, receiveApiNotification);
  server.on("/api/v1/notifications", HTTP_DELETE, dismissApiNotifications);
  server.on("/api/v1/fonts", HTTP_GET, sendApiFonts);
  server.on("/api/v1/fonts", HTTP_PUT, receiveApiFontSelection);
  server.on("/api/v1/fonts/0", HTTP_PUT,
            [] { receiveApiFontCommit(0); });
  server.on("/api/v1/fonts/0", HTTP_DELETE,
            [] { receiveApiFontDelete(0); });
  server.on("/api/v1/fonts/1", HTTP_PUT,
            [] { receiveApiFontCommit(1); });
  server.on("/api/v1/fonts/1", HTTP_DELETE,
            [] { receiveApiFontDelete(1); });
  server.on("/api/v1/fonts/0/0", HTTP_POST, finishApiFontUpload,
            [] { receiveApiFontUpload(0, 0); });
  server.on("/api/v1/fonts/0/1", HTTP_POST, finishApiFontUpload,
            [] { receiveApiFontUpload(0, 1); });
  server.on("/api/v1/fonts/0/2", HTTP_POST, finishApiFontUpload,
            [] { receiveApiFontUpload(0, 2); });
  server.on("/api/v1/fonts/0/3", HTTP_POST, finishApiFontUpload,
            [] { receiveApiFontUpload(0, 3); });
  server.on("/api/v1/fonts/1/0", HTTP_POST, finishApiFontUpload,
            [] { receiveApiFontUpload(1, 0); });
  server.on("/api/v1/fonts/1/1", HTTP_POST, finishApiFontUpload,
            [] { receiveApiFontUpload(1, 1); });
  server.on("/api/v1/fonts/1/2", HTTP_POST, finishApiFontUpload,
            [] { receiveApiFontUpload(1, 2); });
  server.on("/api/v1/fonts/1/3", HTTP_POST, finishApiFontUpload,
            [] { receiveApiFontUpload(1, 3); });
  server.on("/api/v1/page", HTTP_POST, receiveApiPage);
  server.on("/api/v1/restart", HTTP_POST, receiveApiRestart);
  server.on("/api/v1/setup-mode", HTTP_POST, receiveApiSetupMode);
  server.on("/api/v1/factory-reset", HTTP_POST, receiveApiFactoryReset);
  server.onNotFound([] { server.send(404, "text/plain", "Not found"); });
  server.begin();
  routesReady = true;
}

void connectToWiFi() {
  if (!wifiConfigured()) {
    startAccessPoint();
    return;
  }
  WiFi.persistent(false);
  WiFi.mode(WIFI_STA);
  configureIpAddress();
#if defined(ESP8266)
  WiFi.hostname(configuredHostname().c_str());
#else
  WiFi.setHostname(configuredHostname().c_str());
#endif
  WiFi.begin(config.ssid, config.wifiPassword);
  connectStartedAt = millis();
  wifiAttemptCount = 1;
  wifiWasConnected = false;
}

void showStartupScreen() {
  startupScreens.begin();
}

void showWifiConnectingScreen() {
  startupScreens.showConnecting(config, wifiAttemptCount, connectStartedAt,
                                kConnectTimeoutMs);
}

void updateWifiConnectedCountdown(uint8_t secondsRemaining) {
  startupScreens.updateConnectedCountdown(secondsRemaining);
}

void showWifiConnectedScreen(uint8_t secondsRemaining) {
  startupScreens.showConnected(config, secondsRemaining);
}

void showSetupScreen() {
  if (!accessPointRunning) return;
  startupScreens.showSetup(config, networkSettings, deviceSuffix(),
                           wifiAttemptCount);
}

void startMdns() {
  if (mdnsReady || WiFi.status() != WL_CONNECTED) return;
  const String host = configuredHostname();
  if (!MDNS.begin(host.c_str())) return;
  MDNS.addService("mini-display", "tcp", 80);
  MDNS.addServiceTxt("mini-display", "tcp", "api", "1");
  MDNS.addServiceTxt("mini-display", "tcp", "id", "mini-display-" + deviceSuffix());
  MDNS.addServiceTxt("mini-display", "tcp", "model", kHardwareProfile);
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  MDNS.addServiceTxt("mini-display", "tcp", "https",
                     tlsCertificates.enabled() ? "1" : "0");
#endif
  mdnsReady = true;
}

}  // namespace

void setup() {
  loadCrashDiagnostics();
  Serial.begin(115200);
  bootId = ESP.random();
  Serial.println();
  Serial.printf("Home Assistant Mini-Display firmware %s\n", kFirmwareVersion);
#if defined(ESP8266)
  const String resetReason = ESP.getResetReason();
  strlcpy(lastResetReason, resetReason.c_str(), sizeof(lastResetReason));
#endif
  loadConfig();
  filesystemReady = LittleFS.begin();
#if defined(ESP8266) && MINI_DISPLAY_FEATURE_TLS
  tlsCertificates.begin(filesystemReady);
  if (tlsCertificates.ready()) {
    server.configureTls(tlsCertificates.certificate(),
                        tlsCertificates.privateKey());
  }
#endif
  userFonts.begin(filesystemReady);
  loadDisplaySettings();
  daytimeBrightness = displayBrightness;
  loadNetworkSettings();
  configureTimeService();
  loadStoredDashboard();
  showStartupScreen();
  configureRoutes();
  connectToWiFi();
  if (accessPointRunning) {
    showSetupScreen();
  } else if (WiFi.status() != WL_CONNECTED) {
    showWifiConnectingScreen();
  }
  recordFreeHeap();
}

void loop() {
  MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::Loop);
  {
    MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::Http);
    server.handleClient();
  }
  if (accessPointRunning) {
    if (wifiConfigured() && WiFi.status() == WL_CONNECTED) {
      WiFi.softAPdisconnect(true);
      accessPointRunning = false;
      wifiWasConnected = true;
      wifiAttemptCount = 0;
      startupSequenceActive = true;
      startupConnectedAt = 0;
    } else if (millis() - startupScreens.setupUpdatedAt() >= 1000 &&
               WiFi.softAPgetStationNum() !=
                   startupScreens.setupStationCount()) {
      showSetupScreen();
    }
    recordFreeHeap();
    delay(2);
    return;
  }

  if (wifiConfigured() && WiFi.status() != WL_CONNECTED) {
    if (wifiWasConnected) {
      wifiWasConnected = false;
      lastDisconnectStatus = WiFi.status();
      ++reconnectCount;
      wifiAttemptCount = 1;
      connectStartedAt = millis();
      WiFi.reconnect();
      showWifiConnectingScreen();
    } else if (millis() - connectStartedAt >= kConnectTimeoutMs) {
      const uint8_t retryLimit = config.wifiRetryLimit
                                     ? config.wifiRetryLimit
                                     : kDefaultWifiRetryLimit;
      if (wifiAttemptCount >= retryLimit) {
        startAccessPoint();
      } else {
        lastDisconnectStatus = WiFi.status();
        ++reconnectCount;
        ++wifiAttemptCount;
        connectStartedAt = millis();
        WiFi.disconnect();
        WiFi.begin(config.ssid, config.wifiPassword);
        showWifiConnectingScreen();
      }
    } else if (millis() - startupScreens.setupUpdatedAt() >= 1000) {
      showWifiConnectingScreen();
    }
    recordFreeHeap();
    delay(2);
    return;
  }

  if (wifiConfigured()) {
    wifiWasConnected = true;
    wifiAttemptCount = 0;
  }
  if (startupSequenceActive) {
    if (startupConnectedAt == 0) {
      startupConnectedAt = millis();
      showWifiConnectedScreen(4);
    }
    const uint32_t connectedFor = millis() - startupConnectedAt;
    if (connectedFor < 4000) {
      const uint8_t secondsRemaining = 4 - connectedFor / 1000;
      if (secondsRemaining != startupScreens.countdownShown()) {
        updateWifiConnectedCountdown(secondsRemaining);
      }
      startMdns();
#if defined(ESP8266)
      if (mdnsReady) MDNS.update();
#endif
      recordFreeHeap();
      delay(2);
      return;
    }
    startupSequenceActive = false;
    startupScreens.clearConnection();
    showCurrentPage();
    applyBacklight();
  } else if (startupScreens.connectionVisible()) {
    startupScreens.clearConnection();
    showCurrentPage();
    applyBacklight();
  }

  // Rendering here releases the HTTP handler's stack and request buffers
  // first. Never compile a scene or run an animation inside a page request.
  updateStandaloneClock();
  // Finish bounded native reassembly before a compositor borrows its heap.
  if (samHomePod.receiving()) {recordFreeHeap();delay(2);return;}
  updateFirmwareNotificationReminder();
  updateNotifications();
  if (pendingPageIndex >= 0 && displayRefresh.ready(millis())) {
    const uint8_t nextPage = pendingPageIndex;
    pendingPageIndex = -1;
    showPageWithTransition(nextPage);
  }
  // Page navigation gets a chance before a continuous stream of sensor updates.
  if (!fullRenderPending && pageRotationAuto && dashboardPageCount > 1 && displayRefresh.ready(millis()) &&
      millis() - pageShownAt >= dashboardPages[activePageIndex].durationMs) {
    showPageWithTransition((activePageIndex + 1) % dashboardPageCount);
  }
  if (fullRenderPending && displayRefresh.ready(millis()) &&
      static_cast<int32_t>(millis() - fullRenderNotBefore) >= 0) {
    fullRenderPending = false;
    pendingChangedValues = 0;
    showCurrentPage();
  } else if (!fullRenderPending && pendingChangedValues != 0 && displayRefresh.ready(millis())) {
    const uint32_t changedValues = pendingChangedValues;
    pendingChangedValues = 0;
    if (!renderDashboardPage(&changedValues)) showCurrentPage();
  }
  startMdns();
#if defined(ESP8266)
  if (mdnsReady) MDNS.update();
#endif
  if (dashboardPageCount && dashboardPages[activePageIndex].hasClock) {
    const time_t now = time(nullptr);
    if (now > 1000000000) {
      const time_t tick = dashboardPages[activePageIndex].clockShowsSeconds
                              ? now
                              : now / 60;
      if (tick != lastClockTick && displayRefresh.ready(millis())) {
        lastClockTick = tick;
        renderDashboardPage(nullptr, false);
      }
    }
  }
  updateMarqueeTitles();
  updateAnimatedImages();
  if (activeSceneReady && activeScene && sceneScheduler.pending() && displayRefresh.ready(millis()))
    if (!renderPendingScene(*activeScene)) requestFullRender();
  if (displayPixelShift > 0 && displayRefresh.ready(millis()) &&
      millis() - pixelShiftAt >= kPixelShiftIntervalMs) {
    updatePixelShift();
    pixelShiftAt = millis();
    showCurrentPage();
  }
  if (diagnosticsCaptureAt != 0 &&
      millis() - diagnosticsCaptureAt > kDiagnosticsCaptureTimeoutMs) {
    diagnosticsCaptureAt = 0;
    diagnosticsLastData = String();
  }
  recordFreeHeap();
#if MINI_DISPLAY_RUNTIME_PROFILE
  static uint16_t memorySampleDivider = 0;
  if ((++memorySampleDivider & 0x07ff) == 0) runtimeProfiler.sampleMemory();
#endif
  delay(2);
}
