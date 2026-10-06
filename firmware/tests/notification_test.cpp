#include <cassert>
#include <string>
#include "NotificationRequest.h"
#include "ApiAccessPolicy.h"

static std::unique_ptr<DisplayNotification> message(const char *title = "Door") {
  auto result = std::make_unique<DisplayNotification>();
  strcpy(result->title, title);
  result->durationMs = 1000;
  return result;
}

static void stateTests() {
  NotificationCenter center;
  assert(center.maxVisible() == 3);
  assert(!center.setMaxVisible(0) && !center.setMaxVisible(4));
  assert(center.setMaxVisible(1));
  assert(center.enqueue(message()));
  assert(center.enqueue(message("Power")));
  assert(center.enqueue(message("Alarm")));
  assert(!center.enqueue(message("Rejected")));
  assert(center.count() == 3);
  center.advance(100, 240, 240, true);
  assert(center.bounds().bottom() == 0);
  center.presented(100);
  center.advance(220, 240, 240, true);
  assert(center.bounds().y < 8 && center.bounds().bottom() > 0);
  center.presented(220);
  center.advance(340, 240, 240, true);
  assert(center.bounds().y == 8);
  // A delayed draw must not consume the message's readable hold time.
  center.presented(800);
  center.advance(1799, 240, 240, true);
  assert(center.bounds().y == 8);
  center.advance(1800, 240, 240, true);
  center.presented(1800);
  center.advance(2040, 240, 240, true);
  assert(center.bounds().bottom() == 0);
  center.presented(2040);
  assert(center.count() == 2 && !strcmp(center.current()->title, "Power"));
  center.dismissAll();
  assert(!center.active() && center.bounds().empty());
  center.presented(5000);
  assert(center.count() == 0);

  // millis() rollover and very slow displays use the same duration semantics.
  center.enqueue(message());
  center.advance(0xfffffff0U, 240, 240, false);
  center.presented(0xfffffff0U);
  center.advance(0x00000010U, 240, 240, false);
  assert(center.count() == 1 && center.bounds().y == 8);
  center.advance(0x000003e0U, 240, 240, false);
  center.presented(0x000003e0U);
  assert(!center.active());

  for (uint8_t i = 0; i < 8; ++i) {
    auto item = message();
    item->position = static_cast<NotificationPosition>(i);
    center.enqueue(std::move(item));
    center.advance(0, 480, 320, true);
    const auto hidden = clipSceneRect(center.bounds(), 480, 320);
    assert(hidden.empty());
    center.advance(240, 480, 320, true);
    const auto rect = center.bounds();
    assert(rect.x >= 8 && rect.y >= 8 && rect.right() <= 472 && rect.bottom() <= 312);
    center.dismissAll();
  }
  NotificationPosition position{};
  assert(parseNotificationPosition("bottom", position, 240, 240));
  assert(!parseNotificationPosition("top_right", position, 240, 240));
  assert(parseNotificationPosition("top_right", position, 320, 240));
  assert(!parseNotificationPosition(nullptr, position, 480, 320));
  assert(sizeof(NotificationCenter) < 256);
  assert(sizeof(DisplayNotification) < 640);
}

static void simultaneousTests() {
  NotificationCenter center;
  auto a = message("First"), b = message("Second"), c = message("Third");
  a->durationMs = 4000;
  b->durationMs = 1000;
  c->durationMs = 2500;
  c->position = NotificationPosition::Bottom;
  center.enqueue(std::move(a));
  center.enqueue(std::move(b));
  center.enqueue(std::move(c));
  center.advance(0, 240, 240, false);
  center.presented(100);
  assert(center.visibleCount() == 3);
  for (uint8_t i = 0; i < 3; ++i) {
    const auto rect = center.bounds(i);
    assert(rect.y >= 8 && rect.bottom() <= 232);
    for (uint8_t j = i + 1; j < 3; ++j)
      assert(rect.bottom() <= center.bounds(j).y || center.bounds(j).bottom() <= rect.y);
  }
  const auto revision = center.revision();
  center.advance(1100, 240, 240, false);
  center.presented(1100);
  assert(center.count() == 2 && center.revision() != revision);
  assert(!strcmp(center.item(0)->title, "First") && !strcmp(center.item(1)->title, "Third"));
  center.advance(2600, 240, 240, false);
  center.presented(2600);
  assert(center.count() == 1);
  center.advance(4100, 240, 240, false);
  center.presented(4100);
  assert(!center.active());

  // Reducing the visible count pauses hidden timers, not already visible ones.
  center.enqueue(message("One"));
  center.enqueue(message("Two"));
  center.advance(0, 240, 240, false);
  center.presented(0);
  center.setMaxVisible(1);
  center.advance(200, 240, 240, false);
  assert(center.item(1) == nullptr);
  center.advance(1000, 240, 240, false);
  center.presented(1000);
  assert(center.count() == 1);
  center.advance(1001, 240, 240, false);
  center.presented(1001);
  center.advance(1800, 240, 240, false);
  center.presented(1800);
  assert(center.count() == 1);
  center.advance(1801, 240, 240, false);
  center.presented(1801);
  assert(!center.active());

  // All mixed positions remain separated on a larger display.
  center.setMaxVisible(3);
  for (uint8_t p = 0; p < 8; ++p) for (uint8_t q = 0; q < 8; ++q) for (uint8_t r = 0; r < 8; ++r) {
    for (auto position : {p, q, r}) {
      auto item = message();
      item->position = static_cast<NotificationPosition>(position);
      center.enqueue(std::move(item));
    }
    center.advance(0, 480, 320, false);
    for (uint8_t i = 0; i < 3; ++i) {
      const auto rect = center.bounds(i);
      assert(rect.y >= 8 && rect.bottom() <= 312);
      for (uint8_t j = i + 1; j < 3; ++j)
        assert(rect.bottom() <= center.bounds(j).y || center.bounds(j).bottom() <= rect.y);
    }
    center.dismissAll();
  }
}

static void accessTests() {
  for (bool protect : {false, true}) for (bool passwordSet : {false, true}) {
    assert(apiAccessPolicy(true, true, protect, passwordSet) == ApiAccessPolicy::SetupMode);
    assert(apiAccessPolicy(false, false, protect, passwordSet) == ApiAccessPolicy::NotConfigured);
  }
  assert(apiAccessPolicy(false, true, false, false) == ApiAccessPolicy::Open);
  assert(apiAccessPolicy(false, true, false, true) == ApiAccessPolicy::Open);
  assert(apiAccessPolicy(false, true, true, false) == ApiAccessPolicy::PasswordMissing);
  assert(apiAccessPolicy(false, true, true, true) == ApiAccessPolicy::Authenticate);
}

static void validationTests() {
  const auto valid = [](const std::string &body) {
    DynamicJsonDocument document(2048);
    assert(!deserializeJson(document, body));
    DisplayNotification item;
    return parseNotificationRequest(document.as<JsonVariantConst>(), item,
                                    NotificationPosition::Bottom, 240, 240) == nullptr;
  };
  assert(valid(R"({"message":"Door opened"})"));
  assert(valid(R"({"title":"Ładowanie zakończone","durationSeconds":300,"severity":"success","icon":"check"})"));
  for (const auto *body : {"null", "[]", "{}", R"({"title":42})", R"({"message":"\u0000"})",
      R"({"message":"\t"})", R"({"message":" \n "})", R"({"message":"ok","durationSeconds":false})",
      R"({"message":"ok","durationSeconds":0})", R"({"message":"ok","durationSeconds":301})",
      R"({"message":"ok","durationSeconds":1.5})", R"({"message":"ok","severity":"other"})",
      R"({"message":"ok","position":"left"})", R"({"message":"ok","icon":"https://example.org/icon.svg"})",
      R"({"message":"ok","unknown":1})"}) assert(!valid(body));
  assert(valid("{\"message\":\"" + std::string(384, 'a') + "\"}"));
  assert(!valid("{\"message\":\"" + std::string(385, 'a') + "\"}"));
  assert(validNotificationText("żółć", strlen("żółć"), 96));
  assert(validNotificationText("😀", 4, 96));
  for (const auto *value : {"\xc0\xaf", "\xe0\x80\x80", "\xed\xa0\x80", "\xf4\x90\x80\x80", "\xc3"})
    assert(!validNotificationText(value, strlen(value), 96));
}

static void wrappingTests() {
  NotificationLine lines[8];
  const auto measure = [](const char *value) { return static_cast<int>(strlen(value) * 8); };
  const char *text = "First line\nSecond line";
  assert(wrapNotificationText(text, lines, 8, 100, measure) == 2);
  assert(lines[0].length == 10 && lines[1].start == 11);
  const std::string longText(384, 'x');
  assert(wrapNotificationText(longText.c_str(), lines, 1, 2000, measure) == 1);
  assert(lines[0].ellipsis && lines[0].length <= 93);
  const char *unicode = "żółć żółć żółć";
  const auto count = wrapNotificationText(unicode, lines, 8, 40, measure);
  for (uint8_t i = 0; i < count; ++i)
    assert(validNotificationText(unicode + lines[i].start, lines[i].length, 96));
}

int main() { stateTests(); simultaneousTests(); validationTests(); wrappingTests(); accessTests(); }
