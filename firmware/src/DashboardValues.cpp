#include "DashboardValues.h"

#include <cstring>

namespace {

void fingerprintSource(const char *source, uint32_t &hash, uint32_t &check) {
  hash = 2166136261UL;
  check = 5381UL;
  for (const uint8_t *cursor = reinterpret_cast<const uint8_t *>(source);
       *cursor; ++cursor) {
    hash = (hash ^ *cursor) * 16777619UL;
    check = ((check << 5) + check) ^ *cursor;
  }
}

}  // namespace

DashboardValue *DashboardValues::find(const char *source, bool create) {
  if (source == nullptr || source[0] == '\0') return nullptr;
  uint32_t sourceHash = 0;
  uint32_t sourceCheck = 0;
  fingerprintSource(source, sourceHash, sourceCheck);
  for (uint8_t index = 0; index < size_; ++index) {
    if (values_[index].sourceHash == sourceHash &&
        values_[index].sourceCheck == sourceCheck &&
        strcmp(values_[index].source, source) == 0) {
      return &values_[index];
    }
  }
  if (!create || size_ >= kMaxDashboardValues) return nullptr;
  const size_t length = strlen(source);
  if (length > 64) return nullptr;
  char *name = static_cast<char *>(malloc(length + 1));
  if (!name) return nullptr;
  memcpy(name, source, length + 1);
  DashboardValue *slot = &values_[size_++];
  *slot = DashboardValue{};
  slot->source = name;
  slot->sourceHash = sourceHash;
  slot->sourceCheck = sourceCheck;
  return slot;
}

uint8_t DashboardValues::indexOf(const DashboardValue *value) const {
  if (value < values_ || value >= values_ + size_) return UINT8_MAX;
  return static_cast<uint8_t>(value - values_);
}
