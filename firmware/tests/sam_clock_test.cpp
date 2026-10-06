#include <cassert>
#include <cstdlib>
#include <map>
#include <string>
#include "SamClockPolicy.h"
#include "StandaloneWeather.h"

int main() {
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
}
