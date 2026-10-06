#pragma once

#include <ArduinoJson.h>

#include "DashboardValues.h"
#include "NumberTransform.h"

class CardValueResolver {
 public:
  explicit CardValueResolver(DashboardValues &values) : values_(values) {}

  NumberTransform numberTransform(JsonObjectConst card) const;
  bool transformedNumber(JsonObjectConst card, const char *raw,
                         float &result) const;
  String transformedNumberText(JsonObjectConst card, const char *raw,
                               bool applyPrecision = true) const;
  float progressRatio(JsonObjectConst card, DashboardValue *value) const;
  bool findMapping(JsonObjectConst card, const char *collection,
                   const String &raw, JsonObjectConst &matched) const;
  String value(JsonObjectConst card) const;

 private:
  bool mappingMatches(const char *type, JsonObjectConst rule,
                      const String &raw) const;
  bool mappedValue(JsonObjectConst card, const String &raw,
                   String &mapped) const;

  DashboardValues &values_;
};
