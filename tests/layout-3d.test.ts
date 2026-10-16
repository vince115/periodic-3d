import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/data/elements";
import {
  CARD_SIZE,
  COLUMN_SPACING,
  ROW_SPACING,
  TABLE_LAYOUTS_3D,
  elementPosition3D,
  layoutBounds,
} from "@/lib/element-position-3d";
import { getGridPosition } from "@/lib/element-layout";

const bySymbol = (symbol: string) => ELEMENTS.find((e) => e.symbol === symbol)!;
const pos = (symbol: string) => elementPosition3D(bySymbol(symbol), "table");

describe("3D element arrangements", () => {
  it.each(TABLE_LAYOUTS_3D)("gives all 118 elements unique, finite %s positions", (layout) => {
    const positions = ELEMENTS.map((el) => elementPosition3D(el, layout));
    expect(new Set(positions.map((p) => p.join(","))).size).toBe(118);
    expect(positions.every((p) => p.length === 3 && p.every(Number.isFinite))).toBe(true);
  });

  it.each(TABLE_LAYOUTS_3D)("keeps %s positions stable when input is filtered or reordered", (layout) => {
    const reference = new Map(ELEMENTS.map((el) => [el.number, elementPosition3D(el, layout)]));
    const subset = ELEMENTS.filter((el) => el.number % 3 === 0).toReversed();
    for (const el of subset) expect(elementPosition3D(el, layout)).toEqual(reference.get(el.number));
  });

  it("mirrors the 2D grid for the table layout, detached f-block rows included", () => {
    for (const el of ELEMENTS) {
      const { row, column } = getGridPosition(el);
      const [x, y, z] = elementPosition3D(el, "table");
      expect(x).toBeCloseTo((column - 9.5) * COLUMN_SPACING);
      expect(y).toBeCloseTo((5.5 - row) * ROW_SPACING);
      expect(z).toBe(0);
    }
    expect(pos("He")[1]).toBe(pos("H")[1]);
    expect(pos("He")[0]).toBeCloseTo(-pos("H")[0]);
    expect(pos("H")[1] - pos("Li")[1]).toBeCloseTo(ROW_SPACING);
    // Same columns as the 2D layout: La/Ac under Sc, Lu/Lr under group 17.
    expect(pos("La")[0]).toBeCloseTo(pos("Sc")[0]);
    expect(pos("Ac")[0]).toBeCloseTo(pos("La")[0]);
    expect(pos("Lr")[0]).toBeCloseTo(pos("Cl")[0]);
    // Rows 9–10 sit one spacer row below period 7.
    expect(pos("Fr")[1] - pos("La")[1]).toBeCloseTo(2 * ROW_SPACING);
    expect(pos("La")[1] - pos("Ac")[1]).toBeCloseTo(ROW_SPACING);
  });

  it("places the sphere on a common radius with no stacked poles", () => {
    const positions = ELEMENTS.map((el) => elementPosition3D(el, "sphere"));
    for (const p of positions) {
      expect(Math.hypot(...p)).toBeCloseTo(11);
      expect(Math.abs(p[1])).toBeLessThan(11);
    }
    expect(positions.reduce((sum, p) => sum + p[1], 0)).toBeCloseTo(0);
  });

  it("winds the helix through three turns in descending atomic order", () => {
    const positions = ELEMENTS.map((el) => elementPosition3D(el, "helix"));
    positions.forEach((p, i) => {
      expect(Math.hypot(p[0], p[2])).toBeCloseTo(9);
      if (i > 0) expect(p[1]).toBeLessThan(positions[i - 1][1]);
    });
    expect(positions[0][1] - positions[117][1]).toBeCloseTo(18);
    for (const i of [39, 78, 117]) {
      expect(positions[i][0]).toBeCloseTo(positions[0][0]);
      expect(positions[i][2]).toBeCloseTo(positions[0][2]);
    }
  });

  it("stacks the grid as 5 × 5 layers in atomic order", () => {
    const layerOf = (n: number) => elementPosition3D(ELEMENTS[n - 1], "grid")[2];
    expect(new Set(ELEMENTS.map((el) => layerOf(el.number))).size).toBe(5);
    expect(layerOf(1)).toBe(layerOf(25));
    expect(layerOf(26)).toBeLessThan(layerOf(25));
    const [x1, y1] = elementPosition3D(ELEMENTS[0], "grid");
    const [x2, y2] = elementPosition3D(ELEMENTS[1], "grid");
    expect(y2).toBe(y1);
    expect(x2).toBeGreaterThan(x1);
  });

  it("produces four different arrangements", () => {
    const arrangements = TABLE_LAYOUTS_3D.map((layout) =>
      JSON.stringify(ELEMENTS.map((el) => elementPosition3D(el, layout))),
    );
    expect(new Set(arrangements).size).toBe(4);
  });

  it.each(TABLE_LAYOUTS_3D)("keeps every %s card inside its bounds at any orientation", (layout) => {
    const bounds = layoutBounds(layout);
    const cardRadius = Math.hypot(CARD_SIZE.width / 2, CARD_SIZE.height / 2);
    expect(bounds.height).toBe(bounds.width);
    for (const el of ELEMENTS) {
      const outer = Math.hypot(...elementPosition3D(el, layout)) + cardRadius;
      expect(outer).toBeLessThanOrEqual(bounds.width / 2 + 1e-9);
    }
  });
});
