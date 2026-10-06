#include <cassert>
#include <cstdio>
#include <LittleFS.h>
#include "GraphHistory.h"
TestHeap ESP;
TestFS LittleFS;

int main() {
  DynamicJsonDocument doc(16384);
  auto pages = doc.createNestedArray("pages");
  auto cards = pages.createNestedObject().createNestedArray("rows")
      .createNestedObject().createNestedArray("cards");
  for (int i = 0; i < 7; ++i) {
    auto card = cards.createNestedObject();
    char source[24]; std::snprintf(source, sizeof(source), "sensor.test%d", i % 6);
    card["source"] = source;
    auto graph = card.createNestedObject("graph");
    graph["points"] = 15;
    graph["intervalSeconds"] = 120;
  }
  GraphHistory history;
  assert(history.validate(pages));
  assert(history.configure(pages));
  assert(history.series(5) && !history.series(6)); // Six unique graphs, one duplicate.
  assert(history.bytes() < 6 * (sizeof(GraphSeries) + 120 * sizeof(float)));
  DynamicJsonDocument update(2048);
  update["source"] = "sensor.test0";
  update["points"] = 15;
  update["intervalSeconds"] = 120;
  update["aggregation"] = "mean";
  update["bucket"] = 15000000;
  auto values = update.createNestedArray("values");
  for (int i = 0; i < 15; ++i) values.add(i);
  assert(history.receiveSnapshot(update.as<JsonObjectConst>()));
  assert(history.series(0)->at(14) == 14);
  assert(history.configure(pages));
  assert(history.series(0)->at(14) == 14); // Saving doesn't erase received data.
  const auto previous = history.series(0);
  ESP.failAfter = 5;
  ESP.calls = 0;
  assert(!history.configure(pages)); // Fail partway through allocation.
  assert(history.series(0) == previous && history.series(5));
  assert(previous->at(14) == 14);
  ESP.failAfter = 0;
  cards[0]["graph"]["points"] = 121;
  assert(!history.validate(pages) && !history.configure(pages));
  assert(history.series(0) == previous);
  pages.clear();
  assert(history.configure(pages));
  assert(!history.series(0) && history.bytes() == 0);
}
