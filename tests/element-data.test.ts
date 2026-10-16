import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ELEMENT_CATEGORIES } from "@/data/categories";
import { ELEMENTS, ELEMENT_DATA_META } from "@/data/elements";
import { CATEGORY_COLORS } from "@/lib/element-colors";
import {
  ACTINIDE_RANGE,
  GRID_COLUMNS,
  GRID_ROWS,
  LANTHANIDE_RANGE,
  buildLayout,
  getGridPosition,
} from "@/lib/element-layout";
import { ELEMENT_CATEGORY_IDS } from "@/types/element";

const bySymbol = (symbol: string) => {
  const el = ELEMENTS.find((e) => e.symbol === symbol);
  if (!el) throw new Error(`missing ${symbol}`);
  return el;
};

describe("element dataset", () => {
  it("contains exactly 118 elements", () => {
    expect(ELEMENTS).toHaveLength(118);
  });

  it("has atomic numbers 1–118, complete, ordered and unique", () => {
    expect(ELEMENTS.map((e) => e.number)).toEqual(Array.from({ length: 118 }, (_, i) => i + 1));
  });

  it("has unique symbols, English names and Chinese names", () => {
    for (const key of ["symbol", "name", "nameZh"] as const) {
      expect(new Set(ELEMENTS.map((e) => e[key])).size, key).toBe(118);
    }
  });

  it("has well-formed required fields with correct types", () => {
    for (const el of ELEMENTS) {
      const ctx = `${el.number} ${el.symbol}`;
      expect(Number.isInteger(el.number), ctx).toBe(true);
      expect(el.symbol, ctx).toMatch(/^[A-Z][a-z]?$/);
      expect(el.name, ctx).toMatch(/^[A-Z][a-z]+$/);
      expect(el.nameZh, ctx).toMatch(/^\p{Script=Han}$/u);
      expect(typeof el.atomicMass, ctx).toBe("number");
      expect(el.atomicMass, ctx).toBeGreaterThan(0);
      expect(["standard", "mass-number"], ctx).toContain(el.atomicMassKind);
      if (el.atomicMassKind === "standard") {
        expect(el.atomicMassUncertainty, ctx).toBeGreaterThan(0);
      } else {
        expect(el.atomicMassUncertainty, ctx).toBeNull();
        expect(Number.isInteger(el.atomicMass), ctx).toBe(true);
      }
      expect(Array.isArray(el.massNumberAlternatives), ctx).toBe(true);
      expect(typeof el.categoryPredicted, ctx).toBe("boolean");
      expect(el.period, ctx).toBeGreaterThanOrEqual(1);
      expect(el.period, ctx).toBeLessThanOrEqual(7);
      if (el.group !== null) {
        expect(Number.isInteger(el.group) && el.group >= 1 && el.group <= 18, ctx).toBe(true);
      }
      expect(["s", "p", "d", "f"], ctx).toContain(el.block);
      expect(el.electronConfiguration, ctx).toMatch(
        /^(\[(He|Ne|Ar|Kr|Xe|Rn)\] )?\d[spdf]\d+( \d[spdf]\d+)*$/,
      );
      expect(typeof el.electronConfigurationPredicted, ctx).toBe("boolean");
      expect(el.shellElectrons.every((n) => Number.isInteger(n) && n >= 0), ctx).toBe(true);
      expect(el.summaryZh.length, ctx).toBeGreaterThan(15);
      expect(Array.isArray(el.notesZh), ctx).toBe(true);
    }
  });

  it("has shell distributions that sum to the atomic number", () => {
    for (const el of ELEMENTS) {
      expect(el.shellElectrons.reduce((a, b) => a + b, 0), el.symbol).toBe(el.number);
    }
  });

  it("uses Traditional Chinese, not Simplified, for names and summaries", () => {
    // Characters that only appear in Simplified Chinese element names / common words.
    // Characters identical in both scripts (e.g. 砷、碘、氡、鿬、鿫) are intentionally excluded.
    const simplified = /[氢锂铍钠镁铝硅钾钙钛钒铬锰铁钴镍铜锌镓锗铷锶钇锆铌钼锝钌铑钯银镉铟锡锑铯钡镧铈镨钕钷钐铕钆铽镝钬铒铥镱镥铪钽钨铼锇铱铂钋砹钫镭锕钍镤铀镎钚镅锔锫锎锿镄钔锘铹𬬻𬭊𬭳𬭛𬭶鿏𫟼𬬭鿔鿭𫓧镆𫟷这们个为说时实电发会级应体图门]/u;
    for (const el of ELEMENTS) {
      expect(el.nameZh + el.summaryZh, el.symbol).not.toMatch(simplified);
    }
  });

  it("has a Zhuyin reading and a same-sound character for every Chinese name", () => {
    for (const el of ELEMENTS) {
      expect(el.nameZhBopomofo, el.symbol).toMatch(/^[ㄅ-ㄩ]{1,3}[ˊˇˋ˙]?$/u);
      expect(el.nameZhHomophone, el.symbol).toMatch(/^\p{Script=Han}$/u);
    }
  });

  it("uses Taiwan (not mainland) readings for representative elements", () => {
    const readings: Record<string, [string, string]> = {
      H: ["ㄑㄧㄥ", "輕"],
      O: ["ㄧㄤˇ", "養"],
      Al: ["ㄌㄩˇ", "呂"],
      Si: ["ㄒㄧˋ", "夕"], // mainland: 硅 guī
      K: ["ㄐㄧㄚˇ", "甲"],
      Co: ["ㄍㄨ", "姑"],
      Pd: ["ㄅㄚ", "巴"],
      U: ["ㄧㄡˋ", "又"],
      Og: ["ㄠˋ", "澳"],
    };
    for (const [symbol, [bopomofo, homophone]] of Object.entries(readings)) {
      expect(bySymbol(symbol).nameZhBopomofo, symbol).toBe(bopomofo);
      expect(bySymbol(symbol).nameZhHomophone, symbol).toBe(homophone);
    }
  });

  it("has a locally served, attributed photo — or a reason why not — for every element", () => {
    const allowed = /^(CC0|Public domain|CC BY(-SA)? \d\.\d( [a-z]{2})?|FAL|Attribution)$/i;
    let photos = 0;
    for (const el of ELEMENTS) {
      if (el.image) {
        photos++;
        expect(el.image.src, el.symbol).toMatch(/^\/images\/elements\/\d+\.(jpg|png)$/);
        expect(existsSync(join("public", el.image.src)), el.symbol).toBe(true);
        expect(el.image.license, el.symbol).toMatch(allowed);
        expect(el.image.author.length, el.symbol).toBeGreaterThan(0);
        expect(el.image.sourceUrl, el.symbol).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
        expect(el.image.captionZh.length, el.symbol).toBeGreaterThan(0);
        expect(el.image.width * el.image.height, el.symbol).toBeGreaterThan(0);
        expect(el.imageNoteZh, el.symbol).toBeNull();
      } else {
        expect(el.imageNoteZh, el.symbol).toBeTruthy();
      }
    }
    // Superheavy elements have only been made a few atoms at a time.
    expect(ELEMENTS.filter((el) => el.number > 100 && el.image)).toHaveLength(0);
    expect(photos).toBeGreaterThanOrEqual(90);
  });

  it("lists every data source with a URL", () => {
    expect(ELEMENT_DATA_META.sources.length).toBeGreaterThanOrEqual(4);
    for (const source of ELEMENT_DATA_META.sources) expect(source.url).toMatch(/^https:\/\//);
  });

  it("is in sync with scripts/build-elements.mjs and its sources", () => {
    expect(() =>
      execFileSync("node", ["scripts/build-elements.mjs", "--check"], { stdio: "pipe" }),
    ).not.toThrow();
  });
});

describe("periodic table positions", () => {
  it("places every element on a unique cell inside the grid", () => {
    const seen = new Set<string>();
    for (const cell of buildLayout(ELEMENTS)) {
      expect(cell.row).toBeGreaterThanOrEqual(1);
      expect(cell.row).toBeLessThanOrEqual(GRID_ROWS);
      expect(cell.column).toBeGreaterThanOrEqual(1);
      expect(cell.column).toBeLessThanOrEqual(GRID_COLUMNS);
      const key = `${cell.row}:${cell.column}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(118 + 2);
  });

  it("places main-table elements by period and group", () => {
    for (const el of ELEMENTS) {
      const inF =
        (el.number >= LANTHANIDE_RANGE.first && el.number <= LANTHANIDE_RANGE.last) ||
        (el.number >= ACTINIDE_RANGE.first && el.number <= ACTINIDE_RANGE.last);
      if (inF) continue;
      expect(getGridPosition(el)).toEqual({ row: el.period, column: el.group });
    }
  });

  it("detaches lanthanides and actinides into two 15-wide rows", () => {
    const rowOf = (n: number) => getGridPosition(ELEMENTS[n - 1]).row;
    const lanthanideRows = new Set(Array.from({ length: 15 }, (_, i) => rowOf(57 + i)));
    const actinideRows = new Set(Array.from({ length: 15 }, (_, i) => rowOf(89 + i)));
    expect(lanthanideRows.size).toBe(1);
    expect(actinideRows.size).toBe(1);
    expect(getGridPosition(bySymbol("La")).column).toBe(getGridPosition(bySymbol("Ac")).column);
    expect(getGridPosition(bySymbol("Lu")).column).toBe(getGridPosition(bySymbol("Lr")).column);
  });

  it("assigns period and block consistently", () => {
    const periodSizes = [2, 8, 8, 18, 18, 32, 32];
    periodSizes.forEach((size, i) => {
      expect(ELEMENTS.filter((e) => e.period === i + 1), `period ${i + 1}`).toHaveLength(size);
    });
    const blockCounts = Object.fromEntries(
      ["s", "p", "d", "f"].map((b) => [b, ELEMENTS.filter((e) => e.block === b).length]),
    );
    // s: groups 1–2 + He; p: groups 13–18 minus He; d: groups 3–12 (incl. Lu/Lr); f: La–Yb, Ac–No.
    expect(blockCounts).toEqual({ s: 14, p: 36, d: 40, f: 28 });
  });
});

describe("categories", () => {
  it("uses only defined category ids", () => {
    for (const el of ELEMENTS) expect(ELEMENT_CATEGORY_IDS, el.symbol).toContain(el.category);
  });

  it("defines label and colour for every category, and every category is used", () => {
    expect(ELEMENT_CATEGORIES.map((c) => c.id).sort()).toEqual([...ELEMENT_CATEGORY_IDS].sort());
    for (const c of ELEMENT_CATEGORIES) {
      expect(c.labelZh.length).toBeGreaterThan(0);
      expect(CATEGORY_COLORS[c.id]).toMatch(/^#[0-9a-f]{6}$/);
      expect(ELEMENTS.some((e) => e.category === c.id), c.id).toBe(true);
    }
    expect(new Set(Object.values(CATEGORY_COLORS)).size).toBe(ELEMENT_CATEGORY_IDS.length);
  });

  it("classifies representative elements correctly", () => {
    const expected: Record<string, string> = {
      H: "nonmetal",
      Na: "alkali-metal",
      Ca: "alkaline-earth-metal",
      Fe: "transition-metal",
      Al: "post-transition-metal",
      Si: "metalloid",
      O: "nonmetal",
      Cl: "halogen",
      Ar: "noble-gas",
      Nd: "lanthanide",
      U: "actinide",
    };
    for (const [symbol, category] of Object.entries(expected)) {
      expect(bySymbol(symbol).category, symbol).toBe(category);
    }
  });

  it("puts all of 57–71 in lanthanides and 89–103 in actinides", () => {
    for (const el of ELEMENTS) {
      if (el.number >= 57 && el.number <= 71) expect(el.category).toBe("lanthanide");
      if (el.number >= 89 && el.number <= 103) expect(el.category).toBe("actinide");
    }
  });
});

describe("representative elements", () => {
  const cases = [
    { symbol: "H", number: 1, nameZh: "氫", shells: [1], period: 1, group: 1 },
    { symbol: "He", number: 2, nameZh: "氦", shells: [2], period: 1, group: 18 },
    { symbol: "C", number: 6, nameZh: "碳", shells: [2, 4], period: 2, group: 14 },
    { symbol: "O", number: 8, nameZh: "氧", shells: [2, 6], period: 2, group: 16 },
    { symbol: "Na", number: 11, nameZh: "鈉", shells: [2, 8, 1], period: 3, group: 1 },
    { symbol: "Cl", number: 17, nameZh: "氯", shells: [2, 8, 7], period: 3, group: 17 },
    { symbol: "Fe", number: 26, nameZh: "鐵", shells: [2, 8, 14, 2], period: 4, group: 8 },
    { symbol: "Cu", number: 29, nameZh: "銅", shells: [2, 8, 18, 1], period: 4, group: 11 },
    { symbol: "Ag", number: 47, nameZh: "銀", shells: [2, 8, 18, 18, 1], period: 5, group: 11 },
    { symbol: "Au", number: 79, nameZh: "金", shells: [2, 8, 18, 32, 18, 1], period: 6, group: 11 },
    { symbol: "U", number: 92, nameZh: "鈾", shells: [2, 8, 18, 32, 21, 9, 2], period: 7, group: null },
    { symbol: "Og", number: 118, nameZh: "鿫", shells: [2, 8, 18, 32, 32, 18, 8], period: 7, group: 18 },
  ];

  it.each(cases)("$symbol", ({ symbol, number, nameZh, shells, period, group }) => {
    const el = bySymbol(symbol);
    expect(el.number).toBe(number);
    expect(el.nameZh).toBe(nameZh);
    expect(el.shellElectrons).toEqual(shells);
    expect(el.period).toBe(period);
    expect(el.group).toBe(group);
  });

  it("has correct electron configurations including known exceptions", () => {
    expect(bySymbol("O").electronConfiguration).toBe("[He] 2s2 2p4");
    expect(bySymbol("Fe").electronConfiguration).toBe("[Ar] 3d6 4s2");
    expect(bySymbol("Cr").electronConfiguration).toBe("[Ar] 3d5 4s1");
    expect(bySymbol("Cu").electronConfiguration).toBe("[Ar] 3d10 4s1");
    expect(bySymbol("Pd").electronConfiguration).toBe("[Kr] 4d10");
  });

  it("uses CIAAW 2024 standard atomic weights and NUBASE2020 mass numbers", () => {
    expect(bySymbol("H").atomicMass).toBe(1.008);
    expect(bySymbol("C").atomicMass).toBe(12.011);
    expect(bySymbol("O").atomicMass).toBe(15.999);
    expect(bySymbol("Zr").atomicMass).toBe(91.222); // revised by CIAAW in 2024
    expect(bySymbol("Pb").atomicMass).toBe(207.2);
    expect(bySymbol("U").atomicMass).toBe(238.03);
    expect(bySymbol("Tc")).toMatchObject({ atomicMass: 97, atomicMassKind: "mass-number" });
    expect(bySymbol("Og")).toMatchObject({ atomicMass: 294, atomicMassKind: "mass-number" });
    // Exactly the elements without a CIAAW standard atomic weight: Tc, Pm, Po–Ac, Np–Og.
    expect(ELEMENTS.filter((e) => e.atomicMassKind === "mass-number")).toHaveLength(34);
  });

  it("flags superheavy predictions", () => {
    expect(bySymbol("Og").categoryPredicted).toBe(true);
    expect(bySymbol("Og").electronConfigurationPredicted).toBe(true);
    expect(bySymbol("Fe").categoryPredicted).toBe(false);
  });
});
