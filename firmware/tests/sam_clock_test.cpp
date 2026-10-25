#include <cassert>
#include <cstdlib>
#include <map>
#include <string>
#include "SamClockPolicy.h"
#include "StandaloneWeather.h"

int main() {
  assert(clockNativePollAllowed(false, -1, false));
  assert(!clockNativePollAllowed(false, 1, false));
  assert(clockNativePollAllowed(false, 1, true));
  assert(!clockNativePollAllowed(true, 1, true));

  for (uint8_t hour = 0; hour < 24; ++hour)
    assert(clockNightHour(hour) == (hour >= 23 || hour < 7));
  assert(clockBrightness(70, true) == 8);
  assert(clockBrightness(70, false) == 70);
  assert(clockBrightness(0, true) == 0);
  assert(!clockMusicExpired(25000, 0, true));
  assert(clockMusicExpired(25001, 0, true));
  assert(clockMusicExpired(10, UINT32_MAX - 25000, true));
  assert(!clockMusicExpired(10, UINT32_MAX - 20, true));
  assert(!clockMusicAvailable(0, 0, false, true));
  assert(!clockMusicAvailable(10, 0, true, false));
  assert(clockMusicAvailable(25000, 0, true, true));
  assert(!clockMusicAvailable(25001, 0, true, true));
  assert(clockMusicAvailable(10, UINT32_MAX - 20, true, true));

  setenv("TZ", "Europe/London", 1);
  tzset();
  const time_t now = time(nullptr);
  struct tm local{};
  localtime_r(&now, &local);
  local.tm_hour = local.tm_min = local.tm_sec = 0;
  const time_t day = mktime(&local), hour = now - now % 3600;
  DynamicJsonDocument data(10000);
  data["current"]["time"] = now;
  data["current"]["temperature_2m"] = 17;
  data["current"]["precipitation"] = 0;
  data["daily"]["time"][0] = day;
  data["daily"]["temperature_2m_min"][0] = 10;
  data["daily"]["temperature_2m_max"][0] = 20;
  for (int i = 0; i < 25; ++i) {
    data["hourly"]["time"][i] = hour + i * 3600;
    data["hourly"]["precipitation_probability"][i] = 0;
    data["hourly"]["rain"][i] = 0;
    data["hourly"]["showers"][i] = 0;
  }
  const auto run = [&](const char *status = "HTTP/1.0 200 OK") {
    std::string body;
    serializeJson(data, body);
    weatherTestResponse = std::string(status) + "\r\nConnection: close\r\n\r\n" + body;
    weatherTestTick = 0;
    StandaloneWeather weather;
    std::map<std::string, std::string> values;
    for (int i = 0; i < 20; ++i) {
      weather.update([&](const char *name, const char *value) { values[name] = value; });
      ++weatherTestTick;
    }
    return values;
  };
  auto values = run();
  assert(values["temperature"] == "17°");
  assert(values["range"] == "10–20° today");
  assert(values["rain"] == "No rain expected in 24h");
  data["hourly"]["precipitation_probability"][3] = 80;
  data["hourly"]["rain"][3] = .2;
  assert(run()["rain"].find("Rain likely in ") == 0);
  data["current"]["precipitation"] = .2;
  assert(run()["rain"] == "Rain now");
  assert(run("HTTP/1.0 503 Unavailable")["temperature"] == "--°");
  data["current"]["temperature_2m"] = nullptr;
  assert(run()["temperature"] == "--°");
  data["current"]["temperature_2m"] = 17;
  data["current"]["precipitation"] = 0;
  data["hourly"]["rain"][3] = 0;
  data["hourly"]["rain"][4] = nullptr;
  assert(run()["rain"] == "Rain forecast unavailable");
  // A provider error must not be mistaken for a dead Wi-Fi connection.
  weatherTestResponse = "HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n{}";
  StandaloneWeather limited;
  for (unsigned i = 0; i <= 12; ++i) {
    weatherTestTick = i * 60000;
    limited.update([](const char *, const char *) {});
  }
  assert(limited.httpStatus() == 429 && limited.error() == 3);
  assert(!limited.networkStalled(weatherTestTick) && limited.networkFailures() == 0);

  weatherTestConnectSucceeds = false;
  weatherTestTick = 0;
  StandaloneWeather lost;
  for (unsigned i = 0; i < 10; ++i) {
    weatherTestTick = i * 60000;
    lost.update([](const char *, const char *) {});
    assert(!lost.networkStalled(weatherTestTick));
  }
  weatherTestTick = kClockNetworkStallMs;
  lost.update([](const char *, const char *) {});
  assert(lost.networkStalled(weatherTestTick) && lost.error() == 1);
  assert(clockNetworkRecoveryAllowed(weatherTestTick, 0, false));
  assert(!clockNetworkRecoveryAllowed(weatherTestTick, 0, true));
  assert(!clockNetworkRecoveryAllowed(weatherTestTick, weatherTestTick - 1000, false));
  lost.resetNetworkFailures();
  assert(!lost.networkStalled(weatherTestTick) && lost.networkFailures() == 0);

  // Retry and idle ages remain valid when the monotonic timer wraps.
  weatherTestTick = UINT32_MAX - 120000;
  StandaloneWeather wrapped;
  wrapped.resetNetworkFailures();
  wrapped.update([](const char *, const char *) {});
  for (unsigned i = 1; i <= 10; ++i) {
    weatherTestTick = UINT32_MAX - 120000 + i * 60000;
    wrapped.update([](const char *, const char *) {});
  }
  assert(wrapped.networkStalled(weatherTestTick));
  assert(clockNetworkRecoveryAllowed(weatherTestTick, UINT32_MAX - 120000, false));
  assert(!clockNetworkRecoveryAllowed(100, UINT32_MAX - 100, false));

  weatherTestConnectSucceeds = true;
  weatherTestKeepOpen = true;
  weatherTestResponse.clear();
  weatherTestTick = 0;
  StandaloneWeather silent;
  silent.update([](const char *, const char *) {});
  weatherTestTick = 6001;
  silent.update([](const char *, const char *) {});
  assert(silent.error() == 2 && silent.networkFailures() == 1);
  weatherTestResponse = "H";
  weatherTestTick = 0;
  StandaloneWeather partial;
  partial.update([](const char *, const char *) {});
  weatherTestTick = 6001;
  partial.update([](const char *, const char *) {});
  assert(partial.error() == 2 && partial.networkFailures() == 0);
  weatherTestKeepOpen = false;
  weatherTestResponse = "HTTP/1.0 200 OK\r\n\r\n";
  data["hourly"]["rain"][4] = 0;
  std::string restored;
  serializeJson(data, restored);
  weatherTestResponse += restored;
  lost.resetNetworkFailures();
  for (int i = 0; i < 20 && !lost.lastSuccess(); ++i) {
    lost.update([](const char *, const char *) {});
    ++weatherTestTick;
  }
  assert(lost.lastSuccess() && lost.error() == 0 && !lost.networkStalled(weatherTestTick));
  const uint32_t fetchedAt = weatherTestTick - 1;
  const unsigned calls = weatherTestConnectCalls;
  weatherTestTick = fetchedAt + 899999;
  lost.update([](const char *, const char *) {});
  assert(weatherTestConnectCalls == calls);
  weatherTestTick = fetchedAt + 900000;
  lost.update([](const char *, const char *) {});
  assert(weatherTestConnectCalls == calls + 1);


  assert(!clockRecoveryWifiRetryDue(60000, 0, false));
  assert(!clockRecoveryWifiRetryDue(59999, 0, true));
  assert(clockRecoveryWifiRetryDue(60000, 0, true));
  assert(!clockRecoveryWifiRetryDue(100, UINT32_MAX - 100, true));
  assert(clockRecoveryWifiRetryDue(99, UINT32_MAX - 59900, true));

}
