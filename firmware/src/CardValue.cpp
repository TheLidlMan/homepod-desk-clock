#include "CardValue.h"

#include <cmath>
#include <cstring>
#include <time.h>

#include "DecimalParser.h"
#include "TimeFormat.h"

namespace {

String compactNumber(float value) {
  String result(value, 4);
  while (result.endsWith("0")) result.remove(result.length() - 1);
  if (result.endsWith(".")) result.remove(result.length() - 1);
  if (result == "-0") return String("0");
  return result;
}

}  // namespace

NumberTransform CardValueResolver::numberTransform(JsonObjectConst card) const {
  NumberTransform result;
  JsonObjectConst source = card["valueTransform"];
  if (source.isNull()) return result;
  result.multiply = source["multiply"] | 1.0F;
  result.add = source["add"] | 0.0F;
  result.absolute = source["absolute"] | false;
  if (!source["minimum"].isNull()) result.minimum = source["minimum"];
  if (!source["maximum"].isNull()) result.maximum = source["maximum"];
  if (!source["precision"].isNull()) result.precision = source["precision"];
  return result;
}

bool CardValueResolver::transformedNumber(JsonObjectConst card,
                                          const char *raw,
                                          float &result) const {
  if (raw == nullptr) return false;
  if (!parseDecimalFloat(raw, result)) return false;
  result = numberTransform(card).apply(result);
  return isfinite(result);
}

String CardValueResolver::transformedNumberText(JsonObjectConst card,
                                                const char *raw,
                                                bool applyPrecision) const {
  float value = 0.0F;
  if (!transformedNumber(card, raw, value)) return String(raw ? raw : "");
  const NumberTransform transform = numberTransform(card);
  return applyPrecision && transform.precision >= 0
             ? String(value, static_cast<unsigned char>(transform.precision))
             : card["valueTransform"].isNull() ? String(raw)
                                                : compactNumber(value);
}

float CardValueResolver::progressRatio(JsonObjectConst card,
                                       DashboardValue *value) const {
  const float minimum = card["minimum"] | 0.0F;
  const float maximum = card["maximum"] | 100.0F;
  float current = minimum;
  if (value) transformedNumber(card, value->state, current);
  return maximum > minimum
             ? constrain((current - minimum) / (maximum - minimum), 0.0F,
                         1.0F)
             : 0.0F;
}

bool CardValueResolver::mappingMatches(const char *type, JsonObjectConst rule,
                                       const String &raw) const {
  if (strcmp(type, "number") == 0) {
    float number = 0.0F;
    if (!parseDecimalFloat(raw.c_str(), number)) return false;
    const bool hasMinimum = !rule["minimum"].isNull();
    const bool hasMaximum = !rule["maximum"].isNull();
    return (!hasMinimum || number >= rule["minimum"].as<float>()) &&
           (!hasMaximum || number <= rule["maximum"].as<float>());
  }
  if (strcmp(type, "text") != 0) return false;
  const String match(rule["match"] | "");
  const char *operatorName = rule["operator"] | "equals";
  return strcmp(operatorName, "equals") == 0
             ? raw == match
             : strcmp(operatorName, "starts_with") == 0
                   ? raw.startsWith(match)
                   : strcmp(operatorName, "ends_with") == 0
                         ? raw.endsWith(match)
                         : strcmp(operatorName, "contains") == 0 &&
                               raw.indexOf(match) >= 0;
}

bool CardValueResolver::findMapping(JsonObjectConst card,
                                    const char *collection,
                                    const String &raw,
                                    JsonObjectConst &matched) const {
  JsonArrayConst mappings = card[collection].as<JsonArrayConst>();
  if (mappings.isNull()) return false;
  const char *type = card["type"] | "text";
  for (JsonObjectConst rule : mappings) {
    if (mappingMatches(type, rule, raw)) {
      matched = rule;
      return true;
    }
  }
  return false;
}

bool CardValueResolver::mappedValue(JsonObjectConst card, const String &raw,
                                    String &mapped) const {
  JsonObjectConst rule;
  if (!findMapping(card, "valueMappings", raw, rule)) return false;
  mapped = String(rule["value"] | "");
  return true;
}

String CardValueResolver::value(JsonObjectConst card) const {
  const char *type = card["type"] | "text";
  if (strcmp(type, "clock") == 0) {
    time_t now = time(nullptr);
    struct tm localTime {};
    localtime_r(&now, &localTime);
    char buffer[24];
    const bool seconds = card["showSeconds"] | false;
    const char *format = card["format"] | "24h";
    formatClockTime(buffer, localTime, seconds, strcmp(format, "12h") == 0);
    return String(buffer);
  }
  const char *source = card["source"];
  if (source != nullptr) {
    DashboardValue *sourceValue = values_.find(source, false);
    if (sourceValue == nullptr || !sourceValue->available) return String("--");
    const bool numeric = strcmp(type, "number") == 0;
    const String raw = numeric
                           ? transformedNumberText(card, sourceValue->state)
                           : String(sourceValue->state);
    const String mappingInput =
        numeric ? transformedNumberText(card, sourceValue->state, false) : raw;
    String result;
    const bool mapped = mappedValue(card, mappingInput, result);
    if (!mapped) result = raw;
    const char *unit = card["unit"];
    if (!mapped && unit && unit[0]) result += String(unit);
    return result;
  }
  String result(card["text"] | "");
  const char *unit = card["unit"];
  if (unit && unit[0]) result += String(unit);
  return result;
}
