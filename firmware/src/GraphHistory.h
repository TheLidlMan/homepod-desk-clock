#pragma once

#include <ArduinoJson.h>
#include <memory>
#include "GraphSeries.h"

class GraphHistory {
 public:
  // Validation is read-only. Configure runs only after dashboard validation.
  bool validate(JsonArrayConst pages) const;
  bool configure(JsonArrayConst pages);
  bool receiveSnapshot(JsonObjectConst snapshot);
  void reset();
  const GraphSeries *find(JsonObjectConst card) const;
  size_t bytes() const;
  bool storageError() const { return false; }
  const GraphSeries *series(size_t index) const;

 private:
  struct Entry {
    explicit Entry(uint8_t points) : data(points) {}
    ~Entry() {
      // Release long lists without recursively consuming the device stack.
      while (next) {
        auto removed = std::move(next);
        next = std::move(removed->next);
      }
    }
    GraphSeries data;
    std::unique_ptr<Entry> next;
  };
  std::unique_ptr<Entry> first_;
};

extern GraphHistory graphHistory;
