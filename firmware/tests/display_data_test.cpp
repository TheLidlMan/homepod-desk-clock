#include <cassert>
#include <iostream>
#include <string>
#include "DisplayDataResponse.h"

namespace {
struct Value {
  const char *source;
  const char *state;
  bool available;
};
struct History {
  static constexpr size_t testSeriesCount = 6;
  GraphSeries entries[testSeriesCount];
  size_t count = 0;
  const GraphSeries *series(size_t index) const {
    return index < count ? &entries[index] : nullptr;
  }
};
struct Sink {
  std::string json;
  size_t chunks = 0;
  void operator()(const char *bytes, size_t size) {
    assert(size > 0 && size <= 256);
    json.append(bytes, size);
    ++chunks;
  }
};

void emptyData() {
  History history;
  Sink sink;
  writeDisplayData(sink, static_cast<const Value *>(nullptr), 0, history);
  assert(sink.json == "{\"values\":{},\"series\":[]}");
}

void retainedValuesAndEscaping() {
  const Value values[] = {
      {"sensor.power", "0.0", true},
      {"sensor.battery", "unavailable", false},
      {"sensor.\"quoted", "line\nslash\\quote\"", true},
      {"sensor.tekst", "Łódź 温度", true},
  };
  History history;
  Sink sink;
  writeDisplayData(sink, values, 4, history);
  DynamicJsonDocument document(4096);
  assert(!deserializeJson(document, sink.json));
  assert(document.size() == 2);
  assert(document["values"].size() == 4);
  assert(document["values"]["sensor.power"]["state"] == "0.0");
  assert(document["values"]["sensor.power"]["available"] == true);
  assert(document["values"]["sensor.battery"]["available"] == false);
  assert(document["values"]["sensor.\"quoted"]["state"] == values[2].state);
  assert(document["values"]["sensor.tekst"]["state"] == values[3].state);
  for (JsonPair item : document["values"].as<JsonObject>()) {
    assert(item.value().size() == 2);
  }
}

void maximumHistory() {
  Value values[32];
  std::string sources[32];
  for (size_t i = 0; i < 32; ++i) {
    sources[i] = "sensor." + std::string(54, 'x') + std::to_string(i);
    values[i] = {sources[i].c_str(), "-123456789.123456789", true};
  }
  History history;
  history.count = History::testSeriesCount;
  for (uint8_t i = 0; i < history.count; ++i) {
    auto &series = history.entries[i];
    strcpy(series.source, sources[i].c_str());
    series.capacity = kMaxGraphPoints;
    series.head = 17;
    series.bucket = 6000000;
    series.aggregation = static_cast<GraphAggregation>(i % 4);
    for (uint8_t j = 0; j < kMaxGraphPoints; ++j) series.values[j] = float(j) - 60;
    series.values[12] = NAN;
    series.values[13] = INFINITY;
  }
  Sink sink;
  writeDisplayData(sink, values, 32, history);
  assert(sink.chunks > 16);
  DynamicJsonDocument document(65536);
  assert(!deserializeJson(document, sink.json));
  assert(document["values"].size() == 32);
  assert(document["series"].size() == History::testSeriesCount);
  for (uint8_t i = 0; i < history.count; ++i) {
    auto series = document["series"][i];
    assert(series["points"] == kMaxGraphPoints);
    assert(series["intervalSeconds"] == 300);
    assert(series["bucket"] == 6000000);
    assert(series["aggregation"] == graphAggregationName(history.entries[i].aggregation));
    assert(series["values"].size() == kMaxGraphPoints);
    for (uint8_t j = 0; j < kMaxGraphPoints; ++j) {
      const float expected = history.entries[i].at(j);
      if (std::isfinite(expected)) assert(series["values"][j].as<float>() == expected);
      else assert(series["values"][j].isNull());
    }
  }
}
} // namespace

int main() {
  emptyData();
  retainedValuesAndEscaping();
  maximumHistory();
  std::cout << "display data: empty, values, escaping, bounded chunks, full history passed\n";
}
