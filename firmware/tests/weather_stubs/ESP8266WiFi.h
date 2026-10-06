#pragma once
#include <cstring>
#include <string>
#include <stdint.h>

#define F(text) text
inline uint32_t weatherTestTick = 0;
inline uint32_t millis() { return weatherTestTick; }
constexpr int WL_CONNECTED = 3;
struct TestWifi { int status() { return WL_CONNECTED; } };
inline TestWifi WiFi;
inline std::string weatherTestResponse;

class String {
 public:
  String() = default;
  String(const char *text) : text_(text) {}
  void reserve(size_t count) { text_.reserve(count); }
  size_t length() const { return text_.length(); }
  const char *c_str() const { return text_.c_str(); }
  void operator+=(char ch) { text_ += ch; }
  bool startsWith(const char *part) const { return text_.rfind(part, 0) == 0; }
  bool endsWith(const char *part) const {
    const size_t size = strlen(part);
    return text_.size() >= size && text_.compare(text_.size() - size, size, part) == 0;
  }
  int indexOf(const char *part) const {
    const auto position = text_.find(part);
    return position == std::string::npos ? -1 : static_cast<int>(position);
  }
 private:
  std::string text_;
};

class WiFiClient {
 public:
  void setTimeout(uint32_t) {}
  bool connect(const char *, uint16_t) { offset_ = 0; return true; }
  void print(const char *) {}
  int available() const { return weatherTestResponse.size() - offset_; }
  char read() { return weatherTestResponse[offset_++]; }
  bool connected() const { return available() != 0; }
  void stop(unsigned = 0) { offset_ = weatherTestResponse.size(); }
 private:
  size_t offset_ = 0;
};
