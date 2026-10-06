"""Drop unused newlib float formatters from ESP8266 firmware.

The firmware uses its bounded decimal parser and dtostrf graph labels, so it
does not need newlib's generic printf or scanf float extensions.
"""

Import("env")  # noqa: F821 - PlatformIO/SCons build environment

if env.PioPlatform().name == "espressif8266":  # noqa: F821
    link_flags = env["LINKFLAGS"]  # noqa: F821
    for symbol in ("_printf_float", "_scanf_float"):
        index = link_flags.index(symbol)
        if index == 0 or link_flags[index - 1] != "-u":
            raise RuntimeError(f"Unexpected linker flag layout for {symbol}")
        del link_flags[index - 1:index + 1]
