#pragma once

#include <ArduinoJson.h>
#include <cstddef>
#include <cstdint>

enum class StoredConfigSchemaState : uint8_t {
  Current,
  Older,
  Newer,
  Invalid,
};

struct StoredConfigSchema {
  StoredConfigSchemaState state = StoredConfigSchemaState::Invalid;
  uint16_t version = 0;
  bool legacy = false;
};

StoredConfigSchema inspectStoredConfigSchema(
    JsonObjectConst document, uint16_t currentVersion,
    const char *field = "schemaVersion");

int readStoredInt(JsonObjectConst document, const char *field,
                  int defaultValue, int minimum, int maximum,
                  bool &repaired);

uint32_t readStoredUint32(JsonObjectConst document, const char *field,
                          uint32_t defaultValue, bool &repaired);

float readStoredFloat(JsonObjectConst document, const char *field,
                      float defaultValue, float minimum, float maximum,
                      bool &repaired);

bool readStoredBool(JsonObjectConst document, const char *field,
                    bool defaultValue, bool &repaired);

bool readStoredString(JsonObjectConst document, const char *field,
                      char *destination, size_t capacity,
                      const char *defaultValue, bool &repaired);
