import { ref } from "lit/directives/ref.js";
import type { Style } from "./types";

export const marqueeEnabled = (style: Style | undefined, fallback = false) =>
  (style?.marquee ?? fallback) && (style?.textFlow ?? "default") === "default";

const running = new WeakMap<Element, { key: string; animation?: Animation }>();

// Animate the complete text, not a clipped snapshot. Keep the same animation
// when HA refreshes unrelated values. Only the parent clips the moving track.
export function marqueeMotion(distance: number, style: Style | undefined, content: string, refreshRateHz = 60) {
  return ref((element?: Element) => {
    if (!element) return;
    const interval = Math.max(50, 1000 / Math.max(0.1, refreshRateHz), Math.min(10000, style?.marqueeIntervalMs ?? 100));
    const step = Math.max(1, Math.min(16, Math.round(style?.marqueeStepPixels ?? 1)));
    const loop = style?.marqueeEffect === "loop";
    const key = JSON.stringify([distance, interval, step, loop, content]);
    if (running.get(element)?.key === key) return;
    running.get(element)?.animation?.cancel();
    if (distance <= 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      running.set(element, { key });
      return;
    }
    const positions: { x: number; time: number }[] = [{ x: 0, time: 0 }, { x: 0, time: 1000 }];
    let time = 1000;
    for (let x = step; x < distance; x += step) positions.push({ x, time: time += interval });
    positions.push({ x: distance, time: time += interval });
    if (!loop) {
      positions.push({ x: distance, time: time += 700 });
      for (let x = distance - step; x > 0; x -= step) positions.push({ x, time: time += interval });
      positions.push({ x: 0, time: time += interval });
    }
    const animation = element.animate(positions.map(point => ({
      transform: `translateX(${-point.x}px)`, offset: point.time / time, easing: "steps(1,end)",
    })), { duration: time, iterations: Infinity });
    running.set(element, { key, animation });
  });
}
