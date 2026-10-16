import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/data/elements";
import { createAtomModel } from "@/lib/atom-model";
import { SHELL_COLORS } from "@/lib/element-colors";
import { SHELL_LABELS } from "@/lib/element-utils";

describe("createAtomModel", () => {
  it("conserves every neutral atom's electrons without mutating source data", () => {
    for (const element of ELEMENTS) {
      const before = [...element.shellElectrons];
      const model = createAtomModel(element);
      expect(model.protonCount, element.symbol).toBe(element.number);
      expect(model.electronCount, element.symbol).toBe(element.number);
      expect(model.shells.map((s) => s.electrons.length), element.symbol).toEqual(before);
      expect(model.shells.flatMap((s) => s.electrons), element.symbol).toHaveLength(element.number);
      expect(element.shellElectrons).toEqual(before);
    }
  });

  it("puts each unique, finite electron marker on its own shell's ring", () => {
    for (const element of ELEMENTS) {
      const model = createAtomModel(element);
      model.shells.forEach((shell, i) => {
        expect(shell.label).toBe(SHELL_LABELS[i]);
        expect(shell.principalNumber).toBe(i + 1);
        expect(shell.radius).toBeLessThanOrEqual(model.radius);
        if (i > 0) expect(shell.radius).toBeGreaterThan(model.shells[i - 1].radius);
        expect(new Set(shell.electrons.map((p) => p.join(","))).size).toBe(shell.electronCount);
        for (const point of shell.electrons) {
          expect(point.every(Number.isFinite)).toBe(true);
          expect(Math.hypot(...point)).toBeCloseTo(shell.radius, 10);
        }
      });
    }
  });

  it("handles hydrogen and the full seven-shell oganesson", () => {
    const hydrogen = createAtomModel(ELEMENTS[0]);
    expect(hydrogen.shells).toHaveLength(1);
    const oganesson = createAtomModel(ELEMENTS[117]);
    expect(oganesson.shells.map((s) => s.electronCount)).toEqual([2, 8, 18, 32, 32, 18, 8]);
    expect(oganesson.radius).toBeGreaterThan(hydrogen.radius);
    expect(createAtomModel(ELEMENTS[117])).toEqual(oganesson); // deterministic
  });

  it("has a shell colour for every possible shell", () => {
    expect(SHELL_COLORS).toHaveLength(SHELL_LABELS.length);
  });

  it.each([
    { number: 8, shellElectrons: [2, 5] },
    { number: 3, shellElectrons: [3] },
    { number: 1, shellElectrons: [1, 0] },
    { number: 2, shellElectrons: [1.5, 0.5] },
    { number: 0, shellElectrons: [] },
    { number: 1, shellElectrons: [Number.NaN] },
    { number: 119, shellElectrons: [2, 8, 18, 32, 32, 18, 8, 1] },
  ])("rejects invalid atom data: $number / $shellElectrons", (element) => {
    expect(() => createAtomModel(element)).toThrow(RangeError);
  });
});
