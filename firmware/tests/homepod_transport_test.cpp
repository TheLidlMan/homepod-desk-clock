#include <cassert>
#include "HomePodWiFiAdapter.h"

int main() {
  HomePodWiFiAdapter adapter(IPAddress(192, 168, 10, 98));
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
}
