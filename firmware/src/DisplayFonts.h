#pragma once

#include "StaticSmoothFont.h"
#include "UserFonts.h"

const GFXfont *builtInFontFor(const char *family, uint8_t size);
RenderFont renderFontFor(const char *family, uint8_t size);
RenderFont compactCardTitleFont();
bool isBuiltInCardTitleFamily(const char *family);
StaticSmoothFont notificationTitleFont();
StaticSmoothFont notificationBodyFont();
