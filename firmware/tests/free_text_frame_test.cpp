#include <cassert>
#include "FreeTextFrame.h"

int main() {
  StaticJsonDocument<1024> document;
  assert(!deserializeJson(document, R"({"title":"Test","frame":{"x":10,"y":20,"width":50,"height":40}})"));
  auto card = document.as<JsonObject>();
  auto title = freeTextFrame(card, true);
  auto value = freeTextFrame(card, false);
  assert(title.x == 24 && title.y == 48 && title.height == 29);
  assert(value.x == 24 && value.y == 77 && value.height == 67);
  assert(!deserializeJson(document, R"({"title":"Test","showTitle":false,"frame":{"x":0,"y":0,"width":50,"height":50},"titleFrame":{"x":60,"y":5,"width":35,"height":20},"valueFrame":{"x":5,"y":70,"width":90,"height":25}})"));
  card = document.as<JsonObject>();
  title = freeTextFrame(card, true);
  value = freeTextFrame(card, false);
  assert(title.x == 144 && title.y == 12 && title.width == 84);
  assert(value.x == 12 && value.y == 168 && value.height == 60);
  card["frame"]["x"] = 30;
  card["showTitle"] = true;
  assert(freeTextFrame(card, true).x == title.x);
  assert(freeTextFrame(card, false).y == value.y);
  assert(validFreeTextFrame(card["titleFrame"]));
  card["titleFrame"]["width"] = 60;
  assert(!validFreeTextFrame(card["titleFrame"]));
  card["titleFrame"]["width"] = "30";
  assert(!validFreeTextFrame(card["titleFrame"]));
  card["titleFrame"]["width"] = 1;
  assert(!validFreeTextFrame(card["titleFrame"]));
  assert(!validFreeTextFrame(card["missing"]));
}
