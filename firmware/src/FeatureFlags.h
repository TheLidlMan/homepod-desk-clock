#pragma once

// Experimental features stay compiled out until their memory and stability
// costs are acceptable on the ESP8266 target.
#ifndef MINI_DISPLAY_FEATURE_TLS
#define MINI_DISPLAY_FEATURE_TLS 0
#endif

// Temporary local profiler. Production builds keep this disabled.
#ifndef MINI_DISPLAY_RUNTIME_PROFILE
#define MINI_DISPLAY_RUNTIME_PROFILE 0
#endif
