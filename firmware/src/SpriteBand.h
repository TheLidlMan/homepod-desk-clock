#pragma once
#include <stddef.h>
#include <stdint.h>

// Leave networking headroom; a failed full band may still fit as 4/2/1 rows.
inline size_t sceneSpriteBudget(size_t freeHeap, size_t largestBlock) {
  if (freeHeap <= 4096) return 0;
  const size_t available = freeHeap - 4096;
  return available < largestBlock ? available : largestBlock;
}

template <typename Sprite>
uint8_t createSpriteBand(Sprite &sprite, uint16_t width, uint8_t maximumRows,
                         size_t budget) {
  sprite.deleteSprite();
  if (!width) return 0;
  for (uint8_t rows = maximumRows; rows; rows /= 2) {
    if (size_t(width) * rows * sizeof(uint16_t) + 32 > budget) continue;
    if (sprite.createSprite(width, rows)) return rows;
    sprite.deleteSprite();
  }
  return 0;
}
