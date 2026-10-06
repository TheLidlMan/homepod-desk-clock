#include "TextFlow.h"
#include <cassert>
#include <iostream>

int main() {
  const auto measure = [](const char *text) {
    int count = 0;
    for (; *text; ++text) if ((uint8_t(*text) & 0xc0) != 0x80) ++count;
    return count;
  };
  auto words = wrapDisplayText("hello world again", 6, 6, measure);
  assert(strcmp(words.text, "hello\nworld\nagain") == 0);
  assert(words.lines == 3);
  auto unicode = wrapDisplayText("żółwąęść", 4, 6, measure);
  assert(strcmp(unicode.text, "żółw\nąęść") == 0);
  auto limited = wrapDisplayText("one two three", 4, 2, measure);
  assert(strcmp(limited.text, "one\ntwo") == 0);
  auto explicitBreak = wrapDisplayText("a\nb", 20, 6, measure);
  assert(strcmp(explicitBreak.text, "a\nb") == 0);
  assert(wrapDisplayText("", 20, 6, measure).lines == 0);
  char large[600];
  memset(large, 'x', sizeof(large)-1); large[599] = '\0';
  auto bounded = wrapDisplayText(large, 4, 255, measure);
  assert(bounded.lines <= 6 && strlen(bounded.text) < 145);
  std::cout << "text flow: words, utf8, explicit breaks and bounds passed\n";
}
