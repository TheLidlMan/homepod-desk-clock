import type { Dashboard, Style } from "./types";
import { firmwareFontHeight, firmwareTextWidth } from "./firmware-text";
import { displayColors } from "./color-field";
import { marqueeEnabled } from "./preview-marquee";

export class PreviewTypography {
  valueFontSize(
    card: Dashboard["pages"][number]["rows"][number]["cards"][number],
    value: string,
    width: number,
    height: number,
  ) {
    // Adafruit GFX font names use point sizes. At the display's pixel density,
    // their browser equivalents are approximately 2 CSS pixels per point.
    const sizes = [18, 24, 36, 48];
    const lineHeights = sizes.map(firmwareFontHeight);
    const requested = card.valueStyle?.fontSize ?? "auto";
    let index =
      requested === "small"
        ? 0
        : requested === "medium"
          ? 1
          : requested === "large"
            ? 2
            : requested === "xlarge"
              ? 3
              : height >= 58
                ? 3
                : height >= 42
                  ? 2
                  : height >= 28
                    ? 1
                    : 0;
    if ((card.valueStyle?.textFlow ?? "default") !== "default")
      return sizes[requested === "auto" ? Math.min(index, 1) : index];
    while (index > 0) {
      if (lineHeights[index] <= height) {
        if (marqueeEnabled(card.valueStyle) || firmwareTextWidth(value, sizes[index]) <= width - 6) break;
      }
      index -= 1;
    }
    return sizes[index];
  }

  fontLineHeight(size: number) {
    return firmwareFontHeight(size);
  }

  titleFontSize(
    card: Dashboard["pages"][number]["rows"][number]["cards"][number],
    title: string,
    width: number,
    height: number,
    valueSize: number,
  ) {
    const requested = card.titleStyle?.fontSize ?? "auto";
    const family = card.titleStyle?.fontFamily ?? "sans";
    const builtIn = ["default", "sans", "sans-bold"].includes(family);
    if (requested !== "auto")
      return { small: builtIn ? 13 : 18, medium: 24, large: 36, xlarge: 48 }[
        requested
      ];
    if ((card.titleStyle?.textFlow ?? "default") !== "default")
      return builtIn ? 13 : 24;
    const requestedSize = valueSize >= 48 ? 24 : valueSize >= 24 ? 18 : 13;
    const candidates = [48, 36, 24, 18, 13].filter(
      (size) => size <= requestedSize && (size !== 13 || builtIn),
    );
    for (const size of candidates) {
      if (this.fontLineHeight(size) > height) continue;
      if (marqueeEnabled(card.titleStyle, true) || firmwareTextWidth(title, size) <= width - 6) return size;
    }
    return builtIn ? 13 : 18;
  }

  freeFontSize(
    text: string,
    style: Style | undefined,
    width: number,
    height: number,
    scroll = false,
  ) {
    const builtIn = ["default", "sans", "sans-bold"].includes(
      style?.fontFamily ?? "default",
    );
    return (
      [48, 36, 24, 18, ...(builtIn ? [13] : [])].find(
        (size) =>
          this.fontLineHeight(size) <= height &&
          (scroll || style?.textFlow === "overflow" || firmwareTextWidth(text, size) <= width - 8),
      ) ?? (builtIn ? 13 : 18)
    );
  }

  textEffectCss(style?: Style) {
    const effect = style?.textEffect ?? "none";
    if (effect === "none") return "";
    const rawColor = style?.effectColor ?? "background";
    const color = displayColors[rawColor] ?? rawColor;
    const thickness = Math.max(
      1,
      Math.min(3, Math.round(style?.effectThickness ?? 1)),
    );
    const shadows: string[] = [];
    if (effect === "outline") {
      for (let radius = 1; radius <= thickness; radius += 1) {
        for (const [x, y] of [
          [-radius, 0],
          [radius, 0],
          [0, -radius],
          [0, radius],
          [-radius, -radius],
          [radius, -radius],
          [-radius, radius],
          [radius, radius],
        ])
          shadows.push(`${x}px ${y}px 0 ${color}`);
      }
    } else {
      const offsetX = Math.max(-6, Math.min(6, style?.effectOffsetX ?? 2));
      const offsetY = Math.max(-6, Math.min(6, style?.effectOffsetY ?? 2));
      const spread = thickness - 1;
      for (let x = -spread; x <= spread; x += 1)
        for (let y = -spread; y <= spread; y += 1)
          shadows.push(`${offsetX + x}px ${offsetY + y}px 0 ${color}`);
    }
    return `text-shadow:${shadows.join(",")}`;
  }

  textFlowCss(style: Style | undefined, size: number) {
    if (style?.textFlow === "overflow")
      return "white-space:pre;overflow:visible;max-width:none;flex-shrink:0;text-overflow:clip";
    if (style?.textFlow === "wrap")
      return `white-space:pre-wrap;overflow-wrap:anywhere;overflow:hidden;max-width:100%;max-height:min(100%,${6 * this.fontLineHeight(size)}px);line-height:${this.fontLineHeight(size)}px;text-overflow:clip`;
    return "";
  }
}
