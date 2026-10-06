#pragma once

#include <cmath>
#include <cstdint>

// Limits logical frames, not SPI tiles. Deadlines never block networking.
class DisplayRefresh {
 public:
  static bool valid(float hz) { return std::isfinite(hz) && hz >= 0.1F && hz <= 60.0F; }
  void setRate(float hz) { if (valid(hz)) rate_ = hz; }
  float rate() const { return rate_; }
  uint32_t intervalMs() const { return uint32_t(std::ceil(1000.0F / rate_)); }
  bool ready(uint32_t now) const { return !painted_ || uint32_t(now - completedAt_) >= intervalMs(); }
  void completed(uint32_t now) { completedAt_ = now; painted_ = true; }

 private:
  float rate_ = 60.0F;
  uint32_t completedAt_ = 0;
  bool painted_ = false;
};
