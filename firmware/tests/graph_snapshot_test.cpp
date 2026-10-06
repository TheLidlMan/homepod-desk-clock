#include <cassert>
#include "GraphSnapshot.h"

int main() {
  GraphSeries series(3);
  DynamicJsonDocument json(2048);
  assert(!deserializeJson(json, R"({"bucket":6000000,"values":[12,null,24]})"));
  assert(applyGraphSnapshot(series, json.as<JsonObjectConst>()));
  assert(series.at(0) == 12 && std::isnan(series.at(1)) && series.at(2) == 24);
  assert(!deserializeJson(json, R"({"bucket":6000001,"values":[8,"wrong",24]})"));
  assert(!applyGraphSnapshot(series, json.as<JsonObjectConst>()));
  assert(series.bucket == 6000000 && series.at(0) == 12);
  assert(!deserializeJson(json, R"({"bucket":6000001,"values":[8]})"));
  assert(!applyGraphSnapshot(series, json.as<JsonObjectConst>()));
}
