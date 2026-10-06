#pragma once
#include <ArduinoJson.h>
#include "GraphSeries.h"

// Validate the complete update before touching the currently displayed points.
inline bool applyGraphSnapshot(GraphSeries &series, JsonObjectConst snapshot) {
  JsonArrayConst values = snapshot["values"];
  if (!snapshot["bucket"].is<uint32_t>() ||
      snapshot["bucket"].as<uint32_t>() == 0 ||
      values.isNull() || values.size() != series.capacity) return false;
  for (JsonVariantConst value : values)
    if (!value.isNull() && (!value.is<float>() || !std::isfinite(value.as<float>()))) return false;
  series.clear();
  series.bucket = snapshot["bucket"].as<uint32_t>();
  series.head = series.capacity - 1;
  for (uint8_t i = 0; i < series.capacity; ++i)
    series.values[i] = values[i].isNull() ? NAN : values[i].as<float>();
  return true;
}
