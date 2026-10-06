#!/usr/bin/env python3
"""Generate compact Adafruit GFX font headers from a static TTF/OTF file."""

from __future__ import annotations

import argparse
import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


def identifier(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_]", "_", value)


def generate(font_path: Path, output: Path, family: str, size: int) -> None:
    font = ImageFont.truetype(str(font_path), size)
    first, last = 32, 383
    bitmap = bytearray()
    glyphs: list[tuple[int, int, int, int, int, int]] = []

    for codepoint in range(first, last + 1):
        character = chr(codepoint)
        left, top, right, bottom = font.getbbox(character, anchor="ls")
        width = max(0, right - left)
        height = max(0, bottom - top)
        advance = max(1, round(font.getlength(character)))
        offset = len(bitmap)
        if width and height:
            image = Image.new("L", (width, height))
            draw = ImageDraw.Draw(image)
            # Measure and draw against the same left-baseline anchor.  Using
            # Pillow's default anchor here moves most glyphs outside the tiny
            # bitmap because `top` is relative to the baseline.
            draw.text((-left, -top), character, font=font, fill=255, anchor="ls")
            pixels = image.load()
            current = 0
            bit = 0x80
            for y in range(height):
                for x in range(width):
                    alpha = pixels[x, y]
                    edge_pixel = ((x & 1) != 1) or ((y & 1) != 1)
                    if alpha >= 224 or (alpha >= 128 and edge_pixel):
                        current |= bit
                    bit >>= 1
                    if bit == 0:
                        bitmap.append(current)
                        current = 0
                        bit = 0x80
            if bit != 0x80:
                bitmap.append(current)
        glyphs.append((offset, width, height, advance, left, top))

    ascent, descent = font.getmetrics()
    symbol = f"{identifier(family)}{size}"
    lines = [
        "#pragma once",
        "",
        "// Generated from Inter Tight under the SIL Open Font License 1.1.",
        f"const uint8_t {symbol}Bitmaps[] PROGMEM = {{",
    ]
    for offset in range(0, len(bitmap), 16):
        values = ", ".join(f"0x{value:02X}" for value in bitmap[offset : offset + 16])
        lines.append(f"  {values},")
    lines.extend(["};", "", f"const GFXglyph {symbol}Glyphs[] PROGMEM = {{"])
    for codepoint, glyph in zip(range(first, last + 1), glyphs):
        offset, width, height, advance, x_offset, y_offset = glyph
        lines.append(
            f"  {{ {offset}, {width}, {height}, {advance}, {x_offset}, {y_offset} }}, // U+{codepoint:04X}"
        )
    lines.extend(
        [
            "};",
            "",
            f"const GFXfont {symbol} PROGMEM = {{",
            f"  (uint8_t *){symbol}Bitmaps,",
            f"  (GFXglyph *){symbol}Glyphs,",
            f"  0x{first:04X}, 0x{last:04X}, {ascent + descent}",
            "};",
            "",
        ]
    )
    output.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("font", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--family", default="InterTightSemiBold")
    parser.add_argument("--sizes", default="11,15,21,29")
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    for size in (int(value) for value in args.sizes.split(",")):
        generate(
            args.font,
            args.output / f"{args.family}{size}.h",
            args.family,
            size,
        )


if __name__ == "__main__":
    main()
