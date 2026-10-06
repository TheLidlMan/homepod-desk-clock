#pragma once

#include <stdint.h>

enum class PageTransitionType : uint8_t {
  None,
  Random,
  Slide,
  Bounce,
  Fade,
  Wipe,
  Dissolve,
  Curtain,
  Blinds,
  Mosaic,
  Cascade,
  Spiral,
};

enum class PageTransitionDirection : uint8_t { Left, Right, Up, Down, Random };
enum class PageTransitionSpeed : uint8_t { Normal, Slow, Fast };
enum class PageTransitionIntensity : uint8_t { Subtle, Strong };
enum class PageTransitionTileSize : uint8_t { Medium, Small, Large };

struct PageTransitionConfig {
  PageTransitionType type;
  PageTransitionDirection direction;
  PageTransitionSpeed speed;
  PageTransitionIntensity intensity;
  PageTransitionTileSize tileSize;
};

static_assert(sizeof(PageTransitionConfig) == 5,
              "Transition config must stay compact");
static_assert(static_cast<uint8_t>(PageTransitionSpeed::Normal) == 0 &&
                  static_cast<uint8_t>(PageTransitionTileSize::Medium) == 0,
              "Zero-initialized transition config must use defaults");
