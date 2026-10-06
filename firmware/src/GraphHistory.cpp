#include "GraphHistory.h"

#include <LittleFS.h>
#include "GraphSnapshot.h"

GraphHistory graphHistory;
namespace {
constexpr const char *kPath = "/graph-history.bin";
constexpr const char *kTemporary = "/graph-history.tmp";
constexpr const char *kBackup = "/graph-history.bak";
struct Key {
  const char *source;
  uint32_t interval;
  uint8_t points;
  GraphAggregation aggregation;
};
Key keyFor(JsonObjectConst card) {
  JsonObjectConst graph = card["graph"];
  const char *aggregation = graph["aggregation"] | "mean";
  return {graph["source"] | (card["source"] | ""), graph["intervalSeconds"] | uint32_t(300),
          graph["points"] | uint8_t(48),
          strcmp(aggregation, "min") == 0 ? GraphAggregation::Minimum :
          strcmp(aggregation, "max") == 0 ? GraphAggregation::Maximum :
          strcmp(aggregation, "last") == 0 ? GraphAggregation::Last : GraphAggregation::Mean};
}
bool same(const Key &a, const Key &b) {
  return strcmp(a.source, b.source) == 0 && a.interval == b.interval &&
         a.points == b.points && a.aggregation == b.aggregation;
}
Key keyFor(const GraphSeries &series) {
  return {series.source, series.interval, series.capacity, series.aggregation};
}
bool validGraphs(JsonArrayConst pages) {
  for (JsonObjectConst page : pages) for (JsonObjectConst row : page["rows"].as<JsonArrayConst>())
    for (JsonObjectConst card : row["cards"].as<JsonArrayConst>()) {
      if (card["graph"].isNull()) {
        if (strcmp(card["type"] | "", "chart") == 0) return false;
        continue;
      }
      if (!card["graph"].is<JsonObjectConst>()) return false;
      JsonObjectConst graph = card["graph"];
      Key key = keyFor(card);
      if (!key.source[0] || strlen(key.source) > 64 || key.interval < 30 ||
          key.interval > 86400 || key.points < 2 || key.points > kMaxGraphPoints) return false;
      const char *type = graph["type"] | "bar";
      const char *scale = graph["scale"] | "zero";
      if (strcmp(scale, "zero") && strcmp(scale, "fit")) return false;
      const char *aggregation = graph["aggregation"] | "mean";
      if ((strcmp(type, "bar") && strcmp(type, "line")) ||
          (strcmp(aggregation, "mean") && strcmp(aggregation, "min") &&
           strcmp(aggregation, "max") && strcmp(aggregation, "last"))) return false;
      const int opacity = graph["opacity"] | 50;
      const int fillOpacity = graph["fillOpacity"] | 0;
      const int gridOpacity = graph["gridOpacity"] | 20;
      const int gridLines = graph["gridLines"] | 0;
      const int lineWidth = graph["lineWidth"] | 1;
      const int pointSize = graph["pointSize"] | 1;
      const int barGap = graph["barGap"] | 1;
      const int scalePadding = graph["scalePadding"] | 5;
      const int labels = graph["labelEvery"] | 6;
      const int decimals = graph["decimals"] | 1;
      if (opacity < 0 || opacity > 100 || fillOpacity < 0 || fillOpacity > 100 ||
          gridOpacity < 0 || gridOpacity > 100 || gridLines < 0 || gridLines > 8 ||
          lineWidth < 1 || lineWidth > 4 || pointSize < 1 || pointSize > 4 ||
          barGap < 0 || barGap > 8 || scalePadding < 0 || scalePadding > 50 ||
          labels < 1 || labels > 120 || decimals < 0 || decimals > 3 ||
          (!graph["showPoints"].isNull() && !graph["showPoints"].is<bool>())) return false;
      for (const char *name : {"minimum", "maximum"})
        if (!graph[name].isNull() && (!graph[name].is<float>() || !std::isfinite(graph[name].as<float>()))) return false;
      if (!graph["minimum"].isNull() && !graph["maximum"].isNull() &&
          graph["minimum"].as<float>() >= graph["maximum"].as<float>()) return false;
    }
  return true;
}
} // namespace

bool GraphHistory::validate(JsonArrayConst pages) const {
  return validGraphs(pages);
}
bool GraphHistory::configure(JsonArrayConst pages) {
  if (!validate(pages)) return false;
  std::unique_ptr<Entry> next;
  auto tail = &next;
  for (JsonObjectConst page : pages) for (JsonObjectConst row : page["rows"].as<JsonArrayConst>())
    for (JsonObjectConst card : row["cards"].as<JsonArrayConst>()) {
      if (card["graph"].isNull()) continue;
      const Key key = keyFor(card);
      bool duplicate = false;
      for (auto item = next.get(); item; item = item->next.get())
        duplicate |= same(key, keyFor(item->data));
      if (duplicate) continue;
      // Keep room for the 4 KiB data parser plus networking/render allocations.
      // Old snapshots remain intact until the entire replacement is allocated.
      constexpr size_t reserve = 8192;
      const size_t allocation = sizeof(Entry) + sizeof(float) * key.points + 32;
      if (ESP.getFreeHeap() < reserve + allocation) return false;
      std::unique_ptr<Entry> entry(new (std::nothrow) Entry(key.points));
      if (!entry || !entry->data.values || ESP.getFreeHeap() < reserve) return false;
      auto &data = entry->data;
      strlcpy(data.source, key.source, sizeof(data.source));
      data.interval = key.interval;
      data.aggregation = key.aggregation;
      if (const auto previous = find(card)) {
        data.bucket = previous->bucket;
        data.head = previous->head;
        for (uint8_t i = 0; i < key.points; ++i) data.values[i] = previous->values[i];
      }
      *tail = std::move(entry);
      tail = &(*tail)->next;
    }
  first_ = std::move(next);
  return true;
}
const GraphSeries *GraphHistory::find(JsonObjectConst card) const {
  if (card["graph"].isNull()) return nullptr;
  const Key key = keyFor(card);
  for (auto item = first_.get(); item; item = item->next.get())
    if (same(key, keyFor(item->data))) return &item->data;
  return nullptr;
}
bool GraphHistory::receiveSnapshot(JsonObjectConst snapshot) {
  if (!snapshot["points"].is<uint8_t>() || !snapshot["intervalSeconds"].is<uint32_t>()) return false;
  const char *source = snapshot["source"] | "";
  const char *aggregation = snapshot["aggregation"] | "";
  const uint32_t interval = snapshot["intervalSeconds"] | 0UL;
  const uint8_t points = snapshot["points"] | uint8_t(0);
  for (auto item = first_.get(); item; item = item->next.get()) {
    auto series = &item->data;
    if (strcmp(series->source, source) == 0 &&
        series->interval == interval && series->capacity == points) {
      const char *name = series->aggregation == GraphAggregation::Minimum ? "min" :
          series->aggregation == GraphAggregation::Maximum ? "max" :
          series->aggregation == GraphAggregation::Last ? "last" : "mean";
      if (strcmp(name, aggregation) == 0) return applyGraphSnapshot(*series, snapshot);
    }
  }
  return false;
}
size_t GraphHistory::bytes() const {
  size_t result = 0;
  for (auto item = first_.get(); item; item = item->next.get())
    result += sizeof(Entry) + sizeof(float) * item->data.capacity;
  return result;
}
const GraphSeries *GraphHistory::series(size_t index) const {
  auto item = first_.get();
  while (item && index--) item = item->next.get();
  return item ? &item->data : nullptr;
}
void GraphHistory::reset() {
  first_.reset();
  for (const char *path : {kPath, kTemporary, kBackup}) LittleFS.remove(path);
}
