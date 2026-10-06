export const latinPolishCharacters =
  Array.from({ length: 95 }, (_, index) =>
    String.fromCodePoint(index + 32),
  ).join("") + "ĄĆĘŁŃÓŚŹŻąćęłńóśźż";

export const latinExtendedCharacters = Array.from({ length: 224 }, (_, index) =>
  String.fromCodePoint(index + 160),
).join("");

export const greekCharacters = Array.from({ length: 144 }, (_, index) =>
  String.fromCodePoint(index + 0x370),
).join("");

export const cyrillicCharacters = Array.from({ length: 256 }, (_, index) =>
  String.fromCodePoint(index + 0x400),
).join("");

type Glyph = {
  codepoint: number;
  width: number;
  height: number;
  advance: number;
  dy: number;
  dx: number;
  pixels: Uint8Array;
};

export type FontPack = {
  name: string;
  glyphs: number;
  bytes: number;
  files: Blob[];
};

const writeInt32 = (view: DataView, offset: number, value: number) => {
  view.setUint32(offset, value >>> 0, false);
};

const compactVlwVersion = 12;
const compactMetricBytes = 7;

const uniqueCodepoints = (characters: string, limit: number) => {
  const values = new Set<number>();
  for (const character of characters) {
    const codepoint = character.codePointAt(0);
    if (codepoint === undefined || codepoint > 0xffff) continue;
    values.add(codepoint);
  }
  const result = [...values].sort((left, right) => left - right);
  if (result.length > limit)
    throw new Error(
      `The selected character set has ${result.length} glyphs; maximum is ${limit}.`,
    );
  return result;
};

const rasterize = (
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  family: string,
  size: number,
  codepoint: number,
): Glyph => {
  const character = String.fromCodePoint(codepoint);
  const setFont = () => {
    context.font = `${size}px "${family}"`;
    context.textAlign = "left";
    context.textBaseline = "alphabetic";
  };
  setFont();
  const metrics = context.measureText(character);
  const left = Math.ceil(metrics.actualBoundingBoxLeft || 0);
  const right = Math.ceil(metrics.actualBoundingBoxRight || metrics.width);
  const ascent = Math.ceil(metrics.actualBoundingBoxAscent || size * 0.8);
  const descent = Math.ceil(metrics.actualBoundingBoxDescent || size * 0.2);
  const padding = 1;
  const canvasWidth =
    codepoint === 32 ? 0 : Math.max(1, left + right + padding * 2);
  const canvasHeight =
    codepoint === 32 ? 0 : Math.max(1, ascent + descent + padding * 2);
  let width = 0;
  let height = 0;
  let dx = 0;
  let dy = 0;
  let pixels = new Uint8Array();

  if (canvasWidth && canvasHeight) {
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    setFont();
    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = "#fff";
    context.fillText(character, padding + left, padding + ascent);
    const image = context.getImageData(0, 0, canvasWidth, canvasHeight).data;
    let minX = canvasWidth;
    let minY = canvasHeight;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < canvasHeight; ++y) {
      for (let x = 0; x < canvasWidth; ++x) {
        if (image[(y * canvasWidth + x) * 4 + 3] === 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX >= minX && maxY >= minY) {
      width = maxX - minX + 1;
      height = maxY - minY + 1;
      dx = -left - padding + minX;
      dy = ascent + padding - minY;
      pixels = new Uint8Array(width * height);
      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          pixels[y * width + x] =
            image[((minY + y) * canvasWidth + minX + x) * 4 + 3];
        }
      }
    }
  }

  return {
    codepoint,
    width,
    height,
    advance: Math.max(1, Math.ceil(metrics.width)),
    dy,
    dx,
    pixels,
  };
};

const buildVlw = (family: string, size: number, codepoints: number[]): Blob => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("This browser cannot rasterize fonts.");
  const glyphs = codepoints.map((codepoint) =>
    rasterize(context, canvas, family, size, codepoint),
  );
  for (const glyph of glyphs) {
    if (
      glyph.width > 64 ||
      glyph.height > 64 ||
      glyph.advance > 96 ||
      glyph.dy < -128 ||
      glyph.dy > 127 ||
      glyph.dx < -128 ||
      glyph.dx > 127
    )
      throw new Error(
        `Glyph U+${glyph.codepoint.toString(16).toUpperCase().padStart(4, "0")} exceeds device font limits.`,
      );
  }
  const ascent = Math.max(1, ...glyphs.map((glyph) => glyph.dy));
  const descent = Math.max(
    1,
    ...glyphs.map((glyph) => glyph.height - glyph.dy),
  );
  if (ascent > 64 || descent > 32)
    throw new Error(`${size} px font metrics exceed device limits.`);
  const bitmapBytes = glyphs.reduce(
    (total, glyph) => total + glyph.pixels.length,
    0,
  );
  const headerBytes = 24;
  const metricsBytes = glyphs.length * compactMetricBytes;
  const output = new Uint8Array(headerBytes + metricsBytes + bitmapBytes);
  const view = new DataView(output.buffer);
  [glyphs.length, compactVlwVersion, size, 0, ascent, descent].forEach(
    (value, index) => writeInt32(view, index * 4, value),
  );
  let metricsOffset = headerBytes;
  let bitmapOffset = headerBytes + metricsBytes;
  for (const glyph of glyphs) {
    view.setUint16(metricsOffset, glyph.codepoint, false);
    view.setUint8(metricsOffset + 2, glyph.height);
    view.setUint8(metricsOffset + 3, glyph.width);
    view.setUint8(metricsOffset + 4, glyph.advance);
    view.setInt8(metricsOffset + 5, glyph.dy);
    view.setInt8(metricsOffset + 6, glyph.dx);
    metricsOffset += compactMetricBytes;
    output.set(glyph.pixels, bitmapOffset);
    bitmapOffset += glyph.pixels.length;
  }
  return new Blob([output], { type: "application/octet-stream" });
};

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

export async function createFontPack(
  file: File,
  name: string,
  sizes: number[],
  characters: string,
  maxGlyphs: number,
  onProgress: (completed: number, total: number) => void,
): Promise<FontPack> {
  if (!("FontFace" in window))
    throw new Error("This browser does not support local font processing.");
  const codepoints = uniqueCodepoints(characters, maxGlyphs);
  if (!codepoints.includes(32)) codepoints.unshift(32);
  const family = `mini-display-upload-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2)}`;
  const face = new FontFace(family, await file.arrayBuffer());
  await face.load();
  document.fonts.add(face);
  try {
    const files: Blob[] = [];
    for (let index = 0; index < sizes.length; ++index) {
      await nextFrame();
      files.push(buildVlw(family, sizes[index], codepoints));
      onProgress(index + 1, sizes.length);
    }
    return {
      name: name.trim() || file.name.replace(/\.[^.]+$/, ""),
      glyphs: codepoints.length,
      bytes: files.reduce((total, value) => total + value.size, 0),
      files,
    };
  } finally {
    document.fonts.delete(face);
  }
}
