#pragma once
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <memory>

inline uint32_t fakeTick = 0;
inline unsigned retainedContexts = 0;
inline bool nextConnectSucceeds = true;
inline uint32_t heapLimit=18000,blockLimit=16000;
inline bool incomingAvailable=true;
inline uint32_t millis() { return fakeTick; }
inline void delay(unsigned ms) { fakeTick += ms; }
struct IPAddress { IPAddress(int, int, int, int) {} };
struct FakeESP {
  uint32_t getFreeHeap() const { return heapLimit - retainedContexts * 6000; }
  uint32_t getMaxFreeBlockSize() const { return retainedContexts ? 4808 : blockLimit; }
};
inline FakeESP ESP;
class WiFiClient {
  struct Context {
    bool closed = false;
    Context() { ++retainedContexts; }
    ~Context() { --retainedContexts; }
  };
  std::shared_ptr<Context> context_;
 public:
  void setTimeout(unsigned) {}
  bool connect(const IPAddress &, uint16_t) {
    context_ = std::make_shared<Context>();
    return nextConnectSucceeds;
  }
  // Matches the pinned SDK: stop closes TCP but retains ClientContext/RX buffers.
  bool stop(unsigned) { if (context_) context_->closed = true; return true; }
  int available() const { return context_ && incomingAvailable ? 6000 : 0; }
  size_t peekAvailable() const { return context_ && incomingAvailable ? 6000 : 0; }
  bool connected() const { return context_ && !context_->closed; }
  int read(uint8_t *bytes, size_t size) { std::memset(bytes, 0, size); return size; }
  size_t write(const uint8_t *, size_t size) { return size; }
};
