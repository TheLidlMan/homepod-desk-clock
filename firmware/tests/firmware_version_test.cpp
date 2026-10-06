#include <assert.h>

#include "FirmwareVersion.h"

int main() {
  FirmwareVersion parsed;
  assert(parseFirmwareVersion("0.2.0", parsed));
  assert(parsed.major == 0 && parsed.minor == 2 && parsed.patch == 0);
  assert(!parsed.prerelease);
  assert(parseFirmwareVersion("v1.2.3-rc.1", parsed));
  assert(parsed.prerelease);
  assert(!parseFirmwareVersion("1.2", parsed));
  assert(!parseFirmwareVersion("1", parsed));
  assert(!parseFirmwareVersion("1.2.3-rc..1", parsed));
  assert(!parseFirmwareVersion("1.2.3/firmware.bin", parsed));

  assert(newerFirmwareVersion("0.2.0", "0.0.0-dev"));
  assert(newerFirmwareVersion("0.2.0", "0.1.1"));
  assert(newerFirmwareVersion("0.2.0", "0.2.0-rc.1"));
  assert(!newerFirmwareVersion("0.2.0", "0.2.0-dev"));
  assert(newerFirmwareVersion("0.2.1", "0.2.0-dev"));
  assert(!newerFirmwareVersion("0.2.0", "0.2.0"));
  assert(!newerFirmwareVersion("0.1.1", "0.2.0"));
  assert(!newerFirmwareVersion("0.2.0-rc.1", "0.2.0"));
}
