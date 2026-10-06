#pragma once

#include <ArduinoJson.h>
#include <cstring>
#include "GraphSeries.h"

// Serialize directly into bounded HTTP chunks. Neither a whole response nor a
// whole history series needs a second copy in the ESP8266 heap.
template <typename Sink> class DisplayDataWriter {
 public:
  explicit DisplayDataWriter(Sink &sink) : sink_(sink) {}
  size_t write(uint8_t byte) {
    buffer_[used_++] = byte;
    if (used_ == sizeof(buffer_)) flush();
    return 1;
  }
  size_t write(const uint8_t *data, size_t size) {
    for (size_t i = 0; i < size; ++i) write(data[i]);
    return size;
  }
  void literal(const char *text) {
    write(reinterpret_cast<const uint8_t *>(text), strlen(text));
  }
  void flush() {
    if (used_) sink_(buffer_, used_);
    used_ = 0;
  }

 private:
  Sink &sink_;
  char buffer_[256];
  size_t used_ = 0;
};

inline const char *graphAggregationName(GraphAggregation aggregation) {
  switch (aggregation) {
    case GraphAggregation::Minimum: return "min";
    case GraphAggregation::Maximum: return "max";
    case GraphAggregation::Last: return "last";
    default: return "mean";
  }
}

template <typename Sink, typename Value, typename History>
void writeDisplayData(Sink &sink, const Value *values, size_t count,
                      const History &history) {
  DisplayDataWriter<Sink> writer(sink);
  // Only scalar variants: const char* values are borrowed, never copied.
  StaticJsonDocument<16> scalar;
  writer.literal("{\"values\":{");
  bool first = true;
  for (size_t index = 0; index < count; ++index) {
    const auto &value = values[index];
    if (!value.source) continue;
    if (!first) writer.literal(",");
    first = false;
    scalar.set(static_cast<const char *>(value.source));
    serializeJson(scalar, writer);
    writer.literal(":{\"state\":");
    scalar.set(static_cast<const char *>(value.state));
    serializeJson(scalar, writer);
    writer.literal(value.available ? ",\"available\":true}" : ",\"available\":false}");
  }
  writer.literal("},\"series\":[");
  first = true;
  for (size_t index = 0; ; ++index) {
    const GraphSeries *series = history.series(index);
    if (!series) break;
    if (!first) writer.literal(",");
    first = false;
    writer.literal("{\"source\":");
    scalar.set(static_cast<const char *>(series->source));
    serializeJson(scalar, writer);
    writer.literal(",\"intervalSeconds\":");
    scalar.set(series->interval);
    serializeJson(scalar, writer);
    writer.literal(",\"points\":");
    scalar.set(series->capacity);
    serializeJson(scalar, writer);
    writer.literal(",\"aggregation\":");
    scalar.set(graphAggregationName(series->aggregation));
    serializeJson(scalar, writer);
    writer.literal(",\"bucket\":");
    scalar.set(series->bucket);
    serializeJson(scalar, writer);
    writer.literal(",\"values\":[");
    for (uint8_t i = 0; i < series->capacity; ++i) {
      if (i) writer.literal(",");
      const float value = series->at(i);
      if (std::isfinite(value)) scalar.set(value); else scalar.set(nullptr);
      serializeJson(scalar, writer);
    }
    writer.literal("]}");
  }
  writer.literal("]}");
  writer.flush();
}
