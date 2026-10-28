"""Exercise the actual loop's Wi-Fi recovery branch with a deterministic clock."""
from pathlib import Path
import os
import subprocess
import tempfile

root = Path(__file__).resolve().parents[2]
main = (root / 'firmware/src/main.cpp').read_text()
start = main.index('  if (wifiConfigured() && WiFi.status() != WL_CONNECTED) {', main.index('void loop()'))
end = main.index('  if (startupSequenceActive) {', start)
flow = main[start:end]
start = main.index('void showWifiConnectingScreen() {')
end = main.index('\nvoid updateWifiConnectedCountdown', start)
connecting = main[start:end]
source = r'''
#include <cassert>
#include <cstdint>
#include "SamClockPolicy.h"
constexpr int WL_CONNECTED = 3;
uint32_t tick = 0;
uint32_t millis() { return tick; }
void delay(int) {}
struct Wifi {
  int state = 3, reconnects = 0, begins = 0;
  int status() { return state; }
  void reconnect();
  void disconnect(bool off, bool erase) { assert(!off && !erase); state = 6; }
  void begin(const char*, const char*) { ++begins; }
} WiFi;
struct { bool stopped = false; void stop() { stopped = true; } } samHomePod;
struct { bool released = false; void resetNetworkFailures() { released = true; } } standaloneWeather;
struct { bool cleared = false; void clear() { cleared = true; } } pageDefinition;
void Wifi::reconnect() {
  assert(samHomePod.stopped && standaloneWeather.released && pageDefinition.cleared);
  ++reconnects;
}
struct { uint8_t wifiRetryLimit = 3; const char *ssid = "test", *wifiPassword = "test"; } config;
bool startupSequenceActive = false, wifiWasConnected = true, wifiOutageActive = false;
uint32_t wifiOutageStartedAt = 0, connectStartedAt = 0, reconnectCount = 0;
int wifiAttemptCount = 0, lastDisconnectStatus = 0;
constexpr uint32_t kConnectTimeoutMs = 20000;
constexpr uint8_t kDefaultWifiRetryLimit = 3;
bool ap = false, clockCanRender = false;
struct Screens {
  unsigned shown = 0; uint32_t updated = 0;
  uint32_t setupUpdatedAt() { return updated; }
  void showConnecting(decltype(config)&, int, uint32_t, uint32_t) { ++shown; updated = tick; }
} startupScreens;
bool wifiConfigured() { return true; }
void setClockValue(const char*, const char*) {}
void startAccessPoint() { ap = true; }
void recordFreeHeap() {}
''' + connecting + '\nvoid step() {\n' + flow + r'''
  clockCanRender = true;
}
int main() {
  WiFi.state = 6;
  step();
  assert(WiFi.reconnects == 1 && wifiOutageActive && clockCanRender && !startupScreens.shown);
  tick = 20000; step();
  tick = 40000; step();
  tick = 59999; clockCanRender = false; step();
  assert(clockCanRender && !ap && !startupScreens.shown && wifiAttemptCount == 3);
  tick = 60000; clockCanRender = false; step();
  assert(ap && !clockCanRender);
  // Recovery resets the outage; a second drop has an independent grace period.
  WiFi.state = WL_CONNECTED; ap = false; step();
  assert(wifiWasConnected && !wifiOutageActive);
  tick = 70000; WiFi.state = 6; step();
  assert(wifiOutageStartedAt == 70000 && !startupScreens.shown);
  // Even a one-attempt setting must not open setup before 60 seconds.
  config.wifiRetryLimit = 1; tick = 90000; step();
  assert(!ap);
  tick = 129999; step(); assert(!ap);
  tick = 130000; step(); assert(ap);
  // Larger retry budgets show the warning at 60 seconds while retrying.
  ap = false; startupScreens.shown = 0; config.wifiRetryLimit = 10;
  wifiWasConnected = true; tick = 200000; step();
  tick = 220000; step(); tick = 240000; step(); tick = 260000; step();
  assert(!ap && startupScreens.shown == 1);
  // First-time setup retains its immediate connection instructions.
  startupSequenceActive = true; wifiWasConnected = true; tick = 300000; step();
  assert(startupScreens.shown == 2);
}
'''
with tempfile.TemporaryDirectory() as directory:
    cpp, binary = Path(directory) / 'wifi.cpp', Path(directory) / 'wifi'
    cpp.write_text(source)
    subprocess.run([os.environ.get('CXX', 'c++'), '-std=c++17', '-Wall', '-Wextra', '-Werror',
                    '-fsanitize=address,undefined', '-I' + str(root / 'firmware/src'),
                    str(cpp), '-o', str(binary)], check=True)
    subprocess.run([str(binary)], check=True)
print('Actual Wi-Fi loop: silent grace, rendering, buffer release, retry limits, recovery and setup passed')
