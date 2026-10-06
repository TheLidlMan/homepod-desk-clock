#include <cassert>
#include <cstring>
#include <string>
#include "DashboardPageLoader.h"

struct File {
  std::string bytes;
  size_t offset = 0;
  size_t reads = 0;
  bool seek(size_t position) {
    if (position > bytes.size()) return false;
    offset = position;
    return true;
  }
  bool available() const { return offset < bytes.size(); }
  int read() { ++reads; return available() ? uint8_t(bytes[offset++]) : -1; }
  size_t readBytes(char *output, size_t size) {
    size_t count = 0;
    while (count < size && available()) output[count++] = read();
    return count;
  }
};

int main() {
  File file{R"({"version":1,"pages":[{"id":"first","rows":[{"cards":[{"title":"Łódź","source":"sensor.power"}]}]},{"id":"second"}]})"};
  DashboardPageLoader cache;
  assert(cache.allocatedBytes() == 0);
  assert(cache.load(file, 0));
  assert(cache.contains(0));
  assert(cache.allocatedBytes() < cache.kDocumentCapacity);
  assert(strcmp(cache.page()["rows"][0]["cards"][0]["title"], "Łódź") == 0);
  const size_t reads = file.reads;
  const size_t memory = cache.allocatedBytes();
  for (unsigned i = 0; i < 1000; ++i) {
    assert(cache.load(file, 0));
    assert(strcmp(cache.page()["id"], "first") == 0);
    assert(cache.allocatedBytes() == memory);
  }
  assert(file.reads == reads);
  assert(cache.parseCount() == 1);
  assert(cache.load(file, 1));
  assert(!cache.contains(0));
  assert(strcmp(cache.page()["id"], "second") == 0);
  assert(cache.parseCount() == 2);
  assert(cache.allocatedBytes() == memory);
  cache.clear();
  file.bytes = "{\"pages\":[{\"id\":\"small\"},{\"id\":\"large\",\"rows\":[{\"cards\":[{\"text\":\"" +
      std::string(2600, 'x') + "\"}]}]}]}";
  assert(cache.load(file, 0));
  const size_t smallCapacity = cache.allocatedBytes();
  assert(cache.load(file, 1));
  assert(strcmp(cache.page()["id"], "large") == 0);
  assert(cache.allocatedBytes() > smallCapacity);
  assert(cache.allocatedBytes() < cache.kDocumentCapacity);
  cache.clear();
  assert(cache.allocatedBytes() == 0);
  file.bytes = R"({"pages":[{"id":"updated"}]})";
  assert(cache.load(file, 0));
  assert(strcmp(cache.page()["id"], "updated") == 0);
  cache.clear();
  file.bytes = R"({"pages":[{"id":bad}]})";
  assert(!cache.load(file, 0));
  assert(cache.allocatedBytes() == 0);
  assert(!cache.contains(0));
  file.bytes = "{\"pages\":[{\"id\":\"" + std::string(7000, 'x') + "\"}]}";
  assert(!cache.load(file, 0));
  assert(cache.error() == DashboardPageLoader::Error::PageTooLarge);
  assert(cache.allocatedBytes() == 0);
}
