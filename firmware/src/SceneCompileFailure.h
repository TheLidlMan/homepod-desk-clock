#pragma once

#include <Arduino.h>

enum class SceneCompileFailure : uint8_t {
  None,
  Allocation,
  CardLimit,
  TextLimit,
  TextPool,
  Weather,
  Value,
  Title,
  EmptyRows,
  EmptyRow,
};

const char *sceneCompileFailureName(SceneCompileFailure failure);
