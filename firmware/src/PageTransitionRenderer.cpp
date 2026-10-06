#include "PageTransitionRenderer.h"

#include <cstring>
#include <memory>

#include "PageTransitionMath.h"
#include "SceneAnimationTimeline.h"
#include "TransitionPlan.h"
#include "ProgressRenderer.h"
#include "ScenePageRenderer.h"
#include "RuntimeProfiler.h"
#include "UserFonts.h"

namespace {

constexpr int16_t kDisplaySize = 240;
bool parseType(const char *value, PageTransitionType &result) {
  if (strcmp(value, "none") == 0) result = PageTransitionType::None;
  else if (strcmp(value, "random") == 0) result = PageTransitionType::Random;
  else if (strcmp(value, "slide") == 0) result = PageTransitionType::Slide;
  else if (strcmp(value, "bounce") == 0) result = PageTransitionType::Bounce;
  else if (strcmp(value, "fade") == 0) result = PageTransitionType::Fade;
  else if (strcmp(value, "wipe") == 0) result = PageTransitionType::Wipe;
  else if (strcmp(value, "dissolve") == 0) result = PageTransitionType::Dissolve;
  else if (strcmp(value, "curtain") == 0) result = PageTransitionType::Curtain;
  else if (strcmp(value, "blinds") == 0) result = PageTransitionType::Blinds;
  else if (strcmp(value, "mosaic") == 0) result = PageTransitionType::Mosaic;
  else if (strcmp(value, "cascade") == 0 || strcmp(value, "doors") == 0)
    result = PageTransitionType::Cascade;
  else if (strcmp(value, "spiral") == 0) result = PageTransitionType::Spiral;
  else return false;
  return true;
}

bool parseDirection(const char *value, PageTransitionDirection &result) {
  if (strcmp(value, "left") == 0) result = PageTransitionDirection::Left;
  else if (strcmp(value, "right") == 0) result = PageTransitionDirection::Right;
  else if (strcmp(value, "up") == 0) result = PageTransitionDirection::Up;
  else if (strcmp(value, "down") == 0) result = PageTransitionDirection::Down;
  else if (strcmp(value, "random") == 0) result = PageTransitionDirection::Random;
  else return false;
  return true;
}

bool parseSpeed(const char *value, PageTransitionSpeed &result) {
  if (strcmp(value, "slow") == 0) result = PageTransitionSpeed::Slow;
  else if (strcmp(value, "normal") == 0) result = PageTransitionSpeed::Normal;
  else if (strcmp(value, "fast") == 0) result = PageTransitionSpeed::Fast;
  else return false;
  return true;
}

bool parseIntensity(const char *value, PageTransitionIntensity &result) {
  if (strcmp(value, "subtle") == 0) result = PageTransitionIntensity::Subtle;
  else if (strcmp(value, "strong") == 0) result = PageTransitionIntensity::Strong;
  else return false;
  return true;
}

bool parseTileSize(const char *value, PageTransitionTileSize &result) {
  if (strcmp(value, "small") == 0) result = PageTransitionTileSize::Small;
  else if (strcmp(value, "medium") == 0) result = PageTransitionTileSize::Medium;
  else if (strcmp(value, "large") == 0) result = PageTransitionTileSize::Large;
  else return false;
  return true;
}

uint32_t nextRandomValue() {
  static uint32_t state = 0;
  if (state == 0) state = micros() ^ 0x9E3779B9UL;
  state ^= state << 13;
  state ^= state >> 17;
  state ^= state << 5;
  return state;
}

#if MINI_DISPLAY_RUNTIME_PROFILE
RuntimeProfilePoint profilePoint(PageTransitionType type) {
  switch (type) {
    case PageTransitionType::None: return RuntimeProfilePoint::TransitionNone;
    case PageTransitionType::Slide: return RuntimeProfilePoint::TransitionSlide;
    case PageTransitionType::Bounce: return RuntimeProfilePoint::TransitionBounce;
    case PageTransitionType::Fade: return RuntimeProfilePoint::TransitionFade;
    case PageTransitionType::Wipe: return RuntimeProfilePoint::TransitionWipe;
    case PageTransitionType::Dissolve: return RuntimeProfilePoint::TransitionDissolve;
    case PageTransitionType::Curtain: return RuntimeProfilePoint::TransitionCurtain;
    case PageTransitionType::Blinds: return RuntimeProfilePoint::TransitionBlinds;
    case PageTransitionType::Mosaic: return RuntimeProfilePoint::TransitionMosaic;
    case PageTransitionType::Cascade: return RuntimeProfilePoint::TransitionCascade;
    case PageTransitionType::Spiral: return RuntimeProfilePoint::TransitionSpiral;
    case PageTransitionType::Random: break;
  }
  return RuntimeProfilePoint::TransitionNone;
}

RuntimeProfilePoint frameProfilePoint(PageTransitionType type) {
  switch (type) {
    case PageTransitionType::Slide: return RuntimeProfilePoint::TransitionSlideFrame;
    case PageTransitionType::Bounce: return RuntimeProfilePoint::TransitionBounceFrame;
    case PageTransitionType::Fade: return RuntimeProfilePoint::TransitionFadeFrame;
    case PageTransitionType::Wipe: return RuntimeProfilePoint::TransitionWipeFrame;
    case PageTransitionType::Dissolve: return RuntimeProfilePoint::TransitionDissolveFrame;
    case PageTransitionType::Curtain: return RuntimeProfilePoint::TransitionCurtainFrame;
    case PageTransitionType::Blinds: return RuntimeProfilePoint::TransitionBlindsFrame;
    case PageTransitionType::Mosaic: return RuntimeProfilePoint::TransitionMosaicFrame;
    case PageTransitionType::Cascade: return RuntimeProfilePoint::TransitionCascadeFrame;
    case PageTransitionType::Spiral: return RuntimeProfilePoint::TransitionSpiralFrame;
    case PageTransitionType::None:
    case PageTransitionType::Random: break;
  }
  return RuntimeProfilePoint::TransitionFrame;
}
#endif

}  // namespace

PageTransitionRenderer::PageTransitionRenderer(
    MiniDisplay &display, bool &displayOn, uint8_t &displayBrightness,
    ApplyBacklight applyBacklight, FontRenderState &displayFontState,
    DisplayScrollBuffer &scrollBuffer)
    : display_(display),
      displayOn_(displayOn),
      displayBrightness_(displayBrightness),
      applyBacklight_(applyBacklight),
      displayFontState_(displayFontState),
      scrollBuffer_(scrollBuffer) {}

const char *PageTransitionRenderer::lastTypeName() const {
  switch (lastType_) {
    case PageTransitionType::None: return "none";
    case PageTransitionType::Random: return "random";
    case PageTransitionType::Slide: return "slide";
    case PageTransitionType::Bounce: return "bounce";
    case PageTransitionType::Fade: return "fade";
    case PageTransitionType::Wipe: return "wipe";
    case PageTransitionType::Dissolve: return "dissolve";
    case PageTransitionType::Curtain: return "curtain";
    case PageTransitionType::Blinds: return "blinds";
    case PageTransitionType::Mosaic: return "mosaic";
    case PageTransitionType::Cascade: return "cascade";
    case PageTransitionType::Spiral: return "spiral";
  }
  return "unknown";
}

bool PageTransitionRenderer::parse(JsonVariantConst value,
                                   PageTransitionConfig &result) {
  result = PageTransitionConfig{};
  if (value.isNull()) return true;
  if (!value.is<JsonObjectConst>()) return false;

  JsonObjectConst transition = value.as<JsonObjectConst>();
  const char *type = transition["type"] | "none";
  const char *direction = transition["direction"] | "left";
  const char *speed = transition["speed"] | "normal";
  const char *intensity = transition["intensity"] | "subtle";
  const char *tileSize = transition["tileSize"] | "medium";
  if (!parseType(type, result.type) ||
      !parseDirection(direction, result.direction) ||
      !parseSpeed(speed, result.speed) ||
      !parseIntensity(intensity, result.intensity) ||
      !parseTileSize(tileSize, result.tileSize)) {
    return false;
  }
  return true;
}

void PageTransitionRenderer::render(
    const ScenePage &currentPage, const ScenePage &nextPage,
    const PageTransitionConfig &transition, int8_t contentOffsetX,
    int8_t contentOffsetY, uint32_t refreshIntervalMs) {
  displayFontState_.smoothAllowed = true;
  PageTransitionConfig selected = transition;
  if (selected.type == PageTransitionType::Random) {
    static uint8_t previousType = 0xFF;
    static constexpr PageTransitionType kTypes[] = {
        PageTransitionType::Slide, PageTransitionType::Bounce,
        PageTransitionType::Wipe, PageTransitionType::Dissolve,
        PageTransitionType::Curtain, PageTransitionType::Blinds,
        PageTransitionType::Mosaic, PageTransitionType::Cascade,
        PageTransitionType::Spiral};
    static constexpr PageTransitionTileSize kTileSizes[] = {
        PageTransitionTileSize::Small, PageTransitionTileSize::Medium,
        PageTransitionTileSize::Large};
    const uint32_t entropy = nextRandomValue();
    constexpr uint8_t typeCount = sizeof(kTypes) / sizeof(kTypes[0]);
    uint8_t type = entropy % typeCount;
    if (type == previousType)
      type = (type + 1 + ((entropy >> 8) % (typeCount - 1))) % typeCount;
    previousType = type;
    selected.type = kTypes[type];
    selected.direction = static_cast<PageTransitionDirection>((entropy / 5) % 4);
    // The ST7789 can move its 240-row viewport through 320 rows of GRAM.
    // Prefer that real zero-copy path for randomly selected push effects.
    if (selected.type == PageTransitionType::Slide ||
        selected.type == PageTransitionType::Bounce) {
      selected.direction = (entropy & 1U) ? PageTransitionDirection::Up
                                          : PageTransitionDirection::Down;
    }
    selected.intensity = static_cast<PageTransitionIntensity>((entropy / 20) % 2);
    selected.tileSize = kTileSizes[(entropy / 40) % 3];
  }

  if (selected.direction == PageTransitionDirection::Random) {
    selected.direction =
        selected.type == PageTransitionType::Slide ||
                selected.type == PageTransitionType::Bounce
            ? (nextRandomValue() & 1U) ? PageTransitionDirection::Up
                                      : PageTransitionDirection::Down
            : static_cast<PageTransitionDirection>(nextRandomValue() % 4);
  }
  if ((selected.type == PageTransitionType::Slide ||
       selected.type == PageTransitionType::Bounce) &&
      (selected.direction == PageTransitionDirection::Left ||
       selected.direction == PageTransitionDirection::Right)) {
    selected.direction = selected.direction == PageTransitionDirection::Left
                             ? PageTransitionDirection::Up
                             : PageTransitionDirection::Down;
  }

  // Slow panels get one complete page, not a long queue of animation frames.
  if (refreshIntervalMs >= pageTransitionDurationMs(selected.speed) / 2)
    selected.type = PageTransitionType::None;

#if defined(ESP8266)
  if (display_.fontLoaded) display_.unloadFont();
  display_.resetViewport();
#endif
  displayFontState_ = FontRenderState{};
  lastType_ = selected.type;
  const uint32_t startedAt = millis();
#if MINI_DISPLAY_RUNTIME_PROFILE
  const RuntimeProfilePoint transitionProfile = profilePoint(selected.type);
  RuntimeProfileScope transitionTypeScope(transitionProfile);
#endif
#if defined(ESP8266)
  const bool hardwareScroll =
      (selected.type == PageTransitionType::Slide ||
       selected.type == PageTransitionType::Bounce) &&
      (selected.direction == PageTransitionDirection::Up ||
       selected.direction == PageTransitionDirection::Down);
  constexpr bool motion = false;
  scrollBuffer_.begin();
  regionPainter_.reset(
      new (std::nothrow) SceneRegionPainter(display_, scrollBuffer_));
  if (!regionPainter_ || !regionPainter_->begin(motion)) {
    regionPainter_.reset();
    lastType_ = PageTransitionType::None;
    // Direct TFT_eSPI coordinates address physical GRAM. Normalize the
    // hardware viewport before using that emergency path, otherwise a prior
    // hardware scroll leaves the new page split at the old rolling offset.
    scrollBuffer_.setOffset(0);
    display_.fillScreen(nextPage.background);
    paintScenePage(display_, nextPage, contentOffsetX, contentOffsetY,
                   0, 0, 240, 240, displayFontState_, &imageCache_);
    lastDurationMs_ = millis() - startedAt;
    return;
  }
  imageCache_.enableRowCache();
  // Frame boundary below services Wi-Fi and watchdog. Yielding while composing
  // individual bands makes one visual frame pause several times and causes
  // irregular movement plus timeline skips.
  imageCache_.setCooperativeYield(false);
  MINI_DISPLAY_PROFILE_MEMORY(RuntimeProfilePoint::Transition);
#if MINI_DISPLAY_RUNTIME_PROFILE
  runtimeProfiler.sampleMemory(transitionProfile);
#endif
  TransitionPlan plan(selected, nextRandomValue());
  const uint8_t frameCount = selected.type == PageTransitionType::None
      ? 1
      : selected.type == PageTransitionType::Bounce
          ? pageBounceFrameCount(selected.speed)
          : pageTransitionFrameCount(selected.speed);
  const uint16_t durationMs = selected.type == PageTransitionType::None
      ? 1 : pageTransitionDurationMs(selected.speed);
  const uint8_t originalBrightness = displayBrightness_;
  const uint8_t minimumBrightness =
      selected.intensity == PageTransitionIntensity::Strong
          ? 0 : max<uint8_t>(1, originalBrightness / 4);
  SceneAnimationTimeline timeline;
  timeline.start(millis(), durationMs, frameCount);
  uint8_t previous = 0;
  uint16_t paintedMovement = 0;
  const uint16_t baseScrollOffset = scrollBuffer_.offset();
  while (timeline.active()) {
    SceneAnimationFrame frame;
    if (!timeline.next(millis(), frame)) {
      delay(1);
      continue;
    }
    // Freeze progress for the whole frame. All effects share this scheduler,
    // this traversal and this painter. No effect runs its own nested clock.
    if (selected.type == PageTransitionType::Fade && displayOn_ && originalBrightness) {
      const int distance = abs(2 * static_cast<int>(frame.index) - frame.count);
      displayBrightness_ = minimumBrightness +
          (originalBrightness - minimumBrightness) * distance / frame.count;
      applyBacklight_();
    }
    {
      MINI_DISPLAY_PROFILE_SCOPE(RuntimeProfilePoint::TransitionFrame);
#if MINI_DISPLAY_RUNTIME_PROFILE
      RuntimeProfileScope transitionFrameTypeScope(
          frameProfilePoint(selected.type));
#endif
      if (hardwareScroll) {
        const uint16_t movement = min<uint16_t>(
            240, static_cast<uint16_t>(240.0F * pageMotionProgress(
                frame.progress(),
                selected.type == PageTransitionType::Bounce, true,
                selected.intensity)));
        if (movement > paintedMovement) {
          const int16_t rows = movement - paintedMovement;
          int16_t sourceY;
          uint16_t physicalY;
          if (selected.direction == PageTransitionDirection::Up) {
            sourceY = paintedMovement;
            physicalY =
                (baseScrollOffset + 240 + paintedMovement) % 320;
          } else {
            sourceY = 240 - movement;
            physicalY =
                (baseScrollOffset + 320 - movement) % 320;
          }
          regionPainter_->paintNextRowsPhysical(
              nextPage, sourceY, rows, physicalY, contentOffsetX,
              contentOffsetY, imageCache_);
          paintedMovement = movement;
        }
        const uint16_t nextOffset =
            selected.direction == PageTransitionDirection::Up
                ? (baseScrollOffset + movement) % 320
                : (baseScrollOffset + 320 - movement) % 320;
        scrollBuffer_.setOffset(nextOffset);
      } else {
        const uint32_t paintStarted = millis();
        regionPainter_->paintTransition(currentPage, nextPage, plan, previous,
            frame.index, frame.count, contentOffsetX, contentOffsetY,
            imageCache_, false);
        // A full page is drawn at the darkest fade frame. Exclude that work
        // from the fade clock so the brighter frames retain their spacing.
        if (selected.type == PageTransitionType::Fade)
          timeline.pause(millis() - paintStarted);
      }
    }
    previous = frame.index;
    // This is the only cooperative scheduling point during an animation.
    // HTTP, Home Assistant updates and marquee work wait for the transition.
    yield();
  }
  imageCache_.setCooperativeYield(true);
  if (selected.type == PageTransitionType::Fade) {
    displayBrightness_ = originalBrightness;
    applyBacklight_();
  }
  regionPainter_.reset();
#else
  paintScenePage(display_, nextPage, contentOffsetX, contentOffsetY,
                  0, 0, 240, 240, displayFontState_, &imageCache_);
#endif
  lastDurationMs_ = millis() - startedAt;
}
