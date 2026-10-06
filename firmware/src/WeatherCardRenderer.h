#pragma once

#include <ArduinoJson.h>
#include "WeatherValue.h"

inline String weatherDescription(uint8_t condition, bool polish) {
  static const char english[][24] PROGMEM = {
    "Clear night", "Cloudy", "Fog", "Hail", "Thunder", "Thunder / rain",
    "Partly cloudy", "Heavy rain", "Rain", "Snow", "Sleet", "Sunny",
    "Windy", "Wind / clouds", "Exceptional", "Unavailable"};
  static const char translated[][24] PROGMEM = {
    "Pogodna noc", "Pochmurno", "Mgła", "Grad", "Burza", "Burza / deszcz",
    "Zachmurzenie", "Ulewa", "Deszcz", "Śnieg", "Deszcz / śnieg", "Słonecznie",
    "Wiatr", "Wiatr / chmury", "Ekstremalnie", "Brak danych"};
  return String(FPSTR(polish ? translated[condition] : english[condition]));
}

template <typename FindValue, typename AddLine, typename AddIcon>
bool compileWeatherContent(JsonObjectConst card, int16_t x, int16_t y,
                         int16_t width, int16_t height,
                         FindValue findValue, AddLine addLine, AddIcon addIcon) {
  JsonObjectConst settings = card["weather"];
  JsonArrayConst fields = settings["fields"];
  JsonArrayConst sources = settings["sources"];
  const uint8_t count = min<size_t>(5, sources.size());
  if (!count) return addLine("--", x, y, width, height);
  const bool polish = strcmp(settings["language"] | "en", "pl") == 0;
  const auto enabled = [&](const char *name) {
    if (fields.isNull()) return strcmp(name,"icon")==0 || strcmp(name,"condition")==0 || strcmp(name,"temperature")==0;
    for (const char *field : fields) if (field && strcmp(field, name) == 0) return true;
    return false;
  };
  for (uint8_t i = 0; i < count; ++i) {
    const auto *source = findValue(sources[i] | "", false);
    WeatherValue value(source ? source->state : nullptr, source && source->available);
    const int16_t left = x + int32_t(i) * width / count;
    const int16_t cellWidth = int32_t(i+1) * width / count - (left-x);
    String lines[7];
    uint8_t lineCount = 0;
    const String temperatureUnit = settings["temperatureUnit"] | "";
    if (enabled("label")) lines[lineCount++] = value.fields[6][0] ? String(value.fields[6]) : String("--");
    if (enabled("condition")) lines[lineCount++] = weatherDescription(value.available ? value.condition : 15, polish);
    if (enabled("temperature")) lines[lineCount++] = String(value.available && value.fields[1][0] ? value.fields[1] : "--") + temperatureUnit;
    if (enabled("low")) lines[lineCount++] = String("Min ") + (value.available && value.fields[2][0] ? value.fields[2] : "--") + temperatureUnit;
    if (enabled("humidity")) lines[lineCount++] = String("RH ") + (value.available && value.fields[3][0] ? value.fields[3] : "--") + "%";
    if (enabled("precipitation")) lines[lineCount++] = String(polish ? "Deszcz " : "Rain ") + (value.available && value.fields[4][0] ? value.fields[4] : "--") + "%";
    if (enabled("wind")) lines[lineCount++] = String(value.available && value.fields[5][0] ? value.fields[5] : "--") + " " + (settings["windUnit"] | "");
    int16_t textX = left, textY = y, textWidth = cellWidth, textHeight = height;
    if (enabled("icon")) {
      const bool beside = strcmp(settings["layout"] | "vertical", "horizontal") == 0;
      const bool compact = strcmp(settings["layout"] | "vertical", "compact") == 0;
      const int16_t maxSize = lineCount ? (beside ? min<int16_t>(height,cellWidth/2) : min<int16_t>(cellWidth,height*2/(lineCount+2))) : min(cellWidth,height);
      const uint8_t size = maxSize >= 96 && !compact ? 96 : maxSize >= 48 && !compact ? 48 : 24;
      if (maxSize >= 24) {
        const int16_t iconX = beside && lineCount ? left+size/2 : left+cellWidth/2;
        const int16_t iconY = beside || !lineCount ? y+height/2 : y+size/2;
        if (!addIcon(value.available ? value.condition : 15, size, iconX, iconY,
                       strcmp(settings["iconStyle"] | "color", "mono") != 0)) return false;
        if (lineCount) {
          if (beside) { textX += size+2; textWidth -= size+2; }
          else { textY += size+2; textHeight -= size+2; }
        }
      }
    }
    for (uint8_t line = 0; line < lineCount; ++line) {
      const int16_t top = textY + int32_t(line) * textHeight / lineCount;
      const int16_t bottom = textY + int32_t(line+1) * textHeight / lineCount;
      if (bottom > top && !addLine(lines[line], textX, top, textWidth, bottom-top)) return false;
    }
  }
  return true;
}
