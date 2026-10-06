#include "DisplayFonts.h"

#include "fonts/InterTightBold18.h"
#include "fonts/InterTightBold24.h"
#include "fonts/InterTightBold36.h"
#include "fonts/InterTightBold48.h"
#include "fonts/InterTightCompact13.h"
#include "fonts/InterTightSmooth.h"

const GFXfont *builtInFontFor(const char *family, uint8_t size) {
  if (family == nullptr) family = "sans";
  if (strcmp(family, "sans") == 0 || strcmp(family, "sans-bold") == 0) {
    const GFXfont *fonts[] = {
        &InterTightBold18, &InterTightBold24, &InterTightBold36,
        &InterTightBold48};
    return fonts[min<uint8_t>(size, 3)];
  }
  if (strcmp(family, "mono") == 0) {
    const GFXfont *fonts[] = {&FreeMono9pt7b, &FreeMono12pt7b,
                              &FreeMono18pt7b, &FreeMono24pt7b};
    return fonts[min<uint8_t>(size, 3)];
  }
  if (strcmp(family, "serif") == 0) {
    const GFXfont *fonts[] = {&FreeSerif9pt7b, &FreeSerif12pt7b,
                              &FreeSerif18pt7b, &FreeSerif24pt7b};
    return fonts[min<uint8_t>(size, 3)];
  }
  const GFXfont *fonts[] = {
      &InterTightBold18, &InterTightBold24, &InterTightBold36,
      &InterTightBold48};
  return fonts[min<uint8_t>(size, 3)];
}

RenderFont renderFontFor(const char *family, uint8_t size) {
  RenderFont font{builtInFontFor(family, size), -1, size, nullptr};
#if defined(ESP8266)
  const bool font1 = family && strcmp(family, "font1") == 0;
  const bool font2 = family && strcmp(family, "font2") == 0;
  const bool defaultFont =
      family == nullptr || strcmp(family, "default") == 0 ||
      strcmp(family, "sans") == 0 || strcmp(family, "sans-bold") == 0;
  const int8_t requestedSlot = font1 ? 0 : font2 ? 1 : -1;
  if (requestedSlot >= 0 && userFonts.available(requestedSlot, size)) {
    font.userSlot = requestedSlot;
  } else if ((defaultFont || requestedSlot >= 0) &&
             userFonts.activeSlot() >= 0 &&
             userFonts.available(userFonts.activeSlot(), size)) {
    font.userSlot = userFonts.activeSlot();
  } else if (defaultFont && size < 2) {
    const uint8_t *fonts[] = {InterTightSmooth18, InterTightSmooth24};
    font.smooth = fonts[size];
  } else if (defaultFont) {
    font.coverage = builtInCoverageFont(size);
  }
#endif
  return font;
}

bool isBuiltInCardTitleFamily(const char *family) {
  return strcmp(family, "default") == 0 || strcmp(family, "sans") == 0 ||
         strcmp(family, "sans-bold") == 0;
}

RenderFont compactCardTitleFont() {
  return RenderFont{&InterTightCompact13, -1, 0,
#if defined(ESP8266)
                    InterTightSmooth13
#else
                    nullptr
#endif
  };
}

StaticSmoothFont notificationTitleFont() {
  return indexedSmoothFont(InterTightSmooth24);
}

StaticSmoothFont notificationBodyFont() {
  return indexedSmoothFont(InterTightSmooth18);
}
