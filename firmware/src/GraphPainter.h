#pragma once

#include "GraphSeries.h"
#include "GraphScale.h"
#include <cstdio>

struct GraphPaintConfig {
  const GraphSeries *series;
  float minimum;
  float maximum;
  uint16_t color;
  uint16_t gridColor;
  uint8_t opacity;
  uint8_t fillOpacity;
  uint8_t gridOpacity;
  uint8_t gridLines;
  uint8_t lineWidth;
  uint8_t pointSize;
  uint8_t barGap;
  uint8_t labelEvery;
  uint8_t decimals;
  bool line;
  bool labels;
  bool fit;
  bool showPoints;
  uint8_t scalePadding;
};

// Blend against the existing compositor band; no extra framebuffer is needed.
template <typename Canvas, typename Background>
void paintGraph(Canvas &canvas, const GraphPaintConfig &graph, int16_t x, int16_t y,
                int16_t width, int16_t height, int16_t clipX, int16_t clipY,
                int16_t clipWidth, int16_t clipHeight, Background background) {
  if (!graph.series || width < 4 || height < 6 || graph.opacity == 0) return;
  const int16_t visibleLeft = max<int16_t>(0, clipX - x);
  const int16_t visibleTop = max<int16_t>(0, clipY - y);
  const int16_t visibleRight = min<int16_t>(width, clipX + clipWidth - x);
  const int16_t visibleBottom = min<int16_t>(height, clipY + clipHeight - y);
  if (visibleLeft >= visibleRight || visibleTop >= visibleBottom) return;
  const auto &series = *graph.series;
  float low = INFINITY, high = -INFINITY;
  for (uint8_t i = 0; i < series.capacity; ++i) {
    const float value = series.at(i);
    if (std::isfinite(value)) { if (value < low) low = value; if (value > high) high = value; }
  }
  if (!std::isfinite(low)) return;
  fitGraphScale(low, high, graph.fit, graph.minimum, graph.maximum,
                graph.scalePadding);
  const int16_t plotTop = graph.labels ? 6 : 0;
  const int16_t plotHeight = max<int16_t>(1, height - plotTop - 1);
  const auto ordinate = [&](float value) {
    return plotTop + plotHeight - static_cast<int16_t>(constrain((value - low) / (high - low), 0.0F, 1.0F) * plotHeight);
  };
  const auto coloredPixel = [&](int16_t px, int16_t py, uint16_t foreground,
                                uint8_t opacity, bool solid = false) {
    if (px < 0 || py < 0 || px >= width || py >= height ||
        x + px < clipX || y + py < clipY || x + px >= clipX + clipWidth || y + py >= clipY + clipHeight) return;
    const uint16_t color = solid || opacity == 100 ? foreground :
        blendGraphColor(foreground, background(x + px, y + py), opacity);
    canvas.drawPixel(x + px, y + py, color);
  };
  const auto pixel = [&](int16_t px, int16_t py, bool label = false) {
    coloredPixel(px, py, graph.color, graph.opacity, label);
  };
  for (uint8_t grid = 1; grid <= graph.gridLines; ++grid) {
    const int16_t py = plotTop +
        static_cast<int32_t>(plotHeight) * grid / (graph.gridLines + 1);
    if (py < visibleTop || py >= visibleBottom) continue;
    for (int16_t px = visibleLeft; px < visibleRight; ++px) {
      coloredPixel(px, py, graph.gridColor, graph.gridOpacity);
    }
  }
  const auto strokePixel = [&](int16_t px, int16_t py) {
    const int8_t before = (graph.lineWidth - 1) / 2;
    const int8_t after = graph.lineWidth / 2;
    for (int8_t dx = -before; dx <= after; ++dx)
      for (int8_t dy = -before; dy <= after; ++dy) pixel(px + dx, py + dy);
  };
  const auto line = [&](int16_t ax, int16_t ay, int16_t bx, int16_t by) {
    const int16_t dx = abs(bx - ax), sx = ax < bx ? 1 : -1;
    const int16_t dy = -abs(by - ay), sy = ay < by ? 1 : -1;
    int16_t error = dx + dy;
    bool first = true;
    while (true) {
      if (!first) strokePixel(ax, ay);
      first = false;
      if (ax == bx && ay == by) break;
      const int16_t twice = error * 2;
      if (twice >= dy) { error += dy; ax += sx; }
      if (twice <= dx) { error += dx; ay += sy; }
    }
  };
  int16_t previousX = -1, previousY = 0;
  for (uint8_t i = 0; i < series.capacity; ++i) {
    const float value = series.at(i);
    if (!std::isfinite(value)) { previousX = -1; continue; }
    const int16_t left = static_cast<int32_t>(i) * width / series.capacity;
    const int16_t right = static_cast<int32_t>(i + 1) * width / series.capacity;
    const int16_t center = graph.line ? static_cast<int32_t>(i) * (width - 1) / (series.capacity - 1) : (left + right) / 2;
    const int16_t top = ordinate(value);
    if (graph.line) {
      const int16_t baseline = ordinate(0);
      if (previousX >= 0 && graph.fillOpacity > 0) {
        const int16_t span = max<int16_t>(1, center - previousX);
        for (int16_t px = max(previousX, visibleLeft);
             px <= min<int16_t>(center, visibleRight - 1); ++px) {
          const int16_t fillTop = previousY +
              static_cast<int32_t>(top - previousY) * (px - previousX) / span;
          for (int16_t py = max(min(fillTop, baseline), visibleTop);
               py <= min<int16_t>(max(fillTop, baseline), visibleBottom - 1); ++py) {
            coloredPixel(px, py, graph.color, graph.fillOpacity);
          }
        }
      }
      if (previousX >= 0) line(previousX, previousY, center, top);
      else strokePixel(center, top);
      if (graph.showPoints) {
        for (int8_t dx = -graph.pointSize; dx <= graph.pointSize; ++dx)
          for (int8_t dy = -graph.pointSize; dy <= graph.pointSize; ++dy)
            if (dx * dx + dy * dy <= graph.pointSize * graph.pointSize)
              pixel(center + dx, top + dy, true);
      }
    } else {
      const int16_t baseline = ordinate(0);
      const int16_t gap = min<int16_t>(graph.barGap, max<int16_t>(0, right - left - 1));
      const int16_t barLeft = left + gap / 2;
      const int16_t barRight = max<int16_t>(barLeft + 1, right - (gap - gap / 2));
      for (int16_t px = max(barLeft, visibleLeft); px < min(barRight, visibleRight); ++px)
        for (int16_t py = max(min(top, baseline), visibleTop);
             py <= min<int16_t>(max(top, baseline), visibleBottom - 1); ++py) pixel(px, py);
    }
    if (graph.labels && i % graph.labelEvery == 0) {
      char text[48];
#if defined(ESP8266)
      // dtostrf is already used by Arduino String and avoids linking newlib's
      // much larger generic printf float formatter.
      dtostrf(value, 0, graph.decimals, text);
#else
      snprintf(text, sizeof(text), "%.*f", graph.decimals, static_cast<double>(value));
#endif
      // Tiny fixed 3x5 numerals keep graph labels independent of loaded fonts.
      static constexpr uint16_t digits[] = {0x7B6F,0x2492,0x73E7,0x73CF,0x5BC9,0x79CF,0x79EF,0x7249,0x7BEF,0x7BCF};
      const int16_t origin = max<int16_t>(0, min<int16_t>(center - static_cast<int16_t>(strlen(text)) * 2, width - static_cast<int16_t>(strlen(text)) * 4));
      for (uint8_t c = 0; text[c]; ++c) {
        const uint16_t bits = text[c] >= '0' && text[c] <= '9' ? digits[text[c] - '0'] : text[c] == '-' ? 0x01C0 : text[c] == '.' ? 0x0002 : 0;
        for (uint8_t py = 0; py < 5; ++py) for (uint8_t px = 0; px < 3; ++px)
          if (bits & (1U << (14 - py * 3 - px))) pixel(origin + c * 4 + px, max<int16_t>(0, top - 6) + py, true);
      }
    }
    previousX = center; previousY = top;
  }
}
