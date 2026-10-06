#include <assert.h>
#include <math.h>

#include "NumberTransform.h"

int main() {
  NumberTransform transform;
  assert(transform.apply(12.5F) == 12.5F);

  transform.multiply = 1.8F;
  transform.add = 32.0F;
  assert(fabsf(transform.apply(10.0F) - 50.0F) < 0.001F);

  transform.multiply = 1.0F;
  transform.add = 0.0F;
  transform.absolute = true;
  transform.minimum = 10.0F;
  transform.maximum = 40.0F;
  assert(transform.apply(-5.0F) == 10.0F);
  assert(transform.apply(100.0F) == 40.0F);
}
