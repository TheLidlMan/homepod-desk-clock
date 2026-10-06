#pragma once

#include <math.h>
#include <stdint.h>

struct NumberTransform {
  float multiply = 1.0F;
  float add = 0.0F;
  float minimum = NAN;
  float maximum = NAN;
  int8_t precision = -1;
  bool absolute = false;

  float apply(float value) const {
    value = value * multiply + add;
    if (absolute) value = fabsf(value);
    if (!isnan(minimum) && value < minimum) value = minimum;
    if (!isnan(maximum) && value > maximum) value = maximum;
    return value;
  }
};
