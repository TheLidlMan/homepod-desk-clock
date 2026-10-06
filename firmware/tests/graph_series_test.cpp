#include <cassert>
#include <iostream>
#include "GraphSeries.h"

int main() {
  const uint32_t start = 1800000000;
  for (auto aggregation : {GraphAggregation::Mean, GraphAggregation::Minimum,
                           GraphAggregation::Maximum, GraphAggregation::Last}) {
    GraphSeries series;
    series.capacity = 4;
    series.aggregation = aggregation;
    series.lastReceived = start;
    series.latest = -10;
    assert(series.sample(start));
    series.latest = 30;
    assert(series.sample(start + 15));
    const float expected = aggregation == GraphAggregation::Mean ? 10 :
        aggregation == GraphAggregation::Minimum ? -10 : 30;
    assert(series.at(3) == expected);
    assert(std::isnan(series.at(2)));
    // Keep the completed bucket and make missing bins explicit, not zero.
    series.latest = NAN;
    assert(series.sample(start + 600));
    assert(series.at(1) == expected);
    assert(std::isnan(series.at(2)) && std::isnan(series.at(3)));
    assert(series.sample(start + 1800));
    for (uint8_t i = 0; i < 4; ++i) assert(std::isnan(series.at(i)));
  }
  GraphSeries stale;
  stale.latest = 25;
  stale.lastReceived = start;
  stale.sample(start + 301);
  assert(std::isnan(stale.at(stale.capacity - 1)));
  GraphSeries unsynchronized;
  unsynchronized.latest = 1;
  assert(!unsynchronized.sample(100));
  assert(unsynchronized.bucket == 0);
  std::cout << "graph series: aggregation, missing bins, stale values, unsynchronized clock passed\n";
}
