#include <cassert>
#include "HomePodWiFiAdapter.h"

int main() {
  HomePodWiFiAdapter adapter(IPAddress(192, 168, 1, 100));
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
  // Close with unread data, then repeat: the next handshake must remain possible.
  for (unsigned retry = 0; retry < 100; ++retry) {
    hap_io socket{};
    assert(factory.connect(factory.opaque, 7000, &socket));
    assert(factory.available(factory.opaque, &socket) > 0);
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
  assert(rx.read(rx.opaque,bytes,sizeof(bytes))==-1&&fakeTick==before);
  factory.close(factory.opaque,&rx);incomingAvailable=true;
}
