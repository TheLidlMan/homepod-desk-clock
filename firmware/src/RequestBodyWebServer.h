#pragma once

#include <type_traits>

// ESP8266WebServer retains the raw request until the handler returns. Once a
// payload is staged on flash, release it before allocating the JSON document.
// Query arguments and authentication headers must remain available.
template <typename Server>
class RequestBodyWebServer : public Server {
 public:
  using Server::Server;

  template <typename Callback>
  void prepareDashboardRequests(Callback callback) {
    this->addHook([callback](const auto &method, const auto &url, auto *, auto) {
      if (method == "PUT" && (url == "/api/v1/dashboard" ||
                             url.startsWith("/api/v1/dashboard?"))) {
        callback();
      }
      // Only discard disposable render cache. Normal parsing, authentication
      // and request validation still run in the server and route handler.
      return Server::CLIENT_REQUEST_CAN_CONTINUE;
    });
  }

  void releaseRequestBody() {
    for (int index = 0;
         index < this->_currentArgCount + this->_currentArgsHavePlain; ++index) {
      auto &argument = this->_currentArgs[index];
      if (argument.key == "plain") {
        using Value = typename std::decay<decltype(argument.value)>::type;
        // Assignment from an empty temporary frees String's backing buffer;
        // remove()/clear() may retain capacity.
        argument.value = Value{};
      }
    }
  }

};
