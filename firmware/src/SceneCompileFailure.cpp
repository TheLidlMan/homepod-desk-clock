#include "SceneCompileFailure.h"

const char *sceneCompileFailureName(SceneCompileFailure failure) {
  switch (failure) {
    case SceneCompileFailure::None: return "none";
    case SceneCompileFailure::Allocation: return "allocation";
    case SceneCompileFailure::CardLimit: return "card_limit";
    case SceneCompileFailure::TextLimit: return "text_limit";
    case SceneCompileFailure::TextPool: return "text_pool";
    case SceneCompileFailure::Weather: return "weather";
    case SceneCompileFailure::Value: return "value";
    case SceneCompileFailure::Title: return "title";
    case SceneCompileFailure::EmptyRows: return "empty_rows";
    case SceneCompileFailure::EmptyRow: return "empty_row";
  }
  return "unknown";
}
