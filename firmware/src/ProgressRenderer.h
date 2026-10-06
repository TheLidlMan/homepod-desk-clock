#pragma once

#include <Arduino.h>

namespace progress_renderer {

constexpr int8_t kSin3Degrees[] PROGMEM = {
    0,    7,    13,   20,   26,   33,   39,   46,   52,   58,
    63,   69,   75,   80,   85,   90,   94,   99,   103,  107,
    110,  113,  116,  119,  121,  123,  124,  125,  126,  127,
    127,  127,  126,  125,  124,  123,  121,  119,  116,  113,
    110,  107,  103,  99,   94,   90,   85,   80,   75,   69,
    63,   58,   52,   46,   39,   33,   26,   20,   13,   7,
    0,    -7,   -13,  -20,  -26,  -33,  -39,  -46,  -52,  -58,
    -64,  -69,  -75,  -80,  -85,  -90,  -94,  -99,  -103, -107,
    -110, -113, -116, -119, -121, -123, -124, -125, -126, -127,
    -127, -127, -126, -125, -124, -123, -121, -119, -116, -113,
    -110, -107, -103, -99,  -94,  -90,  -85,  -80,  -75,  -69,
    -64,  -58,  -52,  -46,  -39,  -33,  -26,  -20,  -13,  -7,
};

inline int8_t sin3Degrees(uint8_t index) {
  return static_cast<int8_t>(pgm_read_byte(&kSin3Degrees[index % 120]));
}

}  // namespace progress_renderer

template <typename Canvas>
void drawProgressRing(Canvas &canvas, int16_t x, int16_t y, int16_t diameter,
                      float ratio, uint16_t track, uint16_t fill,
                      uint16_t center) {
  if (diameter < 8) return;
  const int16_t radius = max<int16_t>(3, diameter / 2 - 1);
  const int16_t thickness = max(static_cast<int16_t>(2),
                                min(static_cast<int16_t>(5),
                                    static_cast<int16_t>(diameter / 8)));
  const int16_t centerX = x + diameter / 2;
  const int16_t centerY = y + diameter / 2;
#if defined(ESP8266)
  const int16_t innerRadius = max<int16_t>(1, radius - thickness + 1);
  canvas.drawSmoothArc(centerX, centerY, radius, innerRadius, 0, 360, track,
                       center);
  const uint16_t endDegree = static_cast<uint16_t>(
      constrain(ratio, 0.0F, 1.0F) * 360.0F);
  if (endDegree > 0) {
    canvas.drawSmoothArc(centerX, centerY, radius, innerRadius, 0, endDegree,
                         fill, track, endDegree < 360);
  }
#else
  canvas.fillCircle(centerX, centerY, radius, track);
  canvas.fillCircle(centerX, centerY, radius - thickness, center);

  const int16_t strokeRadius = radius - thickness / 2;
  const int16_t dotRadius =
      max(static_cast<int16_t>(1), static_cast<int16_t>(thickness / 2));
  const int16_t endDegree = static_cast<int16_t>(constrain(ratio, 0.0F, 1.0F) * 360.0F);
  for (int16_t degree = 0; degree <= endDegree; degree += 3) {
    const uint8_t sinIndex = ((degree + 270) % 360) / 3;
    const int16_t offsetX =
        strokeRadius * progress_renderer::sin3Degrees(sinIndex + 30) / 127;
    const int16_t offsetY =
        strokeRadius * progress_renderer::sin3Degrees(sinIndex) / 127;
    canvas.fillCircle(centerX + offsetX, centerY + offsetY, dotRadius, fill);
  }
#endif
}
