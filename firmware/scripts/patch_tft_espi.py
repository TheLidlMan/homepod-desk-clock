"""Trim unused TFT_eSPI storage overhead from ESP8266 builds.

TFT_eSPI defaults its filesystem-backed font overload to SPIFFS. The firmware
always passes LittleFS explicitly, but that unused default still links the
complete SPIFFS implementation. Pointing the pinned dependency at LittleFS
keeps the public font API intact and avoids carrying two filesystems.

TFT_eSPI reads GFX bitmap offsets as 16-bit values but stores each one in a
32-bit field. All bundled font bitmaps fit in 16 bits, so use the field width
the renderer already supports and remove structure padding from every glyph.

User-uploaded smooth fonts use a compatible version 12 VLW header with compact
7-byte glyph metrics. Teach the pinned library to read that format while
retaining support for standard version 11 files. Bitmap data stays byte-for-byte
compatible, so drawing speed and quality are unchanged.
"""

import re
from pathlib import Path


Import("env")  # noqa: F821 - PlatformIO/SCons build environment


def replace_once(path: Path, original: str, replacement: str) -> bool:
    source = path.read_text()
    if replacement in source:
        return False
    if source.count(original) != 1:
        raise RuntimeError(f"TFT_eSPI changed; review LittleFS patch for {path}")
    path.write_text(source.replace(original, replacement, 1))
    return True


if env.PioPlatform().name == "espressif8266":  # noqa: F821
    source_fonts = Path(env.subst("$PROJECT_SRC_DIR")) / "fonts"  # noqa: F821
    for font_path in source_fonts.glob("*.h"):
        source = font_path.read_text()
        for match in re.finditer(
            r"const uint8_t \w+Bitmaps\[\].*?\{(.*?)\};", source, re.S
        ):
            bitmap_bytes = len(re.findall(r"0x[0-9a-fA-F]{2}", match.group(1)))
            if bitmap_bytes > 0xFFFF:
                raise RuntimeError(
                    f"{font_path} has a {bitmap_bytes}-byte GFX bitmap; "
                    "TFT_eSPI needs 32-bit glyph offsets"
                )
    library = (
        Path(env.subst("$PROJECT_LIBDEPS_DIR"))  # noqa: F821
        / env.subst("$PIOENV")  # noqa: F821
        / "TFT_eSPI"
    )
    changed = False
    changed |= replace_once(
        library / "Processors/TFT_eSPI_ESP8266.h",
        "  #include <FS.h>",
        "  #include <LittleFS.h>",
    )
    changed |= replace_once(
        library / "Extensions/Smooth_font.h",
        "  fs::FS   &fontFS  = SPIFFS;",
        "  fs::FS   &fontFS  = LittleFS;",
    )
    changed |= replace_once(
        library / "Extensions/Smooth_font.cpp",
        "    if(spiffs) fontFS = SPIFFS;",
        "    if(spiffs) fontFS = LittleFS;",
    )
    changed |= replace_once(
        library / "Fonts/GFXFF/gfxfont.h",
        "\tuint32_t bitmapOffset;     // Pointer into GFXfont->bitmap",
        "\tuint16_t bitmapOffset;     // Pointer into GFXfont->bitmap",
    )
    changed |= replace_once(
        library / "Extensions/Smooth_font.h",
        "  bool     fontLoaded = false; // Flags when a anti-aliased font is loaded",
        "  bool     fontLoaded = false; // Flags when a anti-aliased font is loaded\n"
        "  bool     compact_vlw = false; // Version 12 uses 7-byte glyph metrics",
    )
    changed |= replace_once(
        library / "Extensions/Smooth_font.h",
        "  uint32_t readInt32(void);",
        "  uint32_t readInt32(void);\n  uint8_t  readVlwByte(void);",
    )
    changed |= replace_once(
        library / "Extensions/Smooth_font.cpp",
        "  gFont.gCount   = (uint16_t)readInt32(); // glyph count in file\n"
        "                             readInt32(); // vlw encoder version - discard",
        "  gFont.gCount   = (uint16_t)readInt32(); // glyph count in file\n"
        "  const uint32_t vlwVersion = readInt32();\n"
        "  compact_vlw = vlwVersion == 12;",
    )
    changed |= replace_once(
        library / "Extensions/Smooth_font.cpp",
        "  uint32_t bitmapPtr = headerPtr + gFont.gCount * 28;",
        "  uint32_t bitmapPtr = headerPtr + gFont.gCount * (compact_vlw ? 7 : 28);",
    )
    changed |= replace_once(
        library / "Extensions/Smooth_font.cpp",
        "    gUnicode[gNum]  = (uint16_t)readInt32(); // Unicode code point value\n"
        "    gHeight[gNum]   =  (uint8_t)readInt32(); // Height of glyph\n"
        "    gWidth[gNum]    =  (uint8_t)readInt32(); // Width of glyph\n"
        "    gxAdvance[gNum] =  (uint8_t)readInt32(); // xAdvance - to move x cursor\n"
        "    gdY[gNum]       =  (int16_t)readInt32(); // y delta from baseline\n"
        "    gdX[gNum]       =   (int8_t)readInt32(); // x delta from cursor\n"
        "    readInt32(); // ignored",
        "    if (compact_vlw) {\n"
        "      gUnicode[gNum]  = ((uint16_t)readVlwByte() << 8) | readVlwByte();\n"
        "      gHeight[gNum]   = readVlwByte();\n"
        "      gWidth[gNum]    = readVlwByte();\n"
        "      gxAdvance[gNum] = readVlwByte();\n"
        "      gdY[gNum]       = (int8_t)readVlwByte();\n"
        "      gdX[gNum]       = (int8_t)readVlwByte();\n"
        "    } else {\n"
        "      gUnicode[gNum]  = (uint16_t)readInt32(); // Unicode code point value\n"
        "      gHeight[gNum]   =  (uint8_t)readInt32(); // Height of glyph\n"
        "      gWidth[gNum]    =  (uint8_t)readInt32(); // Width of glyph\n"
        "      gxAdvance[gNum] =  (uint8_t)readInt32(); // xAdvance - to move x cursor\n"
        "      gdY[gNum]       =  (int16_t)readInt32(); // y delta from baseline\n"
        "      gdX[gNum]       =   (int8_t)readInt32(); // x delta from cursor\n"
        "      readInt32(); // ignored\n"
        "    }",
    )
    changed |= replace_once(
        library / "Extensions/Smooth_font.cpp",
        "\n\n/***************************************************************************************\n"
        "** Function name:           getUnicodeIndex",
        "\n\nuint8_t TFT_eSPI::readVlwByte(void)\n"
        "{\n"
        "#ifdef FONT_FS_AVAILABLE\n"
        "  if (fs_font) return (uint8_t)fontFile.read();\n"
        "#endif\n"
        "  return pgm_read_byte(fontPtr++);\n"
        "}\n\n"
        "/***************************************************************************************\n"
        "** Function name:           getUnicodeIndex",
    )
    if changed:
        print("TFT_eSPI: trim filesystem and glyph metadata overhead")
