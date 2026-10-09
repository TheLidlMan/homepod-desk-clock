#pragma once
#include <algorithm>
#include <cstring>
#include <map>
#include <memory>
#include <string>
#include "ESP8266WiFi.h"
inline std::map<std::string,std::shared_ptr<std::string>> testFiles;
inline bool spoolWriteFails=false,spoolReadFails=false,spoolCloseTruncates=false;
inline uint32_t spoolWriteMillis=0;
class File {
  std::shared_ptr<std::string> bytes_;
  size_t offset_=0;
  bool writer_=false;
 public:
  File()=default;
  File(std::shared_ptr<std::string> bytes,bool writer):bytes_(bytes),writer_(writer){}
  explicit operator bool() const {return bytes_!=nullptr;}
  size_t size() const {return bytes_?bytes_->size():0;}
  size_t write(const uint8_t *p,size_t n){
    fakeTick+=spoolWriteMillis;
    if(!bytes_||spoolWriteFails)return 0;
    bytes_->append(reinterpret_cast<const char *>(p),n);return n;
  }
  size_t read(uint8_t *p,size_t n){
    if(!bytes_||spoolReadFails)return 0;
    n=std::min(n,bytes_->size()-offset_);std::memcpy(p,bytes_->data()+offset_,n);offset_+=n;return n;
  }
  void close(){
    if(bytes_&&writer_&&spoolCloseTruncates&&!bytes_->empty())bytes_->pop_back();
    bytes_.reset();
  }
};
struct FakeLittleFS {
  File open(const char *path,const char *mode){
    if(mode[0]=='w'){auto p=std::make_shared<std::string>();testFiles[path]=p;return File(p,true);}
    auto found=testFiles.find(path);return found==testFiles.end()?File():File(found->second,false);
  }
  bool remove(const char *path){return testFiles.erase(path)!=0;}
  bool exists(const char *path) const {return testFiles.count(path)!=0;}
};
inline FakeLittleFS LittleFS;
