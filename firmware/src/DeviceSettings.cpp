#include "DeviceSettings.h"

#include <EEPROM.h>
#include <LittleFS.h>
#include <ctype.h>

#include "StoredConfig.h"
#include "StoredConfigFile.h"

#if defined(ESP8266)
#include <ESP8266WiFi.h>
#include <sntp.h>
#else
#include <WiFi.h>
#include <esp_sntp.h>
#endif

namespace {

constexpr uint32_t kLegacyConfigMagic = 0x53445031;
constexpr uint32_t kV2ConfigMagic = 0x53445032;
constexpr uint32_t kV3ConfigMagic = 0x53445033;
constexpr uint32_t kConfigMagic = 0x53445034;
constexpr size_t kEepromSize = 512;
constexpr uint16_t kNetworkSettingsSchemaVersion = 1;
constexpr char kNetworkSettingsPath[] = "/network.json";
constexpr char kNetworkSettingsTempPath[] = "/network.tmp";
constexpr char kNetworkSettingsInvalidPath[] = "/network.invalid";

struct LegacyDeviceConfig {
  uint32_t magic;
  char ssid[33];
  char wifiPassword[65];
  char otaPassword[33];
  uint32_t checksum;
};

struct V2DeviceConfig {
  uint32_t magic;
  char ssid[33];
  char wifiPassword[65];
  char apiPassword[33];
  char otaPassword[33];
  char hostname[33];
  uint8_t apiAuthEnabled;
  uint8_t otaAuthEnabled;
  uint8_t wifiRetryLimit;
  uint8_t resetApiAuthOnRecovery;
  uint32_t checksum;
};

struct V3DeviceConfig {
  uint32_t magic;
  char ssid[33];
  char wifiPassword[65];
  char apiPassword[33];
  char otaPassword[33];
  char hostname[33];
  uint8_t apiAuthEnabled;
  uint8_t otaAuthEnabled;
  uint8_t wifiRetryLimit;
  uint8_t resetApiAuthOnRecovery;
  uint8_t directOtaEnabled;
  uint8_t reserved[3];
  uint32_t checksum;
};

template <typename Config>
uint32_t checksum(const Config &value) {
  const auto *bytes = reinterpret_cast<const uint8_t *>(&value);
  uint32_t hash = 2166136261UL;
  for (size_t index = 0; index < offsetof(Config, checksum); ++index) {
    hash ^= bytes[index];
    hash *= 16777619UL;
  }
  return hash;
}

bool legacyConfigValid(const LegacyDeviceConfig &value) {
  return value.magic == kLegacyConfigMagic &&
         value.checksum == checksum(value) && value.ssid[0] != '\0' &&
         strlen(value.otaPassword) >= 8;
}

bool v2ConfigValid(const V2DeviceConfig &value) {
  return value.magic == kV2ConfigMagic && value.checksum == checksum(value) &&
         value.ssid[0] != '\0';
}

bool v3ConfigValid(const V3DeviceConfig &value) {
  return value.magic == kV3ConfigMagic && value.checksum == checksum(value) &&
         value.ssid[0] != '\0';
}

bool ipv4Valid(const char *value, bool required) {
  if (!value[0]) return !required;
  IPAddress address;
  return address.fromString(value);
}

bool ntpServerValid(const char *value, size_t capacity) {
  const size_t length = strlen(value);
  if (length == 0 || length >= capacity) return false;
  for (size_t index = 0; index < length; ++index) {
    const unsigned char character = value[index];
    if (!isalnum(character) && character != '.' && character != '-' &&
        character != ':' && character != '_') {
      return false;
    }
  }
  return true;
}

void resetStoredNetworkSettings(NetworkSettings &settings,
                                const __FlashStringHelper *reason) {
  Serial.print(F("Stored network settings reset: "));
  Serial.println(reason);
  quarantineStoredConfigFile(kNetworkSettingsPath,
                             kNetworkSettingsInvalidPath);
  settings = NetworkSettings{};
  saveNetworkSettings(settings, true);
}

}  // namespace

bool deviceConfigValid(const DeviceConfig &config) {
  return config.magic == kConfigMagic && config.checksum == checksum(config);
}

bool wifiConfigured(const DeviceConfig &config) {
  return deviceConfigValid(config) && config.ssid[0] != '\0';
}

void saveDeviceConfig(DeviceConfig &config) {
  config.magic = kConfigMagic;
  config.checksum = checksum(config);
  EEPROM.put(0, config);
  EEPROM.commit();
}

bool eraseDeviceConfig() {
  DeviceConfig erased{};
  EEPROM.put(0, erased);
  return EEPROM.commit();
}

void loadDeviceConfig(DeviceConfig &config) {
  EEPROM.begin(kEepromSize);
  EEPROM.get(0, config);
  if (deviceConfigValid(config)) return;

  V3DeviceConfig v3{};
  EEPROM.get(0, v3);
  if (v3ConfigValid(v3)) {
    memset(&config, 0, sizeof(config));
    strlcpy(config.ssid, v3.ssid, sizeof(config.ssid));
    strlcpy(config.wifiPassword, v3.wifiPassword,
            sizeof(config.wifiPassword));
    strlcpy(config.apiPassword, v3.apiPassword, sizeof(config.apiPassword));
    strlcpy(config.otaPassword, v3.otaPassword, sizeof(config.otaPassword));
    strlcpy(config.hostname, v3.hostname, sizeof(config.hostname));
    strlcpy(config.username, "admin", sizeof(config.username));
    config.apiAuthEnabled = v3.apiAuthEnabled;
    config.otaAuthEnabled = v3.otaAuthEnabled;
    config.wifiRetryLimit = v3.wifiRetryLimit;
    config.resetApiAuthOnRecovery = v3.resetApiAuthOnRecovery;
    config.directOtaEnabled = v3.directOtaEnabled;
    saveDeviceConfig(config);
    return;
  }

  V2DeviceConfig v2{};
  EEPROM.get(0, v2);
  if (v2ConfigValid(v2)) {
    memset(&config, 0, sizeof(config));
    strlcpy(config.ssid, v2.ssid, sizeof(config.ssid));
    strlcpy(config.wifiPassword, v2.wifiPassword,
            sizeof(config.wifiPassword));
    strlcpy(config.apiPassword, v2.apiPassword, sizeof(config.apiPassword));
    strlcpy(config.otaPassword, v2.otaPassword, sizeof(config.otaPassword));
    strlcpy(config.hostname, v2.hostname, sizeof(config.hostname));
    strlcpy(config.username, "admin", sizeof(config.username));
    config.apiAuthEnabled = v2.apiAuthEnabled;
    config.otaAuthEnabled = v2.otaAuthEnabled;
    config.wifiRetryLimit = v2.wifiRetryLimit;
    config.resetApiAuthOnRecovery = v2.resetApiAuthOnRecovery;
    config.directOtaEnabled = 1;
    saveDeviceConfig(config);
    return;
  }

  LegacyDeviceConfig legacy{};
  EEPROM.get(0, legacy);
  if (legacyConfigValid(legacy)) {
    memset(&config, 0, sizeof(config));
    strlcpy(config.ssid, legacy.ssid, sizeof(config.ssid));
    strlcpy(config.wifiPassword, legacy.wifiPassword,
            sizeof(config.wifiPassword));
    strlcpy(config.apiPassword, legacy.otaPassword,
            sizeof(config.apiPassword));
    strlcpy(config.otaPassword, legacy.otaPassword,
            sizeof(config.otaPassword));
    strlcpy(config.username, "admin", sizeof(config.username));
    config.apiAuthEnabled = 1;
    config.otaAuthEnabled = 1;
    config.directOtaEnabled = 1;
    config.wifiRetryLimit = kDefaultWifiRetryLimit;
    saveDeviceConfig(config);
    return;
  }
  Serial.println(F("Stored device settings invalid; using setup defaults"));
  memset(&config, 0, sizeof(config));
}

void loadNetworkSettings(NetworkSettings &settings, bool filesystemReady) {
  if (!filesystemReady || !LittleFS.exists(kNetworkSettingsPath)) return;
  File file = LittleFS.open(kNetworkSettingsPath, "r");
  if (!file) return;
  StaticJsonDocument<512> document;
  const auto error = deserializeJson(document, file);
  file.close();
  if (error || !document.is<JsonObject>()) {
    resetStoredNetworkSettings(settings, F("malformed JSON"));
    return;
  }

  JsonObjectConst root = document.as<JsonObjectConst>();
  const StoredConfigSchema schema = inspectStoredConfigSchema(
      root, kNetworkSettingsSchemaVersion);
  if (schema.state == StoredConfigSchemaState::Newer) {
    resetStoredNetworkSettings(settings, F("newer schema"));
    return;
  }
  if (schema.state == StoredConfigSchemaState::Older) {
    resetStoredNetworkSettings(settings, F("unsupported older schema"));
    return;
  }
  if (schema.state == StoredConfigSchemaState::Invalid) {
    resetStoredNetworkSettings(settings, F("invalid schema"));
    return;
  }

  NetworkSettings loaded{};
  const char *recoveryPassword = root["recoveryPassword"] | "";
  const size_t recoveryPasswordLength = strlen(recoveryPassword);
  if (recoveryPasswordLength >= 8 &&
      recoveryPasswordLength < sizeof(loaded.recoveryPassword)) {
    strlcpy(loaded.recoveryPassword, recoveryPassword,
            sizeof(loaded.recoveryPassword));
  }
  const char *ntpServer = root["ntpServer"] | kDefaultNtpServer;
  if (ntpServerValid(ntpServer, sizeof(loaded.ntpServer))) {
    strlcpy(loaded.ntpServer, ntpServer, sizeof(loaded.ntpServer));
  }
  strlcpy(loaded.staticIp, root["staticIp"] | "", sizeof(loaded.staticIp));
  strlcpy(loaded.gateway, root["gateway"] | "", sizeof(loaded.gateway));
  strlcpy(loaded.subnet, root["subnet"] | "", sizeof(loaded.subnet));
  strlcpy(loaded.dns1, root["dns1"] | "", sizeof(loaded.dns1));
  strlcpy(loaded.dns2, root["dns2"] | "", sizeof(loaded.dns2));
  loaded.staticIpEnabled = root["staticIpEnabled"] | false;
  loaded.ntpFromDhcp = root["ntpFromDhcp"] | false;

  if (!ipv4Valid(loaded.dns1, false)) {
    loaded.dns1[0] = '\0';
  }
  if (!ipv4Valid(loaded.dns2, false)) {
    loaded.dns2[0] = '\0';
  }
  if (loaded.staticIpEnabled &&
      (!ipv4Valid(loaded.staticIp, true) ||
       !ipv4Valid(loaded.gateway, true) ||
       !ipv4Valid(loaded.subnet, true))) {
    loaded.staticIpEnabled = false;
    loaded.staticIp[0] = '\0';
    loaded.gateway[0] = '\0';
    loaded.subnet[0] = '\0';
  }
  if (loaded.staticIpEnabled && loaded.ntpFromDhcp) {
    loaded.ntpFromDhcp = false;
  }
  settings = loaded;
  if (schema.legacy) saveNetworkSettings(settings, true);
}

bool saveNetworkSettings(const NetworkSettings &settings,
                         bool filesystemReady) {
  if (!filesystemReady) return false;
  File file = LittleFS.open(kNetworkSettingsTempPath, "w");
  if (!file) return false;
  StaticJsonDocument<512> document;
  document["schemaVersion"] = kNetworkSettingsSchemaVersion;
  document["recoveryPassword"] = settings.recoveryPassword;
  document["ntpServer"] = settings.ntpServer;
  document["ntpFromDhcp"] = settings.ntpFromDhcp;
  document["staticIpEnabled"] = settings.staticIpEnabled;
  document["staticIp"] = settings.staticIp;
  document["gateway"] = settings.gateway;
  document["subnet"] = settings.subnet;
  document["dns1"] = settings.dns1;
  document["dns2"] = settings.dns2;
  if (serializeJson(document, file) == 0) {
    file.close();
    LittleFS.remove(kNetworkSettingsTempPath);
    return false;
  }
  file.close();
  LittleFS.remove(kNetworkSettingsPath);
  return LittleFS.rename(kNetworkSettingsTempPath, kNetworkSettingsPath);
}

bool networkExtrasValid(const JsonDocument &document,
                        const NetworkSettings &settings) {
  const bool recoveryPasswordEnabled =
      document["recoveryPasswordEnabled"] |
      (settings.recoveryPassword[0] != '\0');
  const char *recoveryPassword = document["recoveryPassword"] | "";
  const size_t passwordLength = recoveryPassword[0]
                                    ? strlen(recoveryPassword)
                                    : strlen(settings.recoveryPassword);
  const bool staticIpEnabled =
      document["staticIpEnabled"] | settings.staticIpEnabled;
  const bool ntpFromDhcp = document["ntpFromDhcp"] | settings.ntpFromDhcp;
  const char *ntpServer = document["ntpServer"] | settings.ntpServer;
  const char *staticIp = document["staticIp"] | settings.staticIp;
  const char *gateway = document["gateway"] | settings.gateway;
  const char *subnet = document["subnet"] | settings.subnet;
  const char *dns1 = document["dns1"] | settings.dns1;
  const char *dns2 = document["dns2"] | settings.dns2;
  return (!recoveryPasswordEnabled ||
          (passwordLength >= 8 && passwordLength <= 63)) &&
         (!ntpFromDhcp || !staticIpEnabled) &&
         (ntpFromDhcp || ntpServerValid(ntpServer, sizeof(settings.ntpServer))) &&
         (!staticIpEnabled ||
          (ipv4Valid(staticIp, true) && ipv4Valid(gateway, true) &&
           ipv4Valid(subnet, true) && ipv4Valid(dns1, false) &&
           ipv4Valid(dns2, false)));
}

void updateNetworkExtras(const JsonDocument &document,
                         NetworkSettings &settings) {
  const bool recoveryPasswordEnabled =
      document["recoveryPasswordEnabled"] |
      (settings.recoveryPassword[0] != '\0');
  const char *recoveryPassword = document["recoveryPassword"] | "";
  if (!recoveryPasswordEnabled) {
    memset(settings.recoveryPassword, 0, sizeof(settings.recoveryPassword));
  } else if (recoveryPassword[0]) {
    strlcpy(settings.recoveryPassword, recoveryPassword,
            sizeof(settings.recoveryPassword));
  }
  settings.staticIpEnabled =
      document["staticIpEnabled"] | settings.staticIpEnabled;
  settings.ntpFromDhcp = document["ntpFromDhcp"] | settings.ntpFromDhcp;
  strlcpy(settings.ntpServer, document["ntpServer"] | settings.ntpServer,
          sizeof(settings.ntpServer));
  strlcpy(settings.staticIp, document["staticIp"] | settings.staticIp,
          sizeof(settings.staticIp));
  strlcpy(settings.gateway, document["gateway"] | settings.gateway,
          sizeof(settings.gateway));
  strlcpy(settings.subnet, document["subnet"] | settings.subnet,
          sizeof(settings.subnet));
  strlcpy(settings.dns1, document["dns1"] | settings.dns1,
          sizeof(settings.dns1));
  strlcpy(settings.dns2, document["dns2"] | settings.dns2,
          sizeof(settings.dns2));
}

bool timezoneValid(const char *value, size_t capacity) {
  const size_t length = strlen(value);
  if (length == 0 || length >= capacity) return false;
  for (size_t index = 0; index < length; ++index) {
    const unsigned char character = value[index];
    if (character < 0x20 || character > 0x7e) return false;
  }
  return true;
}

bool hostnameValid(const char *hostname) {
  const size_t length = strlen(hostname);
  if (length == 0 || length > 32 || hostname[0] == '-' ||
      hostname[length - 1] == '-') {
    return false;
  }
  for (size_t index = 0; index < length; ++index) {
    const char character = hostname[index];
    if (!isalnum(static_cast<unsigned char>(character)) && character != '-') {
      return false;
    }
  }
  return true;
}

bool usernameValid(const char *username) {
  const size_t length = strlen(username);
  if (length == 0 || length > 32) return false;
  for (size_t index = 0; index < length; ++index) {
    const char character = username[index];
    if (!isalnum(static_cast<unsigned char>(character)) && character != '-' &&
        character != '_' && character != '.') {
      return false;
    }
  }
  return true;
}

String deviceSuffix() {
  char suffix[7];
#if defined(ESP8266)
  snprintf(suffix, sizeof(suffix), "%06X", ESP.getChipId());
#else
  snprintf(suffix, sizeof(suffix), "%06X",
           static_cast<uint32_t>(ESP.getEfuseMac()));
#endif
  return String(suffix);
}

String configuredHostname(const DeviceConfig &config) {
  if (config.hostname[0]) return String(config.hostname);
  return "mini-display-" + deviceSuffix();
}

const char *configuredUsername(const DeviceConfig &config) {
  return config.username[0] ? config.username : "admin";
}

void configureIpAddress(const NetworkSettings &settings) {
  IPAddress zero(static_cast<uint32_t>(0));
  if (!settings.staticIpEnabled) {
    WiFi.config(zero, zero, zero);
    return;
  }
  IPAddress address;
  IPAddress gateway;
  IPAddress subnet;
  IPAddress dns1;
  IPAddress dns2;
  address.fromString(settings.staticIp);
  gateway.fromString(settings.gateway);
  subnet.fromString(settings.subnet);
  if (!dns1.fromString(settings.dns1)) dns1 = gateway;
  dns2.fromString(settings.dns2);
  WiFi.config(address, gateway, subnet, dns1, dns2);
}

void configureTimeService(const NetworkSettings &settings,
                          const char *timezone) {
  const char *server = settings.ntpServer[0] ? settings.ntpServer
                                              : kDefaultNtpServer;
#if defined(ESP8266)
  configTime(timezone, server);
  sntp_servermode_dhcp(settings.ntpFromDhcp ? 1 : 0);
#else
  configTzTime(timezone, server);
  esp_sntp_servermode_dhcp(settings.ntpFromDhcp);
#endif
}

String currentNtpServer(const NetworkSettings &settings) {
#if defined(ESP8266)
  const char *name = sntp_getservername(0);
  const ip_addr_t *address = sntp_getserver(0);
#else
  const char *name = esp_sntp_getservername(0);
  const ip_addr_t *address = esp_sntp_getserver(0);
#endif
  if (name && name[0]) return String(name);
  if (address && !ip_addr_isany(address)) return String(ipaddr_ntoa(address));
  return settings.ntpFromDhcp ? "Waiting for DHCP"
                              : String(settings.ntpServer);
}
