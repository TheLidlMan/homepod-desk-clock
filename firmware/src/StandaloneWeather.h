#pragma once
#include "ClockConfig.h"

#include <ArduinoJson.h>
#include <ESP8266WiFi.h>
#include <cmath>
#include <time.h>
#include "SamClockPolicy.h"

// Bounded, cooperative HTTP reader. Only public village-level weather crosses
// this unencrypted connection; no credentials or music metadata are sent.
class StandaloneWeather {
 public:
  time_t lastSuccess() const { return lastSuccess_; }
  bool busy() const { return busy_; }
  uint8_t error() const { return static_cast<uint8_t>(error_); }
  uint16_t httpStatus() const { return httpStatus_; }
  uint8_t networkFailures() const { return networkFailures_; }
  bool networkStalled(uint32_t now) const {
    return !busy_ && networkFailures_ >= 3 &&
           now - firstNetworkFailureAt_ >= kClockNetworkStallMs;
  }
  void resetNetworkFailures() {
    finish();
    networkFailures_ = 0;
    nextFetch_ = millis();
  }

  template <typename SetValue>
  void update(SetValue setValue) {
    const uint32_t tick = millis();
    const time_t now = time(nullptr);
    if (now < 1000000000) return;
    if (!busy_) {
      if (lastSuccess_ == 0 || now - lastSuccess_ > 7200) {
        setValue("temperature", "--°");
        setValue("range", "Weather unavailable");
        setValue("rain", "Forecast unavailable");
      } else if (now - lastSuccess_ > 1800) {
        setValue("rain", "Forecast needs refresh");
      }
      if (static_cast<int32_t>(tick - nextFetch_) < 0 ||
          WiFi.status() != WL_CONNECTED) return;
      nextFetch_ = tick + 60000;
      receivedResponse_ = false;
      httpStatus_ = 0;
      client_.setTimeout(1200);
      if (!client_.connect("api.open-meteo.com", 80)) { fail(Error::Connect); return; }
      client_.print(F("GET /v1/forecast?latitude=" DESK_WEATHER_LATITUDE "&longitude=" DESK_WEATHER_LONGITUDE "&current=temperature_2m,precipitation&daily=temperature_2m_max,temperature_2m_min&hourly=precipitation_probability,rain,showers&timezone=" DESK_WEATHER_TIMEZONE "&forecast_days=2&forecast_hours=25&timeformat=unixtime HTTP/1.0\r\nHost: api.open-meteo.com\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n"));
      header_ = String();
      body_ = String();
      body_.reserve(2048);
      headersDone_ = false;
      busy_ = true;
      started_ = tick;
    }
    if (millis() - started_ > 6000) { fail(Error::Timeout); return; }
    for (uint16_t count = 0; count < 512 && client_.available(); ++count) {
      const char ch = static_cast<char>(client_.read());
      receivedResponse_ = true;
      networkFailures_ = 0;
      if (!headersDone_) {
        header_ += ch;
        if (header_.length() > 1024) { fail(Error::Headers); return; }
        if (header_.endsWith("\r\n\r\n")) {
          const char *status = header_.c_str();
          if (header_.length() >= 12 && status[9] >= '0' && status[9] <= '9' &&
              status[10] >= '0' && status[10] <= '9' && status[11] >= '0' && status[11] <= '9')
            httpStatus_ = (status[9] - '0') * 100 + (status[10] - '0') * 10 + status[11] - '0';
          if (!(header_.startsWith("HTTP/1.1 200 ") ||
                header_.startsWith("HTTP/1.0 200 ")) ||
              header_.indexOf("chunked") >= 0) { fail(Error::Headers); return; }
          headersDone_ = true;
          header_ = String();
        }
      } else {
        if (body_.length() >= 4096) { fail(Error::BodyLimit); return; }
        body_ += ch;
      }
    }
    if (!client_.connected() && !client_.available()) {
      if (headersDone_ && parse(now, setValue)) {
        lastSuccess_ = now;
        nextFetch_ = millis() + 900000;
        error_ = Error::None;
      } else {
        error_ = headersDone_ ? Error::Forecast : Error::Headers;
      }
      finish();
    }
  }

 private:
  enum class Error : uint8_t { None, Connect, Timeout, Headers, BodyLimit, Forecast };
  void fail(Error error) {
    error_ = error;
    // An HTTP error or malformed forecast proves the network is alive.
    if (!receivedResponse_ && (error == Error::Connect || error == Error::Timeout)) {
      if (!networkFailures_) firstNetworkFailureAt_ = millis();
      if (networkFailures_ < 255) ++networkFailures_;
    }
    finish();
  }
  void finish() {
    client_.stop(20);
    client_ = WiFiClient();
    header_ = String();
    body_ = String();
    busy_ = false;
  }

  template <typename SetValue>
  bool parse(time_t now, SetValue setValue) {
    StaticJsonDocument<128> filter;
    filter["current"] = true;
    filter["daily"] = true;
    filter["hourly"] = true;
    DynamicJsonDocument data(JSON_OBJECT_SIZE(16) + JSON_ARRAY_SIZE(110) + 768);
    if (deserializeJson(data, body_.c_str(), DeserializationOption::Filter(filter))) return false;
    JsonObjectConst current = data["current"];
    JsonObjectConst daily = data["daily"];
    JsonObjectConst hourly = data["hourly"];
    const time_t measured = current["time"] | 0L;
    if (measured < now - 3600 || measured > now + 900 ||
        !current["temperature_2m"].is<float>() ||
        !daily["temperature_2m_min"][0].is<float>() ||
        !daily["temperature_2m_max"][0].is<float>()) return false;
    struct tm today{}, forecastDay{};
    localtime_r(&now, &today);
    const time_t day = daily["time"][0] | 0L;
    localtime_r(&day, &forecastDay);
    if (today.tm_year != forecastDay.tm_year || today.tm_yday != forecastDay.tm_yday) return false;
    const float temp = current["temperature_2m"], low = daily["temperature_2m_min"][0],
                high = daily["temperature_2m_max"][0];
    if (!std::isfinite(temp) || !std::isfinite(low) || !std::isfinite(high) || low > high ||
        temp < -90 || temp > 60 || low < -90 || high > 60) return false;
    char temperature[16], range[48], rainText[48] = "Rain forecast unavailable";
    snprintf(temperature, sizeof(temperature), "%d°", static_cast<int>(lroundf(temp)));
    snprintf(range, sizeof(range), "%d–%d° today", static_cast<int>(lroundf(low)), static_cast<int>(lroundf(high)));
    const float precipitation = current["precipitation"] | -1.0F;
    if (precipitation >= .1F) {
      strlcpy(rainText, "Rain now", sizeof(rainText));
    } else {
      time_t first = 0, last = 0;
      bool complete = true, found = false;
      JsonArrayConst times = hourly["time"];
      for (size_t i = 0; i < times.size(); ++i) {
        const time_t hour = times[i] | 0L;
        if (hour + 3600 <= now) continue;
        if (hour > now + 86400) break;
        JsonVariantConst probability = hourly["precipitation_probability"][i],
                         rain = hourly["rain"][i], showers = hourly["showers"][i];
        if (!probability.is<float>() || !rain.is<float>() || !showers.is<float>()) {
          complete = false; continue;
        }
        const float chance = probability, amount = rain.as<float>() + showers.as<float>();
        if (!std::isfinite(chance) || !std::isfinite(amount)) { complete = false; continue; }
        if (last && hour != last + 3600) complete = false;
        if (!first) first = hour;
        last = hour;
        if (chance >= 60 && amount >= .1F) {
          if (hour - now <= 3600) strlcpy(rainText, "Rain likely within an hour", sizeof(rainText));
          else snprintf(rainText, sizeof(rainText), "Rain likely in %ldh", static_cast<long>((hour - now + 1800) / 3600));
          found = true; break;
        }
      }
      if (!found && complete && first <= now && last >= now + 82800)
        strlcpy(rainText, "No rain expected in 24h", sizeof(rainText));
    }
    setValue("temperature", temperature);
    setValue("range", range);
    setValue("rain", rainText);
    return true;
  }

  WiFiClient client_;
  String header_, body_;
  uint32_t started_ = 0, nextFetch_ = 0;
  time_t lastSuccess_ = 0;
  bool busy_ = false, headersDone_ = false, receivedResponse_ = false;
  uint8_t networkFailures_ = 0;
  uint16_t httpStatus_ = 0;
  uint32_t firstNetworkFailureAt_ = 0;
  Error error_ = Error::None;
};
