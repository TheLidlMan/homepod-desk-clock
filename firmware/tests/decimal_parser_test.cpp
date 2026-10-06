#include <assert.h>
#include <cmath>

#include "DecimalParser.h"

namespace {

void expect(const char *text, float expected, float tolerance = 0.00001F) {
  float value = 0.0F;
  assert(parseDecimalFloat(text, value));
  assert(std::fabs(value - expected) <= tolerance);
}

}  // namespace

int main() {
  expect("0", 0.0F);
  expect("-12.5", -12.5F);
  expect(".25", 0.25F);
  expect("1.", 1.0F);
  expect("+1.25e2", 125.0F);
  expect("  2E-3", 0.002F);
  expect("0.000000001", 0.000000001F, 0.0000000001F);
  expect("1234567890", 1234567936.0F, 128.0F);

  float value = 0.0F;
  assert(!parseDecimalFloat(nullptr, value));
  assert(!parseDecimalFloat("", value));
  assert(!parseDecimalFloat(".", value));
  assert(!parseDecimalFloat("1 ", value));
  assert(!parseDecimalFloat("1e", value));
  assert(!parseDecimalFloat("nan", value));
  assert(!parseDecimalFloat("inf", value));
  assert(!parseDecimalFloat("1e100", value));
}
