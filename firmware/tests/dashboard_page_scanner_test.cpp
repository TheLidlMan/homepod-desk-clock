#include <cassert>
#include <string>

#include "DashboardPageScanner.h"

DashboardPageSlice scan(const std::string &json, uint8_t index) {
  DashboardPageScanner scanner(index);
  for (char character : json) {
    if (scanner.consume(character)) break;
  }
  assert(scanner.found());
  return scanner.slice();
}

int main() {
  const std::string json =
      R"({"version":1,"note":"pages","pages" : [{"id":"one","title":"a } b","nested":{"x":1}},{"id":"two","rows":[{"text":"quoted \\\" value"}]}],"after":true})";

  const DashboardPageSlice first = scan(json, 0);
  assert(json.substr(first.offset, first.length) ==
         R"({"id":"one","title":"a } b","nested":{"x":1}})");

  const DashboardPageSlice second = scan(json, 1);
  assert(json.substr(second.offset, second.length) ==
         R"({"id":"two","rows":[{"text":"quoted \\\" value"}]})");

  DashboardPageScanner missing(2);
  for (char character : json) missing.consume(character);
  assert(!missing.found());
}
