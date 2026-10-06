"""Generate run-length encoded four-level glyph coverage in flash."""
import argparse
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


def generate(source, destination):
    characters = sorted(set(range(32, 127)) | set(range(160, 256)) | set(map(ord, "ĄĆĘŁŃÓŚŹŻąćęłńóśźż€–—…←↑→↓•✓✕")))
    lines = ['// Inter Tight, SIL Open Font License 1.1. See fonts/OFL.txt.', '#include "CoverageFont.h"', '#if defined(ESP8266) || defined(COVERAGE_TEST)']
    for size in (36, 48):
        font = ImageFont.truetype(str(source), size)
        pixels = bytearray()
        glyphs = []
        for code in characters:
            character = chr(code)
            left, top, right, bottom = font.getbbox(character, anchor="ls")
            width, height = right-left, bottom-top
            offset = len(pixels)
            if width and height:
                image = Image.new('L', (width, height))
                ImageDraw.Draw(image).text((-left,-top), character, font=font, fill=255, anchor='ls')
                coverage = [round(value/85) for value in image.tobytes()]
                position = 0
                while position < len(coverage):
                    value = coverage[position]
                    end = position + 1
                    while end < len(coverage) and coverage[end] == value and end - position < 64:
                        end += 1
                    pixels.append((value << 6) | (end - position - 1))
                    position = end
            glyphs.append((offset,code,width,height,max(1,round(font.getlength(character))),left,top))
        # Match the existing GFX font datum metrics, including extended Latin.
        boxes = [font.getbbox(chr(code), anchor='ls') for code in range(32,383)]
        ascent, descent = max(-b[1] for b in boxes), max(b[3] for b in boxes)
        lines.append(f'const uint8_t coveragePixels{size}[] PROGMEM = {{')
        for i in range(0,len(pixels),16):
            lines.append('  '+', '.join(f'0x{x:02x}' for x in pixels[i:i+16])+',')
        lines.extend(['};',f'const CoverageGlyph coverageGlyphs{size}[] PROGMEM = {{'])
        lines.extend('  {'+', '.join(map(str,g))+'},' for g in glyphs)
        lines.extend(['};',f'const CoverageFont coverageFont{size} = {{coveragePixels{size}, coverageGlyphs{size}, {len(glyphs)}, {ascent}, {descent}}};'])
    lines.extend(['#endif', 'const CoverageFont *builtInCoverageFont(uint8_t size) {', '#if defined(ESP8266) || defined(COVERAGE_TEST)', '  if (size == 2) return &coverageFont36;', '  if (size == 3) return &coverageFont48;', '#else', '  (void)size;', '#endif', '  return nullptr;', '}'])
    destination.write_text('\n'.join(lines)+'\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    args = parser.parse_args()
    generate(args.source, args.destination)
