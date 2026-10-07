#pragma once
#include <ArduinoJson.h>
#include <stdint.h>

void loadCrashDiagnostics();
void writeCrashDiagnostics(JsonObject result);
// Record an active operation, then clear it after returning to the main loop.
// Phase 0 clears the checkpoint. Repeated phases do not rewrite RTC memory.
#if defined(ESP8266)
void checkpointRuntime(uint32_t phase);
void clearRuntimeCheckpoint();
#else
inline void checkpointRuntime(uint32_t) {}
inline void clearRuntimeCheckpoint() {}
#endif
