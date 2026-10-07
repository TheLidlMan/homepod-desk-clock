#pragma once
#include "Arduino.h"
#include <map>
#include <memory>
#include <vector>
extern unsigned openFiles;
struct FileData {std::vector<uint8_t> bytes;};
class File {
 struct Handle {std::shared_ptr<FileData> data;size_t pos=0;explicit Handle(std::shared_ptr<FileData> d):data(d){++openFiles;}~Handle(){--openFiles;}};
 std::shared_ptr<Handle> h;
 public:
 File()=default;explicit File(std::shared_ptr<FileData> d):h(std::make_shared<Handle>(d)){}
 explicit operator bool()const{return bool(h);}void close(){h.reset();}
 size_t size()const{return h?h->data->bytes.size():0;}size_t position()const{return h?h->pos:0;}
 bool seek(size_t p){if(!h||p>size())return false;h->pos=p;return true;}
 size_t read(uint8_t *out,size_t n){if(!h)return 0;n=std::min(n,size()-h->pos);std::memcpy(out,h->data->bytes.data()+h->pos,n);h->pos+=n;return n;}
};
struct FakeFS {
 std::map<std::string,std::shared_ptr<FileData>> files;
 File open(const String &path,const char*){auto i=files.find(path);return i==files.end()?File():File(i->second);}
};
extern FakeFS LittleFS;
