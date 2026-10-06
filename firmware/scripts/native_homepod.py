"""Compile SRP integer primitives from the pinned ESP8266 BearSSL SDK."""
from pathlib import Path

Import("env")

if env.PioPlatform().name == "espressif8266":
    framework = Path(env.PioPlatform().get_package_dir("framework-arduinoespressif8266"))
    sdk = framework / "tools" / "sdk" / "ssl" / "bearssl"
    env.Append(CPPPATH=[str(sdk / "src"), str(sdk / "inc")])
    env.Append(CCFLAGS=["-include", "ets_sys.h"])
    env.BuildSources("$BUILD_DIR/sam_homepod_math", str(sdk / "src" / "int"),
                     src_filter="+<i15_*.c> +<i32_div32.c>")
