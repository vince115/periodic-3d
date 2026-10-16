import type { CSSProperties } from "react";
import type { Theme } from "@/lib/theme";
import type { ElementCategoryId } from "@/types/element";

/**
 * One accent per category, tuned for legibility on the dark navy theme.
 * Hues are spread around the wheel so adjacent blocks stay distinguishable;
 * the category is always also exposed as text (legend, details, aria-label).
 *
 * Kept as plain hex so the 3D scene (Three.js materials) can reuse them.
 */
export const CATEGORY_COLORS: Record<ElementCategoryId, string> = {
  "alkali-metal": "#ff6b6b",
  "alkaline-earth-metal": "#ffa94d",
  "transition-metal": "#ffd43b",
  "post-transition-metal": "#a9e34b",
  metalloid: "#38d9a9",
  nonmetal: "#4dabf7",
  halogen: "#66d9e8",
  "noble-gas": "#9775fa",
  lanthanide: "#f783ac",
  actinide: "#da77f2",
};

export function getCategoryColor(id: ElementCategoryId): string {
  return CATEGORY_COLORS[id];
}

/** Exposes the accent as a CSS custom property consumed by globals.css. */
export function categoryStyle(id: ElementCategoryId): CSSProperties {
  return { "--cat": CATEGORY_COLORS[id] } as CSSProperties;
}

/**
 * One colour per electron shell (K → Q), shared by the 2D shell bars and the
 * 3D atom rings so the bars double as the atom's legend. Pastels for the dark
 * theme; deeper tones of the same hues for light backgrounds.
 */
export const SHELL_COLORS = [
  "#a5e9d0",
  "#83c9ed",
  "#bca9ed",
  "#f0bd91",
  "#e3a6c9",
  "#d8d48b",
  "#a7c4f6",
] as const;

export const SHELL_COLORS_LIGHT = [
  "#0f9b74",
  "#1d7fc0",
  "#6a52c7",
  "#c26b1f",
  "#bd4a86",
  "#8d8714",
  "#3f6fd1",
] as const;

export function shellColors(theme: Theme): readonly string[] {
  return theme === "light" ? SHELL_COLORS_LIGHT : SHELL_COLORS;
}
