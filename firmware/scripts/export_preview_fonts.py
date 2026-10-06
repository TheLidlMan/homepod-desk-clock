"""Export the actual built-in display glyphs for the browser preview."""
import base64
import io
import json
from pathlib import Path
import re
import struct
from PIL import Image

root = Path(__file__).resolve().parents[2]
directory = root / "firmware/src/fonts"
smooth = (directory / "InterTightSmooth.h").read_text()
coverage = (root / "firmware/src/CoverageFonts.generated.cpp").read_text()
fonts = {}
for size in (13, 18, 24, 36, 48):
    glyphs = []
    if size <= 24:
        source = re.search(rf"InterTightSmooth{size}\[\].*?\{{(.*?)\}};", smooth, re.S)[1]
        data = bytes(int(value, 16) for value in re.findall(r"0x([0-9A-Fa-f]{2})", source))
        count, version, _, _, ascent, descent = struct.unpack_from(">6I", data)
        if version not in (11, 12) or count > 4096:
            raise ValueError(f"Unsupported smooth font header for size {size}")
        metric_bytes = 7 if version == 12 else 28
        offset = 24 + count * metric_bytes
        if offset > len(data):
            raise ValueError(f"Truncated smooth font metrics for size {size}")
        for index in range(count):
            metric_offset = 24 + index * metric_bytes
            if version == 12:
                code, h, w, advance, dy, dx = struct.unpack_from(
                    ">HBBBbb", data, metric_offset
                )
            else:
                code, h, w, advance, dy, dx, _ = struct.unpack_from(
                    ">7i", data, metric_offset
                )
            pixel_count = w * h
            if min(w, h, advance) < 0 or offset + pixel_count > len(data):
                raise ValueError(f"Invalid smooth font glyph for size {size}")
            alpha = data[offset:offset + pixel_count]
            offset += pixel_count
            glyphs.append((code, w, h, advance, dx, -dy, bytes(alpha)))
            if (32 < code < 160 and code != 127) or code > 255:
                descent = max(descent, h - dy)
        height = ascent + descent
        space = height // 4
    else:
        source = (directory / f"InterTightBold{size}.h").read_text()
        bitmap_source = source.split("Bitmaps[] PROGMEM = {")[1].split("};")[0]
        data = bytes(int(value, 16) for value in re.findall(r"0x([0-9A-Fa-f]{2})", bitmap_source))
        for match in re.finditer(r"\{\s*(\d+),\s*(\d+),\s*(\d+),\s*(\d+),\s*(-?\d+),\s*(-?\d+)\s*\}, // U\+([0-9A-F]+)", source):
            offset, w, h, advance, dx, dy = map(int, match.groups()[:6])
            code = int(match[7], 16)
            alpha = bytes(255 if data[offset + index // 8] & (128 >> (index % 8)) else 0 for index in range(w * h))
            glyphs.append((code, w, h, advance, dx, dy, alpha))
        ascent = max(-glyph[5] for glyph in glyphs)
        height = int(re.search(r"0x0020, 0x017F, (\d+)", source)[1])
        space = next(glyph[3] for glyph in glyphs if glyph[0] == 32)
        packed_source = re.search(rf"coveragePixels{size}\[\].*?\{{(.*?)\}};", coverage, re.S)[1]
        packed = bytes(int(value, 16) for value in re.findall(r"0x([0-9A-Fa-f]{2})", packed_source))
        table = re.search(rf"coverageGlyphs{size}\[\].*?\{{(.*?)\}};", coverage, re.S)[1]
        covered = {}
        for record in re.findall(r"\{([^{}]+)\}", table):
            offset, code, w, h, advance, dx, dy = map(int, record.split(','))
            alpha = bytearray()
            position = offset
            while len(alpha) < w * h:
                encoded = packed[position]
                position += 1
                alpha.extend([encoded >> 6] * ((encoded & 63) + 1))
            alpha = bytes(value * 85 for value in alpha[:w * h])
            covered[code] = (code,w,h,advance,dx,dy,alpha)
        glyphs = [covered.get(glyph[0], glyph) for glyph in glyphs]
    atlas = Image.new("RGBA", (512, 4096))
    x = y = row_height = 0
    metrics = {}
    for code, w, h, advance, dx, dy, alpha in glyphs:
        if x + w + 1 > 512:
            x, y, row_height = 0, y + row_height + 1, 0
        if w and h:
            glyph = Image.new("RGBA", (w, h), "white")
            glyph.putalpha(Image.frombytes("L", (w, h), alpha))
            atlas.paste(glyph, (x, y))
        metrics[str(code)] = [x, y, w, h, advance, dx, dy]
        x += w + 1
        row_height = max(row_height, h)
    output = io.BytesIO()
    atlas.crop((0, 0, 512, y + row_height + 1)).save(output, format="PNG", optimize=True)
    fonts[str(size)] = dict(height=height, ascent=ascent, space=space, smooth=size <= 24, glyphs=metrics,
                           atlas="data:image/png;base64," + base64.b64encode(output.getvalue()).decode())
target = root / "integration/card/src/firmware-fonts.generated.json"
target.write_text(json.dumps(fonts, separators=(",", ":")) + "\n")
print(f"Preview glyphs: {target.stat().st_size} bytes; no firmware RAM cost")
