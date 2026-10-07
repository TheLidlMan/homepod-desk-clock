#pragma once
#include <algorithm>
#include <cstdint>
#include <cstring>
#include <string>
using std::min;using std::max;
class String : public std::string {
 public:using std::string::string;String(const std::string &s):std::string(s){}
};
inline size_t strlcpy(char *d,const char *s,size_t n){size_t k=std::strlen(s);if(n){std::memcpy(d,s,std::min(k,n-1));d[std::min(k,n-1)]=0;}return k;}
inline void optimistic_yield(unsigned){}
struct FakeESP {size_t heap=32000,block=16000;size_t getFreeHeap()const{return heap;}size_t getMaxFreeBlockSize()const{return block;}};
extern FakeESP ESP;
