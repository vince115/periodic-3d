import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/data/elements";
import {
  formatAtomicMass,
  formatElectronConfiguration,
  normalizeQuery,
  searchElements,
  splitBopomofo,
} from "@/lib/element-utils";

const symbols = (q: string) => searchElements(ELEMENTS, q).map((e) => e.symbol);

describe("searchElements", () => {
  it("matches English names (case-insensitive)", () => {
    expect(symbols("Oxygen")[0]).toBe("O");
    expect(symbols("oxygen")[0]).toBe("O");
    expect(symbols("IRON")[0]).toBe("Fe");
  });

  it("matches Traditional Chinese names", () => {
    expect(symbols("氧")).toEqual(["O"]);
    expect(symbols("鐵")).toEqual(["Fe"]);
    expect(symbols("鿫")).toEqual(["Og"]);
  });

  it("matches symbols, ranking an exact symbol first", () => {
    expect(symbols("O")[0]).toBe("O");
    expect(symbols("fe")[0]).toBe("Fe");
    expect(symbols("Na")[0]).toBe("Na");
  });

  it("matches atomic numbers exactly", () => {
    expect(symbols("8")).toEqual(["O"]);
    expect(symbols("118")).toEqual(["Og"]);
    expect(symbols("0")).toEqual([]);
    expect(symbols("119")).toEqual([]);
  });

  it("accepts full-width input from CJK IMEs and surrounding spaces", () => {
    expect(normalizeQuery("　８ ")).toBe("8");
    expect(symbols("８")).toEqual(["O"]);
    expect(symbols("  Ｏｘｙｇｅｎ ")[0]).toBe("O");
  });

  it("supports partial names", () => {
    expect(symbols("carb")).toEqual(["C"]);
    expect(symbols("ium").length).toBeGreaterThan(30);
  });

  it("returns nothing for empty or unmatched queries", () => {
    expect(symbols("")).toEqual([]);
    expect(symbols("   ")).toEqual([]);
    expect(symbols("xyzzy")).toEqual([]);
  });
});

describe("formatting", () => {
  const el = (s: string) => ELEMENTS.find((e) => e.symbol === s)!;

  it("keeps the precision implied by the CIAAW uncertainty", () => {
    expect(formatAtomicMass(el("H"))).toBe("1.0080");
    expect(formatAtomicMass(el("Ge"))).toBe("72.630");
    expect(formatAtomicMass(el("Pb"))).toBe("207.2");
    expect(formatAtomicMass(el("Fe"))).toBe("55.845");
  });

  it("brackets mass numbers of elements without a standard atomic weight", () => {
    expect(formatAtomicMass(el("Tc"))).toBe("[97]");
    expect(formatAtomicMass(el("Og"))).toBe("[294]");
  });

  it("renders electron configurations with superscripts", () => {
    expect(formatElectronConfiguration("[Ar] 3d6 4s2")).toBe("[Ar] 3d⁶ 4s²");
    expect(formatElectronConfiguration("[Xe] 4f14 5d10 6s1")).toBe("[Xe] 4f¹⁴ 5d¹⁰ 6s¹");
  });
});

describe("splitBopomofo", () => {
  it.each([
    ["ㄑㄧㄥ", "ㄑㄧㄥ", "", 1],
    ["ㄆㄧˊ", "ㄆㄧ", "ˊ", 2],
    ["ㄌㄩˇ", "ㄌㄩ", "ˇ", 3],
    ["ㄏㄞˋ", "ㄏㄞ", "ˋ", 4],
    ["˙ㄗ", "ㄗ", "˙", 5],
  ])("%s → %s + %s (tone %i)", (input, base, mark, tone) => {
    expect(splitBopomofo(input)).toMatchObject({ base, mark, tone });
  });

  it("splits every element reading into letters and a known tone", () => {
    for (const el of ELEMENTS) {
      const { base, mark } = splitBopomofo(el.nameZhBopomofo);
      expect(base, el.symbol).toMatch(/^[\u3105-\u3129]+$/u);
      expect(base + mark, el.symbol).toBe(el.nameZhBopomofo);
    }
  });
});
