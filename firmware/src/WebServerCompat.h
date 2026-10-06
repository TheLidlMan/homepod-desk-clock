#pragma once

#include "FeatureFlags.h"

#if defined(ESP8266)
#if MINI_DISPLAY_FEATURE_TLS
#include "DualWebServer.h"
using MiniDisplayWebServer = DualWebServer;
#else
#include <ESP8266WebServer.h>
using MiniDisplayWebServer = ESP8266WebServer;
#endif
#else
#include <WebServer.h>
using MiniDisplayWebServer = WebServer;
#endif
