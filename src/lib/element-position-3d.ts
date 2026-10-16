import type { ChemicalElement } from "@/types/element";
import { GRID_COLUMNS, GRID_ROWS, getGridPosition } from "@/lib/element-layout";

/**
 * Arrangements for the 3D table, after the three.js "css3d periodic table"
 * example: the standard table plus three exploratory shapes. Only "table"
 * carries chemical meaning (group / period); the others are for exploring.
 */
export const TABLE_LAYOUTS_3D = ["table", "sphere", "helix", "grid"] as const;
export type TableLayout3D = (typeof TABLE_LAYOUTS_3D)[number];

export type Vec3 = [number, number, number];

const ELEMENT_COUNT = 118;
export const COLUMN_SPACING = 1.22;
export const ROW_SPACING = 1.5;
/** Card size in world units (matches the plane geometry in PeriodicTable3D). */
export const CARD_SIZE = { width: 1.08, height: 1.296 } as const; // 1 : 1.2, as the 2D tile

const SPHERE_RADIUS = 11;
const HELIX_RADIUS = 9;
const HELIX_HEIGHT = 18;
const HELIX_TURNS = 3;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** "grid": 5 × 5 cards per layer, layers stacked in depth (5 layers hold 125). */
const GRID_SIDE = 5;
const GRID_SPACING_X = 2.2;
const GRID_SPACING_Y = 2.2;
const GRID_SPACING_Z = 4;
const GRID_LAYERS = Math.ceil(ELEMENT_COUNT / (GRID_SIDE * GRID_SIDE));

/**
 * World-space position of an element. Identity comes from the atomic number,
 * so filtering or reordering the input never moves a card. +Y is up.
 * "table" reuses the 2D grid coordinates, so both views agree exactly.
 */
export function elementPosition3D(element: ChemicalElement, layout: TableLayout3D): Vec3 {
  const index = element.number - 1;
  switch (layout) {
    case "table": {
      const { row, column } = getGridPosition(element);
      return [
        (column - (GRID_COLUMNS + 1) / 2) * COLUMN_SPACING,
        ((GRID_ROWS + 1) / 2 - row) * ROW_SPACING,
        0,
      ];
    }
    case "sphere": {
      // Fibonacci sphere with midpoint sampling: no cards stacked at the poles.
      const y = 1 - (2 * (index + 0.5)) / ELEMENT_COUNT;
      const ring = Math.sqrt(1 - y * y);
      const angle = index * GOLDEN_ANGLE;
      return [
        SPHERE_RADIUS * ring * Math.cos(angle),
        SPHERE_RADIUS * y,
        SPHERE_RADIUS * ring * Math.sin(angle),
      ];
    }
    case "helix": {
      const progress = index / (ELEMENT_COUNT - 1);
      const angle = progress * Math.PI * 2 * HELIX_TURNS;
      return [
        HELIX_RADIUS * Math.cos(angle),
        HELIX_HEIGHT * (0.5 - progress),
        HELIX_RADIUS * Math.sin(angle),
      ];
    }
    case "grid": {
      const perLayer = GRID_SIDE * GRID_SIDE;
      const layer = Math.floor(index / perLayer);
      const inLayer = index % perLayer;
      const col = inLayer % GRID_SIDE;
      const row = Math.floor(inLayer / GRID_SIDE);
      const mid = (GRID_SIDE - 1) / 2;
      return [
        (col - mid) * GRID_SPACING_X,
        (mid - row) * GRID_SPACING_Y,
        ((GRID_LAYERS - 1) / 2 - layer) * GRID_SPACING_Z,
      ];
    }
  }
}

/**
 * Square extent (width = height) of a sphere enclosing every card, so the
 * camera fit stays valid however the arrangement is rotated.
 */
export function layoutBounds(layout: TableLayout3D): { width: number; height: number } {
  const cardRadius = Math.hypot(CARD_SIZE.width / 2, CARD_SIZE.height / 2);
  let radius: number;
  switch (layout) {
    case "table":
      radius = Math.hypot(
        ((GRID_COLUMNS - 1) / 2) * COLUMN_SPACING,
        ((GRID_ROWS - 1) / 2) * ROW_SPACING,
      );
      break;
    case "sphere":
      radius = SPHERE_RADIUS;
      break;
    case "helix":
      radius = Math.hypot(HELIX_RADIUS, HELIX_HEIGHT / 2);
      break;
    case "grid": {
      const half = ((GRID_SIDE - 1) / 2);
      radius = Math.hypot(
        half * GRID_SPACING_X,
        half * GRID_SPACING_Y,
        ((GRID_LAYERS - 1) / 2) * GRID_SPACING_Z,
      );
      break;
    }
  }
  const diameter = 2 * (radius + cardRadius);
  return { width: diameter, height: diameter };
}

/** Front-on framing for the flat table, which is wider than it is tall. */
export const TABLE_FRONT_FIT = {
  width: GRID_COLUMNS * COLUMN_SPACING + CARD_SIZE.width,
  height: GRID_ROWS * ROW_SPACING + CARD_SIZE.height,
} as const;
