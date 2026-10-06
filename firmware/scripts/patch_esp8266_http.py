"""Avoid a second full request-body allocation in the pinned ESP8266 core."""

from pathlib import Path

Import("env")  # noqa: F821 - PlatformIO/SCons build environment

if env.PioPlatform().name == "espressif8266":  # noqa: F821
    framework = env.PioPlatform().get_package_dir("framework-arduinoespressif8266")  # noqa: F821
    path = Path(framework) / "libraries/ESP8266WebServer/src/Parsing-impl.h"
    source = path.read_text()
    original = "        arg.value = plainBuf;"
    replacement = "        arg.value = std::move(plainBuf);"
    # plainBuf is not used again in this branch. String's move assignment
    # transfers ownership; copying temporarily needs twice Content-Length.
    if replacement not in source:
        if source.count(original) != 1:
            raise RuntimeError("ESP8266 HTTP parser changed; review request-body ownership patch")
        path.write_text(source.replace(original, replacement, 1))
        print("ESP8266 HTTP: transfer raw body instead of copying it")
