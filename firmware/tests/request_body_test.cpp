#include <cassert>
#include <memory>
#include <string>
#include <cstdio>
#include <functional>
#include "RequestBodyWebServer.h"

struct Body {
  std::unique_ptr<char[]> allocation;
  Body() = default;
  explicit Body(size_t bytes) : allocation(new char[bytes]) {}
};

struct Text : std::string {
  using std::string::string;
  bool startsWith(const char *prefix) const { return find(prefix) == 0; }
};

class Server {
 protected:
  struct Argument { std::string key; Body value; };
  Argument _currentArgs[2];
  int _currentArgCount = 1;
  int _currentArgsHavePlain = 1;

 public:
  static constexpr int CLIENT_REQUEST_CAN_CONTINUE = 0;
  std::function<int(const Text &, const Text &, void *, int)> hook;
  template <typename Hook> void addHook(Hook value) { hook = value; }
  explicit Server(int) {
    _currentArgs[0] = {"render", Body(8)};
    _currentArgs[1] = {"plain", Body(12288)};
  }
  bool bodyPresent() const { return bool(_currentArgs[1].value.allocation); }
  bool queryPresent() const { return bool(_currentArgs[0].value.allocation); }
  void withoutBody() { _currentArgsHavePlain = 0; }
};

int main() {
  RequestBodyWebServer<Server> server(80);
  assert(server.bodyPresent());
  server.releaseRequestBody();
  assert(!server.bodyPresent());
  assert(server.queryPresent());
  int prepared = 0;
  server.prepareDashboardRequests([&] { ++prepared; });
  for (const char *url : {"/api/v1/dashboard", "/api/v1/dashboard?render=false"}) {
    assert(server.hook("PUT", url, nullptr, 0) == Server::CLIENT_REQUEST_CAN_CONTINUE);
  }
  server.hook("GET", "/api/v1/dashboard", nullptr, 0);
  server.hook("PUT", "/api/v1/data", nullptr, 0);
  server.hook("PUT", "/api/v1/dashboard-other", nullptr, 0);
  assert(prepared == 2);
  server.releaseRequestBody();
  server.withoutBody();
  server.releaseRequestBody();
  assert(server.queryPresent());
  puts("request body: released, query preserved, repeated/absent safe");
}
