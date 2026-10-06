#pragma once

#include <Arduino.h>

inline constexpr uint8_t kMaxDashboardValues = 32;

struct DashboardValue {
  char *source = nullptr;
  uint32_t sourceHash = 0;
  uint32_t sourceCheck = 0;
  char state[49]{};
  bool available = false;
};

class DashboardValues {
 public:
  DashboardValue *find(const char *source, bool create);
  uint8_t indexOf(const DashboardValue *value) const;
  DashboardValue *data() { return values_; }
  const DashboardValue *data() const { return values_; }
  uint8_t size() const { return size_; }

 private:
  DashboardValue values_[kMaxDashboardValues]{};
  uint8_t size_ = 0;
};
