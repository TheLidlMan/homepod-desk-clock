#include "DecimalParser.h"

#include <cmath>
#include <cstdint>

bool parseDecimalFloat(const char *text, float &result) {
  if (!text) return false;
  while (*text == ' ' || (*text >= '\t' && *text <= '\r')) ++text;
  const bool negative = *text == '-';
  if (negative || *text == '+') ++text;

  uint32_t mantissa = 0;
  uint8_t significant = 0;
  int16_t exponent = 0;
  bool digitSeen = false;
  bool nonzeroSeen = false;
  int8_t roundingDigit = -1;

  while (*text >= '0' && *text <= '9') {
    digitSeen = true;
    const uint8_t digit = static_cast<uint8_t>(*text++ - '0');
    if (!nonzeroSeen && digit == 0) continue;
    nonzeroSeen = true;
    if (significant < 9) {
      mantissa = mantissa * 10 + digit;
      ++significant;
    } else {
      if (roundingDigit < 0) roundingDigit = digit;
      ++exponent;
    }
  }

  if (*text == '.') {
    ++text;
    while (*text >= '0' && *text <= '9') {
      digitSeen = true;
      const uint8_t digit = static_cast<uint8_t>(*text++ - '0');
      if (!nonzeroSeen && digit == 0) {
        --exponent;
        continue;
      }
      nonzeroSeen = true;
      if (significant < 9) {
        mantissa = mantissa * 10 + digit;
        ++significant;
        --exponent;
      } else if (roundingDigit < 0) {
        roundingDigit = digit;
      }
    }
  }
  if (!digitSeen) return false;

  if (*text == 'e' || *text == 'E') {
    ++text;
    const bool exponentNegative = *text == '-';
    if (exponentNegative || *text == '+') ++text;
    if (*text < '0' || *text > '9') return false;
    int16_t explicitExponent = 0;
    while (*text >= '0' && *text <= '9') {
      if (explicitExponent < 100) {
        explicitExponent = explicitExponent * 10 + (*text - '0');
      }
      ++text;
    }
    exponent += exponentNegative ? -explicitExponent : explicitExponent;
  }
  if (*text != '\0') return false;
  if (!nonzeroSeen) {
    result = negative ? -0.0F : 0.0F;
    return true;
  }

  if (roundingDigit >= 5) {
    ++mantissa;
    if (mantissa == 1000000000U) {
      mantissa = 100000000U;
      ++exponent;
    }
  }
  float value = static_cast<float>(mantissa);
  if (exponent > 46) return false;
  if (exponent < -55) value = 0.0F;
  while (exponent > 0) {
    value *= 10.0F;
    --exponent;
  }
  while (exponent < 0 && value != 0.0F) {
    value *= 0.1F;
    ++exponent;
  }
  if (!std::isfinite(value)) return false;
  result = negative ? -value : value;
  return true;
}
