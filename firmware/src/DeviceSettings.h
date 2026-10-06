#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <cstddef>

inline constexpr uint8_t kDefaultWifiRetryLimit = 3;
inline constexpr char kDefaultTimezone[] = "CET-1CEST,M3.5.0,M10.5.0/3";
inline constexpr char kDefaultNtpServer[] = "pool.ntp.org";

struct DeviceConfig {
  // Persistent compatibility boundary. Do not resize, reorder or repurpose
  // fields. Store future settings in independently versioned LittleFS files.
  uint32_t magic;
  char ssid[33];
  char wifiPassword[65];
  char apiPassword[33];
  char otaPassword[33];
  char hostname[33];
  char username[33];
  uint8_t apiAuthEnabled;
  uint8_t otaAuthEnabled;
  uint8_t wifiRetryLimit;
  uint8_t resetApiAuthOnRecovery;
  uint8_t directOtaEnabled;
  uint8_t reserved[3];
  uint32_t checksum;
};

static_assert(sizeof(DeviceConfig) == 248,
              "DeviceConfig EEPROM layout must remain stable");
static_assert(offsetof(DeviceConfig, checksum) == 244,
              "DeviceConfig checksum offset must remain stable");

struct NetworkSettings {
  char recoveryPassword[64];
  char ntpServer[64] = "pool.ntp.org";
  char staticIp[16];
  char gateway[16];
  char subnet[16];
  char dns1[16];
  char dns2[16];
  bool staticIpEnabled;
  bool ntpFromDhcp;
};

bool deviceConfigValid(const DeviceConfig &config);
bool wifiConfigured(const DeviceConfig &config);
void loadDeviceConfig(DeviceConfig &config);
void saveDeviceConfig(DeviceConfig &config);
bool eraseDeviceConfig();

void loadNetworkSettings(NetworkSettings &settings, bool filesystemReady);
bool saveNetworkSettings(const NetworkSettings &settings,
                         bool filesystemReady);
bool networkExtrasValid(const JsonDocument &document,
                        const NetworkSettings &settings);
void updateNetworkExtras(const JsonDocument &document,
                         NetworkSettings &settings);

bool timezoneValid(const char *value, size_t capacity);
bool hostnameValid(const char *hostname);
bool usernameValid(const char *username);
String deviceSuffix();
String configuredHostname(const DeviceConfig &config);
const char *configuredUsername(const DeviceConfig &config);

void configureIpAddress(const NetworkSettings &settings);
void configureTimeService(const NetworkSettings &settings,
                          const char *timezone);
String currentNtpServer(const NetworkSettings &settings);
