#include "StoredConfig.h"

#include <cmath>
#include <cstring>

StoredConfigSchema inspectStoredConfigSchema(JsonObjectConst document,
                                             uint16_t currentVersion,
                                             const char *field) {
  JsonVariantConst value = document[field];
  if (value.isNull()) {
    return {currentVersion == 1 ? StoredConfigSchemaState::Current
                                : StoredConfigSchemaState::Older,
            1, true};
  }
  if (!value.is<uint32_t>()) return {};
  const uint32_t version = value.as<uint32_t>();
  if (version == 0 || version > UINT16_MAX) return {};
  return {version == currentVersion
              ? StoredConfigSchemaState::Current
              : version < currentVersion ? StoredConfigSchemaState::Older
                                         : StoredConfigSchemaState::Newer,
          static_cast<uint16_t>(version), false};
}

int readStoredInt(JsonObjectConst document, const char *field,
                  int defaultValue, int minimum, int maximum,
                  bool &repaired) {
  JsonVariantConst value = document[field];
  if (!value.is<int>()) {
    repaired = true;
    return defaultValue;
  }
  const int parsed = value.as<int>();
  if (parsed < minimum || parsed > maximum) {
    repaired = true;
    return defaultValue;
  }
  return parsed;
}

uint32_t readStoredUint32(JsonObjectConst document, const char *field,
                          uint32_t defaultValue, bool &repaired) {
  JsonVariantConst value = document[field];
  if (!value.is<uint32_t>()) {
    repaired = true;
    return defaultValue;
  }
  return value.as<uint32_t>();
}

float readStoredFloat(JsonObjectConst document, const char *field,
                      float defaultValue, float minimum, float maximum,
                      bool &repaired) {
  JsonVariantConst value = document[field];
  if (!value.is<float>()) {
    repaired = true;
    return defaultValue;
  }
  const float parsed = value.as<float>();
  if (!std::isfinite(parsed) || parsed < minimum || parsed > maximum) {
    repaired = true;
    return defaultValue;
  }
  return parsed;
}

bool readStoredBool(JsonObjectConst document, const char *field,
                    bool defaultValue, bool &repaired) {
  JsonVariantConst value = document[field];
  if (!value.is<bool>()) {
    repaired = true;
    return defaultValue;
  }
  return value.as<bool>();
}

bool readStoredString(JsonObjectConst document, const char *field,
                      char *destination, size_t capacity,
                      const char *defaultValue, bool &repaired) {
  JsonVariantConst value = document[field];
  const char *parsed = value.is<const char *>() ? value.as<const char *>()
                                                : nullptr;
  const bool valid = parsed && strlen(parsed) < capacity;
  if (!valid) {
    parsed = defaultValue;
    repaired = true;
  }
  const size_t length = strlen(parsed);
  memcpy(destination, parsed, length);
  destination[length] = '\0';
  return valid;
}
