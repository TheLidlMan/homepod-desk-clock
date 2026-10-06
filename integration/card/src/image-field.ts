import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type { Hass, ImageAsset } from "./types";

type EncodedImage = ImageAsset & { data: string };

type BrowserImageDecoder = {
  tracks: {
    ready: Promise<void>;
    selectedTrack?: { frameCount: number };
  };
  decode(options: { frameIndex: number; completeFramesOnly: boolean }): Promise<{
    image: CanvasImageSource & {
      displayWidth: number;
      displayHeight: number;
      duration?: number | null;
      close(): void;
    };
  }>;
  close(): void;
};

type BrowserImageDecoderConstructor = new (options: {
  data: ArrayBuffer;
  type: string;
}) => BrowserImageDecoder;

const animatedImageMagic = [77, 68, 65, 50];
const animatedHeaderBytes = 16;
const animatedFrameRecordBytes = 18;
const maximumAnimatedFrames = 120;
const maximumAnimatedBytes = 768 * 1024;
const minimumFrameDurationMs = 100;

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
};

const hash64 = (bytes: Uint8Array) => {
  let hash = 0xcbf29ce484222325n;
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
};

export const encodeRgb565Rle = (
  pixels: Uint8Array,
  width: number,
  height: number,
) => {
  const maximumBytes =
    8 + pixels.length + height * (2 + Math.ceil(width / 128));
  const encoded = new Uint8Array(maximumBytes);
  const encodedView = new DataView(encoded.buffer);
  encoded.set([77, 68, 73, 50], 0);
  encoded[4] = width & 0xff;
  encoded[5] = width >> 8;
  encoded[6] = height & 0xff;
  encoded[7] = height >> 8;
  const equal = (left: number, right: number) =>
    pixels[left * 2] === pixels[right * 2] &&
    pixels[left * 2 + 1] === pixels[right * 2 + 1];
  let target = 8;
  for (let row = 0; row < height; row += 1) {
    const rowEnd = (row + 1) * width;
    let source = row * width;
    const rowLengthOffset = target;
    target += 2;
    while (source < rowEnd) {
      let run = 1;
      while (
        run < 128 &&
        source + run < rowEnd &&
        equal(source, source + run)
      ) {
        run += 1;
      }
      if (run >= 2) {
        encoded[target++] = 0x80 | (run - 1);
        encoded[target++] = pixels[source * 2];
        encoded[target++] = pixels[source * 2 + 1];
        source += run;
        continue;
      }
      const literalStart = source++;
      while (source - literalStart < 128 && source < rowEnd) {
        run = 1;
        while (
          run < 2 &&
          source + run < rowEnd &&
          equal(source, source + run)
        ) {
          run += 1;
        }
        if (run >= 2) break;
        source += 1;
      }
      const literalPixels = source - literalStart;
      encoded[target++] = literalPixels - 1;
      const literal = pixels.subarray(literalStart * 2, source * 2);
      encoded.set(literal, target);
      target += literal.length;
    }
    encodedView.setUint16(rowLengthOffset, target - rowLengthOffset - 2, true);
  }
  return encoded.slice(0, target);
};

const canvasRgb565 = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) => {
  const rgba = context.getImageData(0, 0, width, height).data;
  const pixels = new Uint8Array(width * height * 2);
  const view = new DataView(pixels.buffer);
  for (
    let source = 0, target = 0;
    source < rgba.length;
    source += 4, target += 2
  ) {
    const color =
      ((rgba[source] & 0xf8) << 8) |
      ((rgba[source + 1] & 0xfc) << 3) |
      (rgba[source + 2] >> 3);
    view.setUint16(target, color, true);
  }
  return pixels;
};

export const encodeAnimatedRgb565Rle = (
  frames: {
    durationMs: number;
    bytes: Uint8Array;
    dirty?: { x: number; y: number; width: number; height: number };
  }[],
  width: number,
  height: number,
) => {
  if (frames.length < 2 || frames.length > maximumAnimatedFrames)
    throw new Error("Animated GIF requires 2-120 optimized frames");
  const directoryBytes = frames.length * animatedFrameRecordBytes;
  const totalBytes =
    animatedHeaderBytes +
    directoryBytes +
    frames.reduce((total, frame) => total + frame.bytes.length, 0);
  const encoded = new Uint8Array(totalBytes);
  const view = new DataView(encoded.buffer);
  encoded.set(animatedImageMagic, 0);
  view.setUint16(4, width, true);
  view.setUint16(6, height, true);
  view.setUint16(8, frames.length, true);
  const totalDuration = frames.reduce(
    (total, frame) => total + frame.durationMs,
    0,
  );
  view.setUint32(12, totalDuration, true);
  let payloadOffset = animatedHeaderBytes + directoryBytes;
  frames.forEach((frame, index) => {
    const record = animatedHeaderBytes + index * animatedFrameRecordBytes;
    view.setUint16(record, frame.durationMs, true);
    view.setUint32(record + 2, payloadOffset, true);
    view.setUint32(record + 6, frame.bytes.length, true);
    const dirty = frame.dirty ?? { x: 0, y: 0, width, height };
    view.setUint16(record + 10, dirty.x, true);
    view.setUint16(record + 12, dirty.y, true);
    view.setUint16(record + 14, dirty.width, true);
    view.setUint16(record + 16, dirty.height, true);
    encoded.set(frame.bytes, payloadOffset);
    payloadOffset += frame.bytes.length;
  });
  return encoded;
};

const animatedDamage = (
  pixels: Uint8Array,
  previous: Uint8Array,
  width: number,
  height: number,
) => {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const byte = pixel * 2;
    if (
      pixels[byte] === previous[byte] &&
      pixels[byte + 1] === previous[byte + 1]
    )
      continue;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x + 1);
    bottom = Math.max(bottom, y + 1);
  }
  return {
    dirty: {
      x: right ? left : 0,
      y: bottom ? top : 0,
      width: Math.max(1, right - left),
      height: Math.max(1, bottom - top),
    },
  };
};

const isGif = async (file: File) => {
  if (file.type.toLowerCase() === "image/gif") return true;
  const signature = new Uint8Array(await file.slice(0, 6).arrayBuffer());
  return new TextDecoder().decode(signature).startsWith("GIF8");
};

const encodeGifAtScale = async (
  data: ArrayBuffer,
  maximumWidth: number,
  maximumHeight: number,
  scaleLimit: number,
) => {
  const ImageDecoder = (
    globalThis as typeof globalThis & {
      ImageDecoder?: BrowserImageDecoderConstructor;
    }
  ).ImageDecoder;
  if (!ImageDecoder)
    throw new Error(
      "Animated GIF upload requires a browser with ImageDecoder support",
    );
  const decoder = new ImageDecoder({ data: data.slice(0), type: "image/gif" });
  try {
    await decoder.tracks.ready;
    const sourceFrames = decoder.tracks.selectedTrack?.frameCount ?? 0;
    if (sourceFrames < 1) throw new Error("GIF does not contain an image");
    const stride = Math.max(1, Math.ceil(sourceFrames / maximumAnimatedFrames));
    const first = await decoder.decode({
      frameIndex: 0,
      completeFramesOnly: true,
    });
    const sourceWidth = first.image.displayWidth;
    const sourceHeight = first.image.displayHeight;
    const scale = Math.min(
      1,
      maximumWidth / sourceWidth,
      maximumHeight / sourceHeight,
      scaleLimit,
    );
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser cannot optimize images");
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    const frames: {
      durationMs: number;
      bytes: Uint8Array;
      dirty: { x: number; y: number; width: number; height: number };
    }[] = [];
    let firstFrame: Uint8Array | undefined;
    let firstPixels: Uint8Array | undefined;
    let previousPixels: Uint8Array | undefined;
    let preview = "";
    for (let index = 0; index < sourceFrames; index += stride) {
      const decoded = index === 0
        ? first
        : await decoder.decode({ frameIndex: index, completeFramesOnly: true });
      context.fillStyle = "#000";
      context.fillRect(0, 0, width, height);
      context.drawImage(decoded.image, 0, 0, width, height);
      const pixels = canvasRgb565(context, width, height);
      firstPixels ??= pixels;
      const image = encodeRgb565Rle(pixels, width, height);
      firstFrame ??= image;
      const duration = Math.max(
        minimumFrameDurationMs,
        Math.round((decoded.image.duration ?? 100000) / 1000) * stride,
      );
      const previous = frames.at(-1);
      const payload = image.subarray(8);
      if (
        previous &&
        previous.bytes.length === payload.length &&
        previous.bytes.every((byte, offset) => byte === payload[offset]) &&
        previous.durationMs + duration <= 60000
      ) {
        previous.durationMs += duration;
      } else {
        const damage = previousPixels
          ? animatedDamage(pixels, previousPixels, width, height)
          : { dirty: { x: 0, y: 0, width, height } };
        frames.push({
          durationMs: Math.min(60000, duration),
          bytes: payload,
          ...damage,
        });
        previousPixels = pixels;
      }
      if (!preview) preview = canvas.toDataURL("image/webp", 0.82);
      decoded.image.close();
    }
    if (frames.length > 1 && firstPixels && previousPixels) {
      Object.assign(
        frames[0],
        animatedDamage(firstPixels, previousPixels, width, height),
      );
    }
    const animated = frames.length > 1;
    return {
      width,
      height,
      frames,
      preview,
      animated,
      bytes: animated
        ? encodeAnimatedRgb565Rle(frames, width, height)
        : firstFrame!,
    };
  } finally {
    decoder.close();
  }
};

const encodeGif = async (
  file: File,
  maximumWidth: number,
  maximumHeight: number,
): Promise<EncodedImage> => {
  const data = await file.arrayBuffer();
  let scale = 1;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await encodeGifAtScale(
      data,
      maximumWidth,
      maximumHeight,
      scale,
    );
    if (result.bytes.length <= maximumAnimatedBytes) {
      return {
        id: hash64(result.bytes),
        name: file.name,
        width: result.width,
        height: result.height,
        bytes: result.bytes.length,
        data: bytesToBase64(result.bytes),
        preview: result.preview,
        animated: result.animated,
        frameCount: result.animated ? result.frames.length : 1,
        durationMs: result.animated
          ? result.frames.reduce((total, frame) => total + frame.durationMs, 0)
          : 0,
      };
    }
    scale *= Math.max(
      0.5,
      Math.min(0.82, Math.sqrt(maximumAnimatedBytes / result.bytes.length) * 0.9),
    );
  }
  throw new Error("GIF is too complex for this display");
};

export const encodeImage = async (
  file: File,
  maximumWidth: number,
  maximumHeight: number,
): Promise<EncodedImage> => {
  if (await isGif(file)) return encodeGif(file, maximumWidth, maximumHeight);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    maximumWidth / bitmap.width,
    maximumHeight / bitmap.height,
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("This browser cannot optimize images");
  context.fillStyle = "#000";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const pixels = canvasRgb565(context, width, height);
  const bytes = encodeRgb565Rle(pixels, width, height);
  return {
    id: hash64(bytes),
    name: file.name,
    width,
    height,
    bytes: bytes.length,
    data: bytesToBase64(bytes),
    preview: canvas.toDataURL("image/webp", 0.82),
  };
};

@customElement("mini-display-image-field")
export class MiniDisplayImageField extends LitElement {
  @property({ attribute: false }) hass?: Hass;
  @property({ attribute: false }) assets: ImageAsset[] = [];
  @property() displayId = "";
  @property() label = "Image";
  @property() value = "";
  @property({ type: Boolean }) uploadOnly = false;
  @property({ type: Number }) maximumWidth = 240;
  @property({ type: Number }) maximumHeight = 240;
  @state() private busy = false;
  @state() private error = "";

  static styles = css`
    :host {
      display: block;
    }
    .field {
      display: grid;
      gap: 8px;
    }
    .label {
      font-size: 12px;
      color: var(--secondary-text-color);
    }
    .picker {
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      min-height: 72px;
      padding: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 10px;
    }
    .thumb {
      width: 56px;
      height: 56px;
      object-fit: cover;
      background: var(--secondary-background-color);
      border-radius: 7px;
    }
    .empty {
      display: grid;
      place-items: center;
      color: var(--secondary-text-color);
    }
    select {
      width: 100%;
      min-height: 40px;
      padding: 0 10px;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
    }
    .upload {
      position: relative;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border: 0;
      border-radius: 50%;
      color: var(--primary-color);
      background: var(--secondary-background-color);
      cursor: pointer;
    }
    .actions {
      display: flex;
      gap: 4px;
    }
    .detach {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      padding: 0;
      color: var(--secondary-text-color);
      background: transparent;
      border: 0;
      border-radius: 50%;
      cursor: pointer;
    }
    .detach:hover {
      color: var(--primary-text-color);
      background: var(--secondary-background-color);
    }
    .upload input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }
    .error {
      font-size: 12px;
      color: var(--error-color);
    }
    small {
      color: var(--secondary-text-color);
    }
  `;

  render() {
    const selected = this.assets.find((asset) => asset.id === this.value);
    return html`<div class="field">
      <span class="label">${this.label}</span>
      <div class="picker">
        ${selected?.preview ? html`<img class="thumb" src=${selected.preview} alt="" />` : html`<div class="thumb empty"><ha-icon icon="mdi:image-outline"></ha-icon></div>`}
        <div>
          ${
            this.uploadOnly
              ? html`<strong>Add a new image</strong><br /><small
                    >Optimized for this display before upload</small
                  >`
              : html`<select
                    .value=${this.value}
                    ?disabled=${this.busy}
                    @change=${(event: Event) => this.select((event.target as HTMLSelectElement).value)}
                  >
                    <option value="">No image</option>
                    ${this.assets.map((asset) => html`<option value=${asset.id}>${asset.name} · ${asset.width}×${asset.height}</option>`)}</select
                  >${selected ? html`<small
                      >${Math.ceil(selected.bytes / 1024)} KB on display${selected.animated
                        ? ` · ${selected.frameCount} frames`
                        : ""}</small
                    >` : nothing}`
          }
        </div>
        <div class="actions">
          ${
            selected && !this.uploadOnly
              ? html`<button
                  class="detach"
                  title="Detach image"
                  aria-label="Detach image"
                  ?disabled=${this.busy}
                  @click=${() => this.select("")}
                >
                  <ha-icon icon="mdi:image-remove-outline"></ha-icon>
                </button>`
              : nothing
          }
          <label class="upload" title="Upload image"
            ><ha-icon icon=${this.busy ? "mdi:loading" : "mdi:upload"}></ha-icon
            ><input
              type="file"
              accept="image/*,.gif"
              ?disabled=${this.busy}
              @change=${this.upload}
          /></label>
        </div>
      </div>
      ${this.error ? html`<div class="error" role="alert">${this.error}</div>` : nothing}
    </div>`;
  }

  private select(value: string) {
    this.dispatchEvent(
      new CustomEvent("image-changed", {
        detail: value,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private upload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.hass || !this.displayId) return;
    this.busy = true;
    this.error = "";
    try {
      const asset = await encodeImage(
        file,
        Math.max(1, this.maximumWidth),
        Math.max(1, this.maximumHeight),
      );
      await this.hass.callWS({
        type: "mini_display/asset/upload",
        config_entry_id: this.displayId,
        asset_id: asset.id,
        name: asset.name,
        width: asset.width,
        height: asset.height,
        data: asset.data,
        preview: asset.preview,
      });
      this.dispatchEvent(
        new CustomEvent("asset-uploaded", {
          detail: asset,
          bubbles: true,
          composed: true,
        }),
      );
      if (!this.uploadOnly) this.select(asset.id);
    } catch (error) {
      this.error = error instanceof Error ? error.message : String(error);
    } finally {
      this.busy = false;
      input.value = "";
    }
  };
}
