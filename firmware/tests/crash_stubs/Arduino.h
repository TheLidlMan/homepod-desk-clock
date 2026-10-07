#pragma once
#include <algorithm>
#include <cstdint>
#include <cstring>
using std::min;
extern uint32_t fakeMillis;
inline uint32_t millis(){return fakeMillis;}
struct FakeESP {
 uint32_t memory[128]{};unsigned writes=0;bool failWrite=false,failRead=false;
 bool rtcUserMemoryRead(uint32_t off,uint32_t *out,size_t n){if(failRead||off+n/4>128||n%4)return false;std::memcpy(out,memory+off,n);return true;}
 bool rtcUserMemoryWrite(uint32_t off,uint32_t *in,size_t n){if(failWrite||off+n/4>128||n%4)return false;std::memcpy(memory+off,in,n);++writes;return true;}
};
extern FakeESP ESP;
