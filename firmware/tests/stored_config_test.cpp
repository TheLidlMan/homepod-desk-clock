#include <assert.h>
#include <cstring>

#include "StoredConfig.h"

int main() {
  StaticJsonDocument<1024> document;
  JsonObject root = document.to<JsonObject>();

  StoredConfigSchema schema = inspectStoredConfigSchema(root, 1);
  assert(schema.state == StoredConfigSchemaState::Current);
  assert(schema.version == 1);
  assert(schema.legacy);

  root["schemaVersion"] = 2;
  schema = inspectStoredConfigSchema(root, 1);
  assert(schema.state == StoredConfigSchemaState::Newer);
  assert(schema.version == 2);
  assert(!schema.legacy);

  schema = inspectStoredConfigSchema(root, 3);
  assert(schema.state == StoredConfigSchemaState::Older);
  assert(schema.version == 2);

  root["schemaVersion"] = "2";
  assert(inspectStoredConfigSchema(root, 1).state ==
         StoredConfigSchemaState::Invalid);
  root["schemaVersion"] = 0;
  assert(inspectStoredConfigSchema(root, 1).state ==
         StoredConfigSchemaState::Invalid);

  root.clear();
  root["integer"] = 7;
  root["number"] = 2.5F;
  root["enabled"] = true;
  root["name"] = "display";
  bool repaired = false;
  assert(readStoredInt(root, "integer", 3, 1, 10, repaired) == 7);
  assert(readStoredFloat(root, "number", 1.0F, 0.1F, 60.0F, repaired) ==
         2.5F);
  assert(readStoredBool(root, "enabled", false, repaired));
  char name[16]{};
  readStoredString(root, "name", name, sizeof(name), "default", repaired);
  assert(strcmp(name, "display") == 0);
  assert(!repaired);

  root["integer"] = 99;
  root["enabled"] = "yes";
  root["name"] = "this string is too long";
  repaired = false;
  assert(readStoredInt(root, "integer", 3, 1, 10, repaired) == 3);
  assert(!readStoredBool(root, "enabled", false, repaired));
  readStoredString(root, "name", name, sizeof(name), "default", repaired);
  assert(strcmp(name, "default") == 0);
  assert(repaired);
}
