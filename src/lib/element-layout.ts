import type { ChemicalElement } from "@/types/element";

/**
 * 2D grid placement for the conventional 18-column table with the
 * lanthanide/actinide rows detached below the main body.
 *
 * Coordinates are 1-based (CSS grid friendly):
 *   rows 1–7  → periods 1–7
 *   row 8     → spacer
 *   rows 9–10 → lanthanides (57–71) and actinides (89–103), columns 3–17
 *
 * The same grid coordinates are intended as the source of truth for the
 * phase-2 3D table, so keep this module free of React/DOM concerns.
 */
export const GRID_COLUMNS = 18;
export const GRID_ROWS = 10;
export const MAIN_ROWS = 7;
export const LANTHANIDE_ROW = 9;
export const ACTINIDE_ROW = 10;
const F_ROW_START_COLUMN = 3;

export const LANTHANIDE_RANGE = { first: 57, last: 71 } as const;
export const ACTINIDE_RANGE = { first: 89, last: 103 } as const;

export interface GridPosition {
  row: number;
  column: number;
}

export interface ElementCell extends GridPosition {
  kind: "element";
  element: ChemicalElement;
}

/** Marker in group 3 of periods 6/7 pointing at the detached f-block row. */
export interface SeriesPlaceholderCell extends GridPosition {
  kind: "series-placeholder";
  series: "lanthanide" | "actinide";
  label: string;
  labelZh: string;
}

export type LayoutCell = ElementCell | SeriesPlaceholderCell;

const inRange = (n: number, r: { first: number; last: number }) => n >= r.first && n <= r.last;

export function getGridPosition(element: ChemicalElement): GridPosition {
  const { number, period, group } = element;
  if (inRange(number, LANTHANIDE_RANGE)) {
    return { row: LANTHANIDE_ROW, column: F_ROW_START_COLUMN + number - LANTHANIDE_RANGE.first };
  }
  if (inRange(number, ACTINIDE_RANGE)) {
    return { row: ACTINIDE_ROW, column: F_ROW_START_COLUMN + number - ACTINIDE_RANGE.first };
  }
  if (group === null) {
    throw new Error(`Element ${number} has no group and is outside the f-block rows`);
  }
  return { row: period, column: group };
}

export const SERIES_PLACEHOLDERS: readonly SeriesPlaceholderCell[] = [
  {
    kind: "series-placeholder",
    series: "lanthanide",
    row: 6,
    column: 3,
    label: `${LANTHANIDE_RANGE.first}–${LANTHANIDE_RANGE.last}`,
    labelZh: "鑭系",
  },
  {
    kind: "series-placeholder",
    series: "actinide",
    row: 7,
    column: 3,
    label: `${ACTINIDE_RANGE.first}–${ACTINIDE_RANGE.last}`,
    labelZh: "錒系",
  },
];

export function buildLayout(elements: readonly ChemicalElement[]): LayoutCell[] {
  const cells: LayoutCell[] = elements.map((element) => ({
    kind: "element",
    element,
    ...getGridPosition(element),
  }));
  return [...cells, ...SERIES_PLACEHOLDERS];
}

export type ArrowDirection = "up" | "down" | "left" | "right";

/**
 * Finds the element the keyboard focus should move to. Movement skips empty
 * grid gaps; vertical moves pick the nearest column in the next populated row.
 */
export function findNeighbor(
  cells: readonly ElementCell[],
  from: GridPosition,
  direction: ArrowDirection,
): ElementCell | undefined {
  if (direction === "left" || direction === "right") {
    const sign = direction === "right" ? 1 : -1;
    return cells
      .filter((c) => c.row === from.row && (c.column - from.column) * sign > 0)
      .sort((a, b) => Math.abs(a.column - from.column) - Math.abs(b.column - from.column))[0];
  }
  const sign = direction === "down" ? 1 : -1;
  const candidates = cells.filter((c) => (c.row - from.row) * sign > 0);
  if (candidates.length === 0) return undefined;
  const nextRow = candidates.reduce((best, c) =>
    Math.abs(c.row - from.row) < Math.abs(best.row - from.row) ? c : best,
  ).row;
  return candidates
    .filter((c) => c.row === nextRow)
    .sort(
      (a, b) =>
        Math.abs(a.column - from.column) - Math.abs(b.column - from.column) || a.column - b.column,
    )[0];
}
