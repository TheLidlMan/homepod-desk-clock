#include <cassert>
#include "HomePodWiFiAdapter.h"
#include <LittleFS.h>
#include <vector>

struct CipherInput {std::vector<uint8_t> bytes;size_t pos=0;bool truncate=false,reclaim=true;};
static int cipher_read(void *opaque,uint8_t *out,size_t n){
  auto &in=*static_cast<CipherInput *>(opaque);
  size_t available=in.bytes.size()-in.pos;if(in.truncate&&available) --available;
  n=std::min(n,available);if(!n)return -1;
  std::memcpy(out,in.bytes.data()+in.pos,n);in.pos+=n;
  if(in.reclaim&&in.pos==in.bytes.size()){heapLimit=18000;blockLimit=16000;}
  return static_cast<int>(n);
}

static void spool_tests(){
  HomePodWiFiAdapter adapter(IPAddress(192,0,2,100));auto f=adapter.factory();
  std::vector<uint8_t> scratch(640);uint8_t *record=nullptr;
  for(size_t n:{size_t(7026+16),size_t(8192+16)}){
    CipherInput in{std::vector<uint8_t>(n,0xa5)};hap_io io{};io.opaque=&in;io.read=cipher_read;
    heapLimit=8500;blockLimit=4000;adapter.beginBudget(800);
    assert(!f.reserve_record(f.opaque,n));
    assert(f.drain_record(f.opaque,&io,scratch.data(),scratch.size(),n,&record));
    assert(in.pos==n&&record&&std::memcmp(record,in.bytes.data(),n)==0);
    assert(!LittleFS.exists("/native-rx.tmp"));free(record);record=nullptr;
  }
  assert(adapter.recordSpools==2);
  for(unsigned failure=0;failure<5;++failure){
    CipherInput in{std::vector<uint8_t>(7042,0xa5)};hap_io io{};io.opaque=&in;io.read=cipher_read;
    in.truncate=failure==0;spoolWriteFails=failure==1;spoolReadFails=failure==2;
    spoolCloseTruncates=failure==3;spoolWriteMillis=failure==4?100:0;
    heapLimit=8500;blockLimit=4000;adapter.beginBudget(800);
    assert(!f.drain_record(f.opaque,&io,scratch.data(),scratch.size(),7042,&record));
    assert(!record&&!LittleFS.exists("/native-rx.tmp"));
  }
  spoolWriteFails=spoolReadFails=spoolCloseTruncates=false;spoolWriteMillis=0;
  CipherInput in{std::vector<uint8_t>(7042,0xa5)};in.reclaim=false;
  hap_io io{};io.opaque=&in;io.read=cipher_read;adapter.beginBudget(800);
  heapLimit=8500;blockLimit=4000;
  assert(!f.drain_record(f.opaque,&io,scratch.data(),scratch.size(),7042,&record));
  assert(!record&&!LittleFS.exists("/native-rx.tmp"));
  in.pos=0;heapLimit=5119;blockLimit=16000;
  assert(!f.drain_record(f.opaque,&io,scratch.data(),scratch.size(),7042,&record)&&in.pos==0);
  heapLimit=18000;
  assert(!f.drain_record(f.opaque,&io,scratch.data(),scratch.size(),8193+16,&record)&&in.pos==0);
  auto stale=LittleFS.open("/native-rx.tmp","w");uint8_t byte=1;stale.write(&byte,1);stale.close();
  adapter.factory();assert(!LittleFS.exists("/native-rx.tmp"));
  assert(adapter.recordSpools==2);
}

int main() {
  spool_tests();
  heapLimit=18000;blockLimit=16000;
  HomePodWiFiAdapter adapter(IPAddress(192, 0, 2, 100));
  // Empty hostname preserves fixed-address mode; missing names cannot use a stale IP.
  const uint32_t original=static_cast<uint32_t>(adapter.address);
  assert(adapter.resolveAddress("") && queryCount==0);
  for(unsigned retry=0;retry<100;++retry){
    discoveredAddress=IPAddress(192,168,1,int(42+retry));
    assert(adapter.resolveAddress("speaker.local"));
    assert(static_cast<uint32_t>(adapter.address)==static_cast<uint32_t>(discoveredAddress));
  }
  assert(static_cast<uint32_t>(adapter.address)!=original);
  const uint32_t lastAddress=static_cast<uint32_t>(adapter.address);
  assert(!adapter.resolveAddress("missing.local"));
  assert(static_cast<uint32_t>(adapter.address)==lastAddress);
  discoveryAvailable=false;
  assert(!adapter.resolveAddress("speaker.local"));
  discoveryAvailable=true;discoveredAddress=IPAddress();
  assert(!adapter.resolveAddress("speaker.local"));
  assert(static_cast<uint32_t>(adapter.address)==lastAddress);
  auto factory = adapter.factory();
  assert(std::strcmp(factory.controller_id,"02:00:00:11:22:33")==0);
  fakeChipId=0x112234;HomePodWiFiAdapter second(IPAddress(192,0,2,101));
  auto secondFactory=second.factory();
  assert(std::strcmp(factory.controller_id,secondFactory.controller_id)!=0);
  fakeChipId=0x112233;assert(std::strcmp(adapter.factory().controller_id,factory.controller_id)==0);
  // Close with unread data, then repeat: the next handshake must remain possible.
  for (unsigned retry = 0; retry < 100; ++retry) {
    hap_io socket{};
    assert(factory.connect(factory.opaque, 7000, &socket));
    assert(factory.available(factory.opaque, &socket) > 0);
    assert(adapter.channels[0].client.getNoDelay());
    assert(!factory.reserve(factory.opaque, 8192));
    factory.close(factory.opaque, &socket);
    assert(socket.opaque == nullptr);
    assert(retainedContexts == 0);
    assert(factory.reserve(factory.opaque, 8192));
  }
  // The SDK also retains context after a failed TCP connect.
  nextConnectSucceeds = false;
  hap_io failed{};
  assert(!factory.connect(factory.opaque, 7000, &failed));
  assert(retainedContexts == 0);
  nextConnectSucceeds = true;
  hap_io sockets[3]{};
  for (auto &socket : sockets) assert(factory.connect(factory.opaque, 7000, &socket));
  hap_io extra{};
  assert(!factory.connect(factory.opaque, 7000, &extra));
  for (auto &socket : sockets) factory.close(factory.opaque, &socket);
  assert(retainedContexts == 0);
  // A queued 6.5 KiB record must drain even with less than the general 4 KiB floor.
  heapLimit=9880;blockLimit=7440;
  assert(!factory.reserve(factory.opaque,6514));
  assert(factory.reserve_record(factory.opaque,6514));
  heapLimit=6514+2048-1;assert(!factory.reserve_record(factory.opaque,6514));
  heapLimit=9880;blockLimit=6513;assert(!factory.reserve_record(factory.opaque,6514));
  heapLimit=20000;blockLimit=16000;
  assert(!factory.reserve_record(factory.opaque,8192+17));
  assert(!factory.reserve_record(factory.opaque,SIZE_MAX));
  // Drain queued bytes below 4 KiB, but never wait for more at that heap level.
  heapLimit=18000;hap_io rx{};assert(factory.connect(factory.opaque,7000,&rx));
  heapLimit=9000;uint8_t bytes[16];incomingAvailable=true;
  assert(rx.read(rx.opaque,bytes,sizeof(bytes))==16&&adapter.minimumHeap==3000);
  incomingAvailable=false;const uint32_t before=fakeTick;
  assert(rx.read(rx.opaque,bytes,sizeof(bytes))==-1&&fakeTick==before&&adapter.lastPhase==94);
  heapLimit=18000;incomingAvailable=true;emptyReceiveHead=true;
  // Total queued bytes must be readable even if the SDK first pbuf is empty.
  assert(adapter.channels[0].client.peekAvailable()==0&&factory.available(factory.opaque,&rx)>0);
  const uint32_t beforeChain=fakeTick;
  assert(rx.read(rx.opaque,bytes,sizeof(bytes))==16&&fakeTick==beforeChain&&!emptyReceiveHead);
  factory.close(factory.opaque,&rx);incomingAvailable=true;
  heapLimit=18000;hap_io tx{};assert(factory.connect(factory.opaque,7000,&tx));
  nextWriteSucceeds=false;
  assert(tx.write(tx.opaque,bytes,sizeof(bytes))==-1&&adapter.lastPhase==92);
  adapter.channels[0].client.stop(20);
  assert(tx.write(tx.opaque,bytes,sizeof(bytes))==-1&&adapter.lastPhase==93);
  nextWriteSucceeds=true;adapter.beginBudget(10);fakeTick+=11;
  assert(tx.write(tx.opaque,bytes,sizeof(bytes))==-1&&adapter.lastPhase==91);
  factory.close(factory.opaque,&tx);assert(retainedContexts==0);
  adapter.beginBudget(800);assert(factory.connect(factory.opaque,7000,&tx));
  fakeTick+=20;assert(tx.write(tx.opaque,bytes,sizeof(bytes))==16&&lastFlushWait==780);
  adapter.beginBudget(30000);
  assert(tx.write(tx.opaque,bytes,sizeof(bytes))==16&&lastFlushWait==800);
  nextFlushSucceeds=false;
  assert(tx.write(tx.opaque,bytes,sizeof(bytes))==-1&&adapter.lastPhase==97);
  assert(!adapter.channels[0].client.connected());
  factory.close(factory.opaque,&tx);assert(retainedContexts==0);
  nextFlushSucceeds=true;
}
