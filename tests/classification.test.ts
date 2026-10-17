import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/data/elements";
import { ELEMENT_CATEGORY_IDS, ELEMENT_FAMILY_IDS } from "@/types/element";

const bySymbol = (symbol: string) => ELEMENTS.find((e) => e.symbol === symbol)!;
const tagged = (id: string) =>
  ELEMENTS.filter((e) => e.categoryTags.some((t) => t.id === id)).map((e) => e.symbol);
const range = (from: number, to: number) => ELEMENTS.slice(from - 1, to).map((e) => e.symbol);

describe("category tags", () => {
  it("cover all 118 elements; the first tag is the primary display category", () => {
    for (const el of ELEMENTS) {
      expect(el.categoryTags.length, el.symbol).toBeGreaterThanOrEqual(1);
      expect(el.categoryTags[0], el.symbol).toMatchObject({ id: el.category, role: "primary" });
      expect(el.categoryTags.slice(1).every((t) => t.role === "secondary"), el.symbol).toBe(true);
      expect(new Set(el.categoryTags.map((t) => t.id)).size, el.symbol).toBe(el.categoryTags.length);
      for (const t of el.categoryTags) {
        expect(ELEMENT_CATEGORY_IDS, el.symbol).toContain(t.id);
        expect(["established", "convention", "disputed", "predicted"], el.symbol).toContain(t.status);
        if (t.status === "disputed" || t.role === "secondary") expect(t.noteZh, el.symbol).toBeTruthy();
      }
    }
  });

  it("matches the IUPAC collective names (Red Book 2005, IR-3.5)", () => {
    expect(tagged("alkali-metal")).toEqual(["Li", "Na", "K", "Rb", "Cs", "Fr"]);
    expect(tagged("alkaline-earth-metal")).toEqual(["Be", "Mg", "Ca", "Sr", "Ba", "Ra"]);
    // IUPAC lists F–At; tennessine joins by group, flagged as predicted.
    expect(tagged("halogen")).toEqual(["F", "Cl", "Br", "I", "At", "Ts"]);
    expect(tagged("noble-gas")).toEqual(["He", "Ne", "Ar", "Kr", "Xe", "Rn", "Og"]);
    expect(tagged("lanthanide")).toEqual(range(57, 71));
    expect(tagged("actinide")).toEqual(range(89, 103));
    expect(bySymbol("Ts").categoryTags[0].status).toBe("predicted");
    expect(bySymbol("Og").categoryTags[0].status).toBe("predicted");
  });

  it("never treats hydrogen as an alkali metal", () => {
    expect(bySymbol("H").categoryTags.map((t) => t.id)).toEqual(["nonmetal"]);
    expect(bySymbol("H").classificationNoteZh).toMatch(/鹼金屬/);
  });

  it("tags groups 3–12 as transition metals, with group 12 disputed", () => {
    const transition = tagged("transition-metal");
    for (const el of ELEMENTS.filter((e) => e.group !== null && e.group >= 3 && e.group <= 12)) {
      expect(transition, el.symbol).toContain(el.symbol);
    }
    for (const symbol of ["Zn", "Cd", "Hg"]) {
      expect(bySymbol(symbol).categoryTags[0].status, symbol).toBe("disputed");
    }
  });

  it("gives Lu and Lr both their f-block series and a group-3 transition tag", () => {
    for (const [symbol, series] of [["Lu", "lanthanide"], ["Lr", "actinide"]] as const) {
      const tags = bySymbol(symbol).categoryTags;
      expect(tags.map((t) => t.id), symbol).toEqual([series, "transition-metal"]);
      expect(tags[1].status, symbol).toBe("convention");
    }
  });

  it("marks superheavy classifications (Z ≥ 109) as predicted", () => {
    for (const el of ELEMENTS.filter((e) => e.number >= 109)) {
      expect(el.categoryTags[0].status, el.symbol).toBe("predicted");
      expect(el.metallicity, el.symbol).toBe("uncertain");
    }
  });

  it("every intro category has members", () => {
    for (const id of ELEMENT_CATEGORY_IDS) expect(tagged(id).length, id).toBeGreaterThan(0);
  });
});

describe("families and metallicity", () => {
  const family = (id: string) => ELEMENTS.filter((e) => e.familyTags.includes(id as never)).map((e) => e.symbol);

  it("matches IUPAC pnictogens, chalcogens and rare earth metals", () => {
    expect(family("pnictogen")).toEqual(["N", "P", "As", "Sb", "Bi", "Mc"]);
    expect(family("chalcogen")).toEqual(["O", "S", "Se", "Te", "Po", "Lv"]);
    expect(family("rare-earth-metal")).toEqual(["Sc", "Y", ...range(57, 71)]);
    expect(family("transactinide")).toEqual(range(104, 118));
    for (const el of ELEMENTS) for (const f of el.familyTags) expect(ELEMENT_FAMILY_IDS).toContain(f);
  });

  it("derives metallicity from the category, with documented uncertain cases", () => {
    expect(bySymbol("Fe").metallicity).toBe("metal");
    expect(bySymbol("Si").metallicity).toBe("metalloid");
    expect(bySymbol("Cl").metallicity).toBe("nonmetal");
    expect(bySymbol("Po").metallicity).toBe("uncertain");
    expect(bySymbol("At").metallicity).toBe("uncertain");
  });
});

describe("related elements", () => {
  it("are valid table neighbours and symmetric", () => {
    for (const el of ELEMENTS) {
      expect(el.relatedElementNumbers.length, el.symbol).toBeGreaterThan(0);
      expect(el.relatedElementNumbers, el.symbol).not.toContain(el.number);
      for (const n of el.relatedElementNumbers) {
        expect(ELEMENTS[n - 1].relatedElementNumbers, `${el.symbol}→${n}`).toContain(el.number);
      }
    }
    expect(bySymbol("Fe").relatedElementNumbers).toEqual([25, 27, 44]);
    expect(bySymbol("U").relatedElementNumbers).toEqual([60, 91, 93]); // Nd sits above U in the f-block rows
  });
});
