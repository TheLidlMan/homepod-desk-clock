#include "CrashDiagnostics.h"
#include <Arduino.h>

#if defined(ESP8266)
extern "C" {
#include <user_interface.h>
extern void *umm_last_fail_alloc_addr;
extern int umm_last_fail_alloc_size;
}

namespace {
constexpr uint32_t kMagic = 0x4d444331;
// User RTC words 0..31 belong to the OTA bootloader. Never touch them.
constexpr uint32_t kRtcOffset = 32;
struct CrashRecord {
  uint32_t magic;
  uint32_t reason;
  uint32_t exception;
  uint32_t pc;
  uint32_t allocationCaller;
  uint32_t allocationBytes;
  uint32_t addressCount;
  uint32_t addresses[16];
  uint32_t checksum;
};
static_assert(sizeof(CrashRecord) <= 384, "Must not overlap RTC/OTA storage");
CrashRecord record{};
bool valid = false;

uint32_t checksum() {
  const uint32_t *words = reinterpret_cast<const uint32_t *>(&record);
  uint32_t result = kMagic;
  for (size_t i = 0; i < sizeof(record) / 4 - 1; ++i) result ^= words[i];
  return result;
}
}  // namespace

// Called by the ESP8266 core before its restart erases the detailed cause.
// No heap or flash writes. Store code addresses only, never raw stack data.
extern "C" void custom_crash_callback(rst_info *reason, uint32_t stack,
                                       uint32_t stackEnd) {
  record = {};
  record.magic = kMagic;
  record.reason = reason->reason;
  record.exception = reason->exccause;
  record.pc = reason->epc1;
  record.allocationCaller = reinterpret_cast<uint32_t>(umm_last_fail_alloc_addr);
  record.allocationBytes = umm_last_fail_alloc_size;
  if (stack >= 0x3ffe8000 && stackEnd <= 0x40000000 && stack <= stackEnd) {
    const uint32_t end = min<uint32_t>(stackEnd, stack + 1024);
    for (uint32_t pointer = (stack + 3) & ~3U;
         pointer + 4 <= end && record.addressCount < 16; pointer += 4) {
      const uint32_t address = *reinterpret_cast<const uint32_t *>(pointer);
      if (address >= 0x40000000 && address < 0x40300000)
        record.addresses[record.addressCount++] = address;
    }
  }
  record.checksum = checksum();
  ESP.rtcUserMemoryWrite(kRtcOffset, reinterpret_cast<uint32_t *>(&record), sizeof(record));
}
#endif

void loadCrashDiagnostics() {
#if defined(ESP8266)
  valid = ESP.rtcUserMemoryRead(kRtcOffset, reinterpret_cast<uint32_t *>(&record), sizeof(record)) &&
          record.magic == kMagic && record.addressCount <= 16 && record.checksum == checksum();
  uint32_t empty = 0;
  ESP.rtcUserMemoryWrite(kRtcOffset, &empty, sizeof(empty));
#endif
}

void writeCrashDiagnostics(JsonObject result) {
#if defined(ESP8266)
  result["captured"] = valid;
  if (!valid) return;
  result["reason"] = record.reason;
  result["exception"] = record.exception;
  result["pc"] = record.pc;
  result["allocationCaller"] = record.allocationCaller;
  result["allocationBytes"] = record.allocationBytes;
  JsonArray addresses = result.createNestedArray("codeAddresses");
  for (uint32_t i = 0; i < record.addressCount; ++i) addresses.add(record.addresses[i]);
#else
  result["captured"] = false;
#endif
}
