import type { DisplayCard } from "./types";

export type FreeFrame = NonNullable<DisplayCard["frame"]>;
export type FreePart = "card" | "title" | "value";

// Absolute page percentages: changing one text box never moves the other.
export function freeTextFrame(card: DisplayCard, part: FreePart): FreeFrame {
  const frame = card.frame ?? { x: 0, y: 0, width: 50, height: 25 };
  if (part === "card") return frame;
  const stored = part === "title" ? card.titleFrame : card.valueFrame;
  if (stored) return stored;
  const titleHeight = Math.min(frame.height, Math.max(2, frame.height * 0.3));
  if (part === "title") return { ...frame, height: titleHeight };
  const hasTitle =
    !!card.title && card.showTitle !== false && frame.height >= 4;
  return hasTitle
    ? {
        ...frame,
        y: frame.y + titleHeight,
        height: Math.max(2, frame.height - titleHeight),
      }
    : { ...frame };
}

export function freezeTextFrames(card: DisplayCard): void {
  card.titleFrame ??= { ...freeTextFrame(card, "title") };
  card.valueFrame ??= { ...freeTextFrame(card, "value") };
}
