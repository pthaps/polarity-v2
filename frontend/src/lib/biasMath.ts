/**
 * Pure bias / spectrum math — safe to import from Client Components (no Node fs).
 */

export type BiasCategory5 =
  | "Far Left"
  | "Lean Left"
  | "Center"
  | "Lean Right"
  | "Far Right";

/** Horizontal bias −42 … +42 → slider 0–100 (left = 0, right = 100). */
export function horizontalToSliderPercent(horizontal: number): number {
  const h = Math.min(42, Math.max(-42, horizontal));
  return ((h + 42) / 84) * 100;
}

/** Map horizontal rank (−42 … +42) to five-way spectrum */
export function horizontalToBiasCategory(horizontal: number): BiasCategory5 {
  const h = Math.min(42, Math.max(-42, horizontal));
  if (h <= -26) return "Far Left";
  if (h <= -9) return "Lean Left";
  if (h <= 8) return "Center";
  if (h <= 25) return "Lean Right";
  return "Far Right";
}

export function biasCategoryIndex(cat: BiasCategory5): number {
  const order: BiasCategory5[] = [
    "Far Left",
    "Lean Left",
    "Center",
    "Lean Right",
    "Far Right",
  ];
  return order.indexOf(cat);
}
