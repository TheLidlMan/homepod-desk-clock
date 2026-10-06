#include <Arduino.h>
#include <DNSServer.h>
#include <EEPROM.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <LittleFS.h>
#include <TFT_eSPI.h>
#include <Updater.h>
#include <WiFiClientSecureBearSSL.h>
#include <bearssl/bearssl_hash.h>

namespace {

#ifndef MINI_DISPLAY_BOOTSTRAP_VERSION
#error "MINI_DISPLAY_BOOTSTRAP_VERSION is required"
#endif
#ifndef MINI_DISPLAY_BOOTSTRAP_FIRMWARE_SHA256
#error "MINI_DISPLAY_BOOTSTRAP_FIRMWARE_SHA256 is required"
#endif

constexpr char kInstallerVersion[] = MINI_DISPLAY_BOOTSTRAP_VERSION;
constexpr char kFirmwareRepositoryUrl[] =
    "https://github.com/piotrkochan/homeassistant-minidisplay/releases/download/v";
constexpr char kFirmwareAssetPrefix[] = "SDP-HomeAssistant-MiniDisplay-";
constexpr char kFirmwareSha256[] = MINI_DISPLAY_BOOTSTRAP_FIRMWARE_SHA256;
static_assert(sizeof(kFirmwareSha256) == 65,
              "Firmware SHA-256 must contain 64 hexadecimal characters");
constexpr uint32_t kConfigMagic = 0x53445034;
constexpr size_t kEepromSize = 512;
constexpr uint32_t kConnectTimeoutMs = 30000;
constexpr uint32_t kDownloadTimeoutMs = 20000;
constexpr uint16_t kDnsPort = 53;

struct DeviceConfig {
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

enum class Phase : uint8_t {
  Setup,
  Connecting,
  Ready,
  Downloading,
  Verifying,
  Preparing,
  Failed,
};

TFT_eSPI display;
ESP8266WebServer server(80);
DNSServer dns;
DeviceConfig config{};
Phase phase = Phase::Setup;
String statusMessage = "Enter Wi-Fi settings";
char accessPointName[32]{};
char accessPointPassword[9]{};
uint32_t connectStartedAt = 0;
int progressPercent = -1;
bool routesConfigured = false;
bool installRequested = false;
bool portalRunning = false;

const char kIndexHtml[] PROGMEM = R"HTML(
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Mini-Display Installer</title>
<style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#090e17;color:#f7f9fc}
body{margin:0;padding:24px;display:grid;place-items:center;min-height:100vh;box-sizing:border-box}
main{width:min(520px,100%);background:#19222f;border-radius:18px;padding:24px;box-sizing:border-box}
h1{margin:0 0 8px;font-size:1.6rem}p{color:#aab7c7}label{display:block;margin:16px 0 6px}
input,select,button{width:100%;box-sizing:border-box;padding:12px;border-radius:9px;border:1px solid #41536a;background:#0d1520;color:#fff;font:inherit}
button{margin-top:18px;background:#03a9f4;border:0;color:#041019;font-weight:700;cursor:pointer}
button:disabled{opacity:.45;cursor:default}.card{border:1px solid #34465c;border-radius:12px;padding:16px;margin-top:20px}
.tag{display:inline-block;background:#123b50;color:#63d2ff;padding:4px 9px;border-radius:999px;font-weight:700}
#status{min-height:24px;color:#ffd166}.hidden{display:none}.danger{color:#ff9a9a;font-size:.9rem}
</style>
</head>
<body><main>
<h1>Mini-Display Installer</h1>
<p>First connect this display to your home Wi-Fi.</p>
<form id="wifi">
<label for="ssid">Wi-Fi network</label><select id="ssid" name="ssid" required><option value="">Scan to select Wi-Fi</option></select>
<button id="scan" type="button">Scan Wi-Fi networks</button>
<label for="wifiPassword">Wi-Fi password</label><input id="wifiPassword" name="wifiPassword" type="password" maxlength="64">
<label for="devicePassword">Interface password (optional)</label><input id="devicePassword" name="devicePassword" type="password" minlength="8" maxlength="32" autocomplete="new-password">
<label for="devicePasswordRepeat">Repeat interface password</label><input id="devicePasswordRepeat" name="devicePasswordRepeat" type="password" minlength="8" maxlength="32" autocomplete="new-password">
<p id="formError" class="danger" role="alert"></p>
<button>Connect</button>
</form>
<div id="release" class="card hidden">
<span id="targetVersion" class="tag"></span>
<h2>Home Assistant Mini-Display</h2>
<p>SHA-256 verified SD PRO image.</p>
<p class="danger">Installation erases stock filesystem data. Do not disconnect power.</p>
<button id="install" type="button"></button>
</div>
<p id="status">Loading status...</p>
<button id="retry" type="button" class="hidden">Try again</button>
<script>
const form=document.querySelector('#wifi'),release=document.querySelector('#release'),statusText=document.querySelector('#status'),formError=document.querySelector('#formError'),install=document.querySelector('#install'),retry=document.querySelector('#retry'),scan=document.querySelector('#scan'),ssid=form.elements.ssid,devicePassword=form.elements.devicePassword,devicePasswordRepeat=form.elements.devicePasswordRepeat,targetVersionText=document.querySelector('#targetVersion');
let scanning=false;
let targetVersion='';
async function post(path,body=''){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});const text=await response.text();if(!response.ok)throw new Error(text);return text}
async function readScan(){try{const response=await fetch('/networks',{cache:'no-store'});if(response.status===202){setTimeout(readScan,700);return}if(!response.ok)throw new Error();const names=await response.json(),placeholder=Object.assign(document.createElement('option'),{value:'',textContent:names.length?'Select Wi-Fi':'No networks found'});ssid.replaceChildren(placeholder,...names.map(name=>Object.assign(document.createElement('option'),{value:name,textContent:name})));statusText.textContent=names.length?'Select a network':'No networks found'}catch(error){statusText.textContent='Scan failed'}scanning=false;scan.disabled=false}
scan.addEventListener('click',async()=>{scanning=true;scan.disabled=true;statusText.textContent='Scanning...';try{await post('/scan');setTimeout(readScan,700)}catch(error){scanning=false;statusText.textContent='Scan failed';scan.disabled=false}});
function validatePasswords(){const mismatch=devicePassword.value!==devicePasswordRepeat.value;devicePasswordRepeat.setCustomValidity(mismatch?'Interface passwords do not match':'');formError.textContent=mismatch?'Interface passwords do not match':'';return !mismatch}
devicePassword.addEventListener('input',validatePasswords);devicePasswordRepeat.addEventListener('input',validatePasswords);
form.addEventListener('submit',async event=>{event.preventDefault();if(!validatePasswords()||!form.reportValidity())return;scanning=false;formError.textContent='';statusText.textContent='Connecting...';try{await post('/connect',new URLSearchParams(new FormData(form)));}catch(error){formError.textContent=error.message}});
install.addEventListener('click',async()=>{install.disabled=true;statusText.textContent='Starting installation...';try{await post('/install','version='+encodeURIComponent(targetVersion))}catch(error){statusText.textContent=error.message;install.disabled=false}});
retry.addEventListener('click',()=>location.reload());
async function poll(){try{const state=await fetch('/status',{cache:'no-store'}).then(response=>response.json());targetVersion=state.targetVersion;targetVersionText.textContent='v'+targetVersion;install.textContent='Install v'+targetVersion;if(!scanning)statusText.textContent=state.message+(state.progress>=0?' ('+state.progress+'%)':'');const ready=state.phase==='ready';release.classList.toggle('hidden',!ready);form.classList.toggle('hidden',ready);retry.classList.toggle('hidden',state.phase!=='failed');}catch(error){}setTimeout(poll,1000)}poll();
</script>
</main></body></html>
)HTML";

uint32_t configChecksum(const DeviceConfig &value) {
  const auto *bytes = reinterpret_cast<const uint8_t *>(&value);
  uint32_t hash = 2166136261UL;
  for (size_t index = 0; index < offsetof(DeviceConfig, checksum); ++index) {
    hash ^= bytes[index];
    hash *= 16777619UL;
  }
  return hash;
}

bool clearConfig() {
  EEPROM.begin(kEepromSize);
  memset(&config, 0, sizeof(config));
  EEPROM.put(0, config);
  return EEPROM.commit();
}

bool saveConfig() {
  config.magic = kConfigMagic;
  config.checksum = configChecksum(config);
  EEPROM.put(0, config);
  return EEPROM.commit();
}

const char *phaseName() {
  switch (phase) {
    case Phase::Setup: return "setup";
    case Phase::Connecting: return "connecting";
    case Phase::Ready: return "ready";
    case Phase::Downloading: return "downloading";
    case Phase::Verifying: return "verifying";
    case Phase::Preparing: return "preparing";
    case Phase::Failed: return "failed";
  }
  return "failed";
}

String clipped(const String &value, size_t limit = 27) {
  return value.length() <= limit ? value : value.substring(0, limit);
}

void drawFrame(uint16_t accent) {
  const uint16_t background = display.color565(9, 14, 23);
  const uint16_t panel = display.color565(25, 34, 47);
  display.fillScreen(background);
  display.fillRoundRect(12, 12, 216, 216, 12, panel);
  display.fillRoundRect(12, 12, 216, 6, 3, accent);
  display.setTextDatum(MC_DATUM);
  display.setTextColor(TFT_WHITE, panel);
  display.drawString("HA MINI-DISPLAY", 120, 38, 4);
  display.setTextColor(accent, panel);
  display.drawString(String("INSTALLER v") + kInstallerVersion, 120, 66, 2);
}

void drawStatus() {
  const uint16_t panel = display.color565(25, 34, 47);
  const uint16_t accent = phase == Phase::Failed
                              ? TFT_RED
                              : display.color565(3, 169, 244);
  drawFrame(accent);
  display.setTextColor(TFT_WHITE, panel);
  if (phase == Phase::Setup || phase == Phase::Ready) {
    display.drawString("Connect to", 120, 96, 2);
    display.drawString(accessPointName, 120, 119, 2);
    display.setTextColor(display.color565(255, 209, 102), panel);
    display.drawString("Password:", 120, 143, 2);
    display.drawString(accessPointPassword, 120, 163, 2);
    display.setTextColor(TFT_WHITE, panel);
    display.drawString("192.168.4.1", 120, 196, 4);
    return;
  }
  display.drawString(clipped(statusMessage), 120, 111, 2);
  if (phase == Phase::Downloading && progressPercent >= 0) {
    display.drawRoundRect(30, 143, 180, 16, 6, TFT_WHITE);
    if (progressPercent > 0) {
      display.fillRoundRect(32, 145, progressPercent * 176 / 100, 12, 4,
                            accent);
    }
    display.drawString(String(progressPercent) + "%", 120, 184, 4);
  } else if (phase == Phase::Failed) {
    display.drawString("Open 192.168.4.1", 120, 178, 2);
  }
}

void setStatus(Phase nextPhase, const String &message, int progress = -1) {
  phase = nextPhase;
  statusMessage = message;
  progressPercent = progress;
  Serial.printf("[installer] %s: %s", phaseName(), message.c_str());
  if (progress >= 0) Serial.printf(" (%d%%)", progress);
  Serial.println();
  drawStatus();
}

String jsonEscape(const String &value) {
  String escaped;
  escaped.reserve(value.length() + 8);
  for (size_t index = 0; index < value.length(); ++index) {
    const char character = value[index];
    if (character == '"' || character == '\\') escaped += '\\';
    if (character == '\n' || character == '\r') {
      escaped += ' ';
    } else {
      escaped += character;
    }
  }
  return escaped;
}

void sendStatus() {
  String body;
  body.reserve(240);
  body += F("{\"phase\":\"");
  body += phaseName();
  body += F("\",\"message\":\"");
  body += jsonEscape(statusMessage);
  body += F("\",\"progress\":");
  body += progressPercent;
  body += F(",\"wifiConnected\":");
  body += WiFi.status() == WL_CONNECTED ? F("true") : F("false");
  body += F(",\"targetVersion\":\"");
  body += kInstallerVersion;
  body += '"';
  body += '}';
  server.sendHeader(F("Cache-Control"), F("no-store"));
  server.send(200, F("application/json"), body);
}

void sendNetworks() {
  const int count = WiFi.scanComplete();
  if (count == WIFI_SCAN_RUNNING) {
    server.send(202, F("application/json"), F("[]"));
    return;
  }
  if (count < 0) {
    server.send(503, F("text/plain"), F("Wi-Fi scan failed"));
    return;
  }
  String body = "[";
  bool first = true;
  for (int index = 0; index < count; ++index) {
    const String ssid = WiFi.SSID(index);
    if (ssid.isEmpty()) continue;
    bool duplicate = false;
    for (int previous = 0; previous < index; ++previous) {
      if (WiFi.SSID(previous) == ssid) {
        duplicate = true;
        break;
      }
    }
    if (duplicate) continue;
    if (!first) body += ',';
    body += '"';
    body += jsonEscape(ssid);
    body += '"';
    first = false;
  }
  body += ']';
  Serial.printf("[installer] Wi-Fi scan completed: %d networks\n", count);
  WiFi.scanDelete();
  server.sendHeader(F("Cache-Control"), F("no-store"));
  server.send(200, F("application/json"), body);
}

void startNetworkScan() {
  if (WiFi.scanComplete() == WIFI_SCAN_RUNNING) {
    server.send(202, F("text/plain"), F("Scan already running"));
    return;
  }
  WiFi.scanDelete();
  if (WiFi.scanNetworks(true, true) == WIFI_SCAN_FAILED) {
    server.send(503, F("text/plain"), F("Cannot start Wi-Fi scan"));
    return;
  }
  Serial.println(F("[installer] Wi-Fi scan started"));
  server.send(202, F("text/plain"), F("Scan started"));
}

void beginConnection() {
  WiFi.persistent(false);
  WiFi.mode(WIFI_AP_STA);
  WiFi.hostname("mini-display-installer");
  WiFi.begin(config.ssid, config.wifiPassword);
  connectStartedAt = millis();
  setStatus(Phase::Connecting, "Connecting to " + clipped(config.ssid, 20));
}

void handleConnect() {
  const String ssid = server.arg("ssid");
  const String wifiPassword = server.arg("wifiPassword");
  const String devicePassword = server.arg("devicePassword");
  const String devicePasswordRepeat = server.arg("devicePasswordRepeat");
  if (ssid.isEmpty() || ssid.length() > 32 || wifiPassword.length() > 64 ||
      devicePassword.length() > 32 ||
      (!devicePassword.isEmpty() && devicePassword.length() < 8)) {
    server.send(400, F("text/plain"), F("Invalid Wi-Fi or interface password"));
    return;
  }
  if (devicePassword != devicePasswordRepeat) {
    server.send(400, F("text/plain"), F("Interface passwords do not match"));
    return;
  }

  memset(&config, 0, sizeof(config));
  strlcpy(config.ssid, ssid.c_str(), sizeof(config.ssid));
  strlcpy(config.wifiPassword, wifiPassword.c_str(),
          sizeof(config.wifiPassword));
  strlcpy(config.apiPassword, devicePassword.c_str(),
          sizeof(config.apiPassword));
  strlcpy(config.otaPassword, devicePassword.c_str(),
          sizeof(config.otaPassword));
  strlcpy(config.username, "admin", sizeof(config.username));
  const bool passwordEnabled = !devicePassword.isEmpty();
  config.apiAuthEnabled = passwordEnabled ? 1 : 0;
  config.otaAuthEnabled = passwordEnabled ? 1 : 0;
  config.wifiRetryLimit = 3;
  config.directOtaEnabled = passwordEnabled ? 1 : 0;
  server.send(202, F("text/plain"), F("Connecting"));
  beginConnection();
}

void handleInstall() {
  if (phase != Phase::Ready || WiFi.status() != WL_CONNECTED) {
    server.send(409, F("text/plain"), F("Wi-Fi is not connected"));
    return;
  }
  if (server.arg("version") != kInstallerVersion) {
    server.send(400, F("text/plain"), F("Unsupported firmware version"));
    return;
  }
  installRequested = true;
  server.send(202, F("text/plain"), F("Installation started"));
}

void configureRoutes() {
  if (routesConfigured) return;
  server.on("/", HTTP_GET, [] {
    server.sendHeader(F("Cache-Control"), F("no-store"));
    server.send_P(200, PSTR("text/html"), kIndexHtml);
  });
  server.on("/status", HTTP_GET, sendStatus);
  server.on("/scan", HTTP_POST, startNetworkScan);
  server.on("/networks", HTTP_GET, sendNetworks);
  server.on("/connect", HTTP_POST, handleConnect);
  server.on("/install", HTTP_POST, handleInstall);
  server.onNotFound([] {
    server.sendHeader(F("Location"), F("http://192.168.4.1/"), true);
    server.send(302, F("text/plain"), F("Open installer"));
  });
  routesConfigured = true;
}

void startPortal() {
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(accessPointName, accessPointPassword);
  dns.start(kDnsPort, "*", WiFi.softAPIP());
  server.begin();
  portalRunning = true;
}

void stopPortal() {
  dns.stop();
  server.stop();
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  portalRunning = false;
  delay(100);
}

bool hexNibble(char value, uint8_t &result) {
  if (value >= '0' && value <= '9') {
    result = value - '0';
    return true;
  }
  if (value >= 'a' && value <= 'f') {
    result = value - 'a' + 10;
    return true;
  }
  if (value >= 'A' && value <= 'F') {
    result = value - 'A' + 10;
    return true;
  }
  return false;
}

bool sha256Matches(const uint8_t actual[32]) {
  for (size_t index = 0; index < 32; ++index) {
    uint8_t high = 0;
    uint8_t low = 0;
    if (!hexNibble(kFirmwareSha256[index * 2], high) ||
        !hexNibble(kFirmwareSha256[index * 2 + 1], low) ||
        actual[index] != static_cast<uint8_t>((high << 4) | low)) {
      return false;
    }
  }
  return true;
}

void abortUpdate() {
  if (Update.isRunning()) Update.end(false);
}

void restorePortalAfterFailure(const String &message) {
  abortUpdate();
  startPortal();
  setStatus(Phase::Failed, message);
}

bool downloadAndStageFirmware() {
  stopPortal();
  const String downloadMessage = String("Downloading v") + kInstallerVersion;
  setStatus(Phase::Downloading, downloadMessage, 0);

  BearSSL::WiFiClientSecure client;
  // Authenticity is enforced by the compiled SHA-256 below. Insecure TLS can
  // only cause denial of service; altered bytes are never activated.
  client.setInsecure();
  client.setTimeout(kDownloadTimeoutMs);

  HTTPClient http;
  http.useHTTP10(true);
  http.setTimeout(kDownloadTimeoutMs);
  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  http.setRedirectLimit(4);
  http.setUserAgent(String("Mini-Display-Bootstrap/") + kInstallerVersion);
  const String firmwareUrl = String(kFirmwareRepositoryUrl) +
                             kInstallerVersion + "/" +
                             kFirmwareAssetPrefix + kInstallerVersion + ".bin";
  if (!http.begin(client, firmwareUrl)) {
    restorePortalAfterFailure("Cannot open GitHub URL");
    return false;
  }

  const int status = http.GET();
  if (status != HTTP_CODE_OK) {
    const String message = "GitHub HTTP " + String(status);
    http.end();
    restorePortalAfterFailure(message);
    return false;
  }
  const int contentLength = http.getSize();
  if (contentLength <= 0) {
    http.end();
    restorePortalAfterFailure("Firmware size unavailable");
    return false;
  }
  const size_t firmwareSize = static_cast<size_t>(contentLength);
  if (!Update.begin(firmwareSize, U_FLASH)) {
    const String message = "OTA space: " + Update.getErrorString();
    http.end();
    restorePortalAfterFailure(message);
    return false;
  }

  br_sha256_context hash;
  br_sha256_init(&hash);
  WiFiClient *stream = http.getStreamPtr();
  uint8_t buffer[1024];
  uint8_t finalByte = 0;
  size_t received = 0;
  uint32_t lastDataAt = millis();
  int shownProgress = 0;

  while (received < firmwareSize) {
    const size_t available = stream->available();
    if (!available) {
      if (!http.connected() || millis() - lastDataAt > kDownloadTimeoutMs) {
        http.end();
        restorePortalAfterFailure("Download interrupted");
        return false;
      }
      delay(1);
      continue;
    }

    const size_t wanted = min(
        min(available, sizeof(buffer)), firmwareSize - received);
    const int count = stream->read(buffer, wanted);
    if (count <= 0) {
      delay(1);
      continue;
    }
    lastDataAt = millis();
    br_sha256_update(&hash, buffer, count);

    size_t writable = count;
    if (received + count == firmwareSize) {
      finalByte = buffer[count - 1];
      --writable;
    }
    if (writable && Update.write(buffer, writable) != writable) {
      const String message = "Flash write: " + Update.getErrorString();
      http.end();
      restorePortalAfterFailure(message);
      return false;
    }
    received += count;

    const int nextProgress = static_cast<int>(received * 100 / firmwareSize);
    if (nextProgress >= shownProgress + 5) {
      shownProgress = nextProgress;
      setStatus(Phase::Downloading, downloadMessage, shownProgress);
    }
    yield();
  }
  http.end();

  setStatus(Phase::Verifying, "Checking SHA-256");
  uint8_t digest[32];
  br_sha256_out(&hash, digest);
  if (!sha256Matches(digest)) {
    restorePortalAfterFailure("SHA-256 mismatch");
    return false;
  }

  setStatus(Phase::Preparing, "Preparing storage");
  if (!LittleFS.format()) {
    restorePortalAfterFailure("Filesystem format failed");
    return false;
  }
  if (!saveConfig()) {
    restorePortalAfterFailure("Cannot save configuration");
    return false;
  }
  if (Update.write(&finalByte, 1) != 1 || !Update.end()) {
    restorePortalAfterFailure("Firmware validation failed");
    return false;
  }

  setStatus(Phase::Preparing, "Installed. Restarting...");
  Serial.println(F("[installer] verified image staged; restarting"));
  Serial.flush();
  delay(1500);
  ESP.restart();
  return true;
}

}  // namespace

void setup() {
  Serial.begin(115200);
  // Leave time for a UART monitor to attach after esptool releases the port.
  delay(2000);
  Serial.println();
  Serial.printf("Mini-Display SD PRO bootstrap for v%s\n", kInstallerVersion);
  Serial.printf("[installer] sketch=%u freeSketch=%u flash=%u\n",
                ESP.getSketchSize(), ESP.getFreeSketchSpace(),
                ESP.getFlashChipRealSize());

  pinMode(TFT_BL, OUTPUT);
  digitalWrite(TFT_BL, TFT_BACKLIGHT_ON);
  display.init();
  display.setRotation(0);
  display.setTextWrap(false, false);

  snprintf(accessPointName, sizeof(accessPointName),
           "HA-MiniDisplay-Installer-%04X", ESP.getChipId() & 0xFFFF);
  snprintf(accessPointPassword, sizeof(accessPointPassword), "disp%04u",
           ESP.getChipId() % 10000);
  configureRoutes();
  const bool configCleared = clearConfig();
  startPortal();
  setStatus(Phase::Setup, "Enter Wi-Fi settings");
  if (!configCleared) {
    Serial.println(F("[installer] warning: failed to clear saved settings"));
  }
}

void loop() {
  if (portalRunning) {
    dns.processNextRequest();
    server.handleClient();
  }

  if (phase == Phase::Connecting) {
    if (WiFi.status() == WL_CONNECTED) {
      if (!saveConfig()) {
        setStatus(Phase::Failed, "Cannot save configuration");
      } else {
        setStatus(Phase::Ready, "Wi-Fi connected");
        Serial.printf("[installer] station IP: %s\n",
                      WiFi.localIP().toString().c_str());
      }
    } else if (millis() - connectStartedAt >= kConnectTimeoutMs) {
      WiFi.disconnect();
      setStatus(Phase::Failed, "Check Wi-Fi and try again");
    }
  }

  if (installRequested) {
    installRequested = false;
    downloadAndStageFirmware();
  }
  delay(2);
}
