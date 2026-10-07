#include "ImageAssets.h"
#include <cassert>
#include <cstdio>
FakeESP ESP;FakeFS LittleFS;unsigned openFiles=0;
static const char *id="0000000000000001";
static void replace(uint16_t color){
 auto data=std::make_shared<FileData>();
 data->bytes={'M','D','I','2',1,0,1,0,3,0,0x80,static_cast<uint8_t>(color),static_cast<uint8_t>(color>>8)};
 LittleFS.files["/img_0000000000000001.mdi"]=data;
}
int main(){
 ImageAssetRenderCache cache;uint16_t width=0,height=0,pixel=0;
 for(unsigned cycle=0;cycle<1000;++cycle){
  replace(0x1234);cache.enableRowCache();assert(cache.hasRowCache());
  assert(cache.open(id,0,&width,&height)&&width==1&&height==1&&openFiles==1);
  assert(cache.readRow(id,0,0,1,&pixel)&&pixel==0x1234);
  // Same asset ID, new cover. Neither old file nor old decoded pixels may survive.
  replace(0xabcd);cache.setCooperativeYield(false);cache.reset();
  assert(openFiles==0&&!cache.hasRowCache()&&cache.cooperativeYield());
  cache.enableRowCache();assert(cache.open(id,0,&width,&height));
  assert(cache.readRow(id,0,0,1,&pixel)&&pixel==0xabcd);
  cache.reset();cache.reset();assert(openFiles==0&&!cache.hasRowCache());
 }
 ESP.heap=8192;cache.enableRowCache();assert(!cache.hasRowCache());
 ESP.heap=32000;ESP.block=512;cache.enableRowCache();assert(!cache.hasRowCache());
 ESP.block=16000;
 {ImageAssetRenderCache local;local.enableRowCache();assert(local.open(id,0,&width,&height));}
 assert(openFiles==0);puts("Image cache release/replacement regressions passed");
}
