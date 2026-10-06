#include <algorithm>
#include <cassert>
#include <cstdlib>
using std::min;
using std::max;
template <typename T> T constrain(T value, T low, T high) { return max(low, min(high, value)); }
#include "GraphPainter.h"

struct Canvas {
  uint16_t pixels[40 * 20]{};
  void drawPixel(int x, int y, uint16_t color) {
    assert(x >= 0 && x < 40 && y >= 0 && y < 20);
    pixels[y * 40 + x] = color;
  }
};
int main() {
  float low = 23.9F, high = 24.1F;
  fitGraphScale(low, high, true, NAN, NAN);
  assert(low < 23.9F && low > 23.8F && high > 24.1F && high < 24.2F);
  low = high = 24;
  fitGraphScale(low, high, true, NAN, NAN);
  assert(low < 24 && high > 24);
  assert(blendGraphColor(0xffff, 0, 0) == 0);
  assert(blendGraphColor(0xffff, 0, 100) == 0xffff);
  GraphSeries series;
  series.capacity = 4;
  series.head = 3;
  for (int i = 0; i < 4; ++i) series.values[i] = 24;
  GraphPaintConfig graph{};
  graph.series = &series;
  graph.minimum = NAN;
  graph.maximum = NAN;
  graph.color = 0xffff;
  graph.opacity = 13;
  graph.lineWidth = 1;
  graph.pointSize = 1;
  graph.barGap = 1;
  graph.labelEvery = 6;
  graph.decimals = 1;
  graph.scalePadding = 5;
  Canvas canvas;
  paintGraph(canvas, graph, 0, 0, 40, 20, 0, 0, 40, 20,
             [&](int x, int y) { return canvas.pixels[y * 40 + x]; });
  const auto expected = blendGraphColor(0xffff, 0, 13);
  for (int y = 0; y < 20; ++y)
    for (int x = 0; x < 40; ++x)
      assert(canvas.pixels[y * 40 + x] == (x % 10 == 9 ? 0 : expected));

  for (int i = 0; i < 4; ++i) series.values[i] = 10 + i * 5;
  graph.line = true;
  graph.fit = true;
  graph.opacity = 100;
  graph.fillOpacity = 20;
  graph.gridColor = 0x07e0;
  graph.gridOpacity = 100;
  graph.gridLines = 2;
  graph.lineWidth = 3;
  graph.pointSize = 2;
  graph.showPoints = true;
  Canvas lineCanvas;
  paintGraph(lineCanvas, graph, 0, 0, 40, 20, 0, 0, 40, 20,
             [&](int x, int y) { return lineCanvas.pixels[y * 40 + x]; });
  int painted = 0;
  for (const auto pixel : lineCanvas.pixels) painted += pixel != 0;
  assert(painted > 40);
  // Band composition must be pixel-identical, including translucent overlaps.
  for (bool asLine : {false, true}) {
    graph.line = asLine;
    Canvas whole, tiled;
    paintGraph(whole, graph, 0, 0, 40, 20, 0, 0, 40, 20,
               [&](int x, int y) { return whole.pixels[y * 40 + x]; });
    for (int y = 0; y < 20; y += 4)
      for (int x = 0; x < 40; x += 8)
        paintGraph(tiled, graph, 0, 0, 40, 20, x, y, 8, 4,
                   [&](int px, int py) { return tiled.pixels[py * 40 + px]; });
    for (int i = 0; i < 40 * 20; ++i) assert(whole.pixels[i] == tiled.pixels[i]);
  }
}
