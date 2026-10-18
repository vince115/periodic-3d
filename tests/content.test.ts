import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/data/elements";
import {
  CATEGORY_GUIDES,
  ELEMENT_STORIES,
  resolveReference,
  type ArticleSection,
} from "@/lib/content";
import { ELEMENT_CATEGORY_IDS } from "@/types/element";
import referencesFile from "@/content/contentReferences.json";

const bodyLength = (sections: ArticleSection[]) => sections.flatMap((s) => s.paragraphs).join("").length;
// Simplified-only forms (characters shared by both scripts, e.g. 氧 碳 汞, are excluded).
const SIMPLIFIED = /[们这个为说时实电发会级应体图门氢锂钠镁铝硅钾钙铁铜锌银钯铂锡铅]/u; // language-guard: allow (detection pattern)
const STATUSES = ["pending", "partial", "source-checked", "expert-reviewed"];

describe("category guides (elementCategories.json)", () => {
  it("cover each of the ten intro categories exactly once", () => {
    expect(CATEGORY_GUIDES.map((g) => g.id).sort()).toEqual([...ELEMENT_CATEGORY_IDS].sort());
  });

  it("have every required part, in Traditional Chinese, of roughly 500–800 characters", () => {
    for (const g of CATEGORY_GUIDES) {
      for (const field of [g.nameZh, g.nameEn, g.definitionZh, g.principleZh, g.article.title, g.article.thinkingQuestionZh]) {
        expect(field.length, g.id).toBeGreaterThan(0);
      }
      expect(g.rulesZh.length, g.id).toBeGreaterThan(0);
      expect(g.sharedPropertiesZh.length, g.id).toBeGreaterThan(0);
      const total = bodyLength(g.article.sections) + g.article.thinkingQuestionZh.length;
      expect(total, g.id).toBeGreaterThanOrEqual(480);
      expect(total, g.id).toBeLessThanOrEqual(900);
      expect(JSON.stringify(g), g.id).not.toMatch(SIMPLIFIED);
    }
  });

  it("list representative elements that actually carry the category tag", () => {
    for (const g of CATEGORY_GUIDES) {
      for (const n of g.representativeElements) {
        expect(ELEMENTS[n - 1].categoryTags.map((t) => t.id), `${g.id} → ${n}`).toContain(g.id);
      }
    }
  });
});

describe("element stories (elementStories.json)", () => {
  it("cover all 118 elements, once each, in atomic-number order", () => {
    expect(ELEMENT_STORIES.map((s) => s.elementNumber)).toEqual(ELEMENTS.map((el) => el.number));
  });

  it("are 200–450 characters with a question, links and no duplicated element data", () => {
    for (const s of ELEMENT_STORIES) {
      const length = s.openingZh.length + bodyLength(s.sections);
      expect(length, s.title).toBeGreaterThanOrEqual(200);
      expect(length, s.title).toBeLessThanOrEqual(450);
      expect(s.thinkingQuestionZh.length, s.title).toBeGreaterThan(10);
      expect(Object.keys(s), s.title).not.toEqual(expect.arrayContaining(["symbol", "atomicMass", "nameZh"]));
      expect(JSON.stringify(s), s.title).not.toMatch(SIMPLIFIED);
    }
  });

  it("link only to categories the element belongs to and to other existing elements", () => {
    for (const s of ELEMENT_STORIES) {
      const tags = ELEMENTS[s.elementNumber - 1].categoryTags.map((t) => t.id);
      for (const id of s.categoryIds) expect(tags, s.title).toContain(id);
      for (const n of s.furtherReadingElementNumbers) {
        expect(n, s.title).not.toBe(s.elementNumber);
        expect(ELEMENTS[n - 1], s.title).toBeDefined();
      }
    }
  });
});

describe("sources and verification", () => {
  const all = [
    ...CATEGORY_GUIDES.map((g) => ({ name: g.id, refs: g.referenceIds, v: g.verification })),
    ...ELEMENT_STORIES.map((s) => ({ name: s.title, refs: s.referenceIds, v: s.verification })),
  ];

  it("every reference resolves to a citation with a URL", () => {
    for (const { name, refs } of all) {
      expect(refs.length, name).toBeGreaterThan(0);
      for (const id of refs) {
        const ref = resolveReference(id);
        expect(ref.citation.length, `${name}: ${id}`).toBeGreaterThan(0);
        expect(ref.url, `${name}: ${id}`).toMatch(/^https:\/\//);
      }
    }
    expect(() => resolveReference("made-up-source")).toThrow();
    // Element pages must be recorded as read before they can be cited.
    const read = new Set(Object.values(referencesFile.elementPagesRead).flat());
    const unread = ELEMENTS.find((el) => !read.has(el.number));
    if (unread) expect(() => resolveReference(`pubchem-element:${unread.number}`)).toThrow(/not recorded as read/);
    // A page read on several dates must say which reading the claims were checked against.
    expect(() => resolveReference("pubchem-element:2")).toThrow(/cite it as/);
    expect(resolveReference("pubchem-element:2@2026-10-18").accessed).toBe("2026-10-18");
    expect(() => resolveReference("pubchem-element:2@2026-10-17")).toThrow(/not recorded as read/);
  });

  it("records an honest status: never self-assigned expert review, and 'source-checked' only when every source was read", () => {
    for (const { name, refs, v } of all) {
      expect(STATUSES, name).toContain(v.status);
      expect(v.status, name).not.toBe("expert-reviewed");
      expect(v.notesZh.length, name).toBeGreaterThan(10);
      if (v.status === "source-checked") {
        for (const id of refs) {
          const accessed = resolveReference(id).accessed;
          expect(accessed, `${name}: ${id}`).not.toBeNull();
          // A source cannot have been compared before it was read.
          expect(accessed! <= v.checkedOn, `${name}: ${id}`).toBe(true);
        }
      }
    }
  });
});
