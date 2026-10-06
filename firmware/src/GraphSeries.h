#pragma once

#include <cmath>
#include <cstdint>
#include <cstring>
#include <memory>
#include <new>

constexpr uint8_t kMaxGraphPoints = 120;

enum class GraphAggregation : uint8_t { Mean, Minimum, Maximum, Last };

// One ring holds completed buckets and the current bucket. Missing buckets are
// NaN, never zero. Epoch-aligned bins survive reboots and do not drift.
struct GraphSeries {
  char source[65]{};
  uint32_t interval = 300;
  uint32_t bucket = 0;
  uint32_t lastReceived = 0;
  float latest = NAN;
  float mean = 0;
  uint32_t count = 0;
  uint8_t capacity = 48;
  uint8_t head = 0;
  GraphAggregation aggregation = GraphAggregation::Mean;
  std::unique_ptr<float[]> values;

  explicit GraphSeries(uint8_t points = kMaxGraphPoints)
      : capacity(points), values(new (std::nothrow) float[points]) { clear(); }
  size_t bytes() const { return sizeof(GraphSeries) + sizeof(float) * capacity; }
  void clear() {
    if (values) for (uint8_t i = 0; i < capacity; ++i) values[i] = NAN;
    head = 0;
    bucket = 0;
    count = 0;
    mean = 0;
  }
  float at(uint8_t index) const {
    return values[(head + 1 + index) % capacity];
  }
  bool advance(uint32_t now) {
    if (now < 1700000000UL) return false;
    const uint32_t next = now / interval;
    if (bucket == next) return false;
    if (bucket == 0 || next < bucket || next - bucket >= capacity) {
      clear();
    } else {
      for (uint32_t index = bucket; index < next; ++index) {
        head = (head + 1) % capacity;
        values[head] = NAN;
      }
    }
    bucket = next;
    count = 0;
    mean = 0;
    return true;
  }
  bool sample(uint32_t now) {
    const bool moved = advance(now);
    if (now < 1700000000UL || !std::isfinite(latest) ||
        now < lastReceived || now - lastReceived > 300) return moved;
    float &value = values[head];
    ++count;
    mean += (latest - mean) / count;
    if (!std::isfinite(value) || aggregation == GraphAggregation::Last) value = latest;
    else if (aggregation == GraphAggregation::Minimum && latest < value) value = latest;
    else if (aggregation == GraphAggregation::Maximum && latest > value) value = latest;
    if (aggregation == GraphAggregation::Mean) value = mean;
    return true;
  }
};
