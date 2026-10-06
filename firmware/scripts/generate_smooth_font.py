#!/usr/bin/env python3
"""Generate embedded TFT_eSPI VLW fonts from a TTF or OTF file."""

from __future__ import annotations

import argparse
import re
import struct
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


POLISH = "ĄĆĘŁŃÓŚŹŻąćęłńóśźż"
SYMBOLS = "€–—…←↑→↓•✓✕"
COMPACT_VLW_VERSION = 12


def sharpen_alpha(value: int) -> int:
    if value < 128:
        return 0
    if value < 224:
        return 192
    return 255


def identifier(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]", "_", value)


def rasterize(
    font: ImageFont.FreeTypeFont, codepoint: int
) -> tuple[int, int, int, int, int, bytes]:
    character = chr(codepoint)
    left, top, right, bottom = font.getbbox(character, anchor="ls")
    width = max(0, right - left)
    height = max(0, bottom - top)
    advance = max(1, round(font.getlength(character)))
    if not width or not height:
        return 0, 0, advance, -top, left, b""

    image = Image.new("L", (width, height))
    draw = ImageDraw.Draw(image)
    draw.text((-left, -top), character, font=font, fill=255, anchor="ls")
    image = image.point(sharpen_alpha)
    return width, height, advance, -top, left, image.tobytes()


def vlw(font_path: Path, size: int, codepoints: list[int]) -> bytes:
    font = ImageFont.truetype(str(font_path), size)
    ascent, descent = font.getmetrics()
    glyphs = [rasterize(font, codepoint) for codepoint in codepoints]
    result = bytearray()
    for value in (
        len(codepoints),
        COMPACT_VLW_VERSION,
        size,
        0,
        ascent,
        descent,
    ):
        result.extend(struct.pack(">I", value))
    for codepoint, (width, height, advance, dy, dx, _) in zip(
        codepoints, glyphs
    ):
        if not (
            codepoint <= 0xFFFF
            and height <= 0xFF
            and width <= 0xFF
            and advance <= 0xFF
            and -128 <= dy <= 127
            and -128 <= dx <= 127
        ):
            raise ValueError(f"glyph U+{codepoint:04X} exceeds compact VLW limits")
        result.extend(
            struct.pack(">HBBBbb", codepoint, height, width, advance, dy, dx)
        )
    for *_, pixels in glyphs:
        result.extend(pixels)
    return bytes(result)


def generate(
    font_path: Path, output: Path, family: str, sizes: list[int]
) -> None:
    codepoints = sorted(
        set(range(32, 127))
        | set(range(160, 256))
        | {ord(value) for value in POLISH + SYMBOLS}
    )
    lines = [
        "#pragma once",
        "",
        "// Generated from Inter Tight under the SIL Open Font License 1.1.",
    ]
    for size in sizes:
        symbol = f"{identifier(family)}{size}"
        data = vlw(font_path, size, codepoints)
        lines.append(f"const uint8_t {symbol}[] PROGMEM = {{")
        for offset in range(0, len(data), 16):
            values = ", ".join(
                f"0x{value:02X}" for value in data[offset : offset + 16]
            )
            lines.append(f"  {values},")
        lines.extend(["};", ""])
    output.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("font", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--family", default="InterTightSmooth")
    parser.add_argument("--sizes", default="13,18,24")
    args = parser.parse_args()
    generate(
        args.font,
        args.output,
        args.family,
        [int(value) for value in args.sizes.split(",")],
    )


if __name__ == "__main__":
    main()
