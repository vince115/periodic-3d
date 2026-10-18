import categoriesFile from "@/content/elementCategories.json";
import referencesFile from "@/content/contentReferences.json";
import storiesFile from "@/content/elementStories.json";
import { getElementByNumber } from "@/data/elements";
import type { ElementCategoryId } from "@/types/element";

/**
 * Science-communication content: category guides and element stories.
 * Elements are referenced by atomic number and categories by id, so basic
 * element data lives only in public/data/elements.json.
 */

/**
 * - pending: written, claims not yet compared with sources
 * - partial: some claims compared with the cited sources, others await checking
 * - source-checked: every factual claim compared with an accessible cited source
 * - expert-reviewed: reviewed by a qualified person (never self-assigned)
 */
export type VerificationStatus = "pending" | "partial" | "source-checked" | "expert-reviewed";

export interface Verification {
  status: VerificationStatus;
  checkedOn: string;
  notesZh: string;
}

export interface ArticleSection {
  heading: string;
  paragraphs: string[];
}

export interface CategoryGuide {
  id: ElementCategoryId;
  nameZh: string;
  nameEn: string;
  definitionZh: string;
  rulesZh: string[];
  exceptionsZh: string[];
  sharedPropertiesZh: string[];
  principleZh: string;
  representativeElements: number[];
  article: { title: string; sections: ArticleSection[]; thinkingQuestionZh: string };
  referenceIds: string[];
  verification: Verification;
  version: string;
}

export interface ElementStory {
  elementNumber: number;
  title: string;
  openingZh: string;
  sections: ArticleSection[];
  thinkingQuestionZh: string;
  categoryIds: ElementCategoryId[];
  furtherReadingElementNumbers: number[];
  referenceIds: string[];
  verification: Verification;
  version: string;
}

export interface Reference {
  id: string;
  kind: "standard" | "database" | "journal" | "book" | "web";
  citation: string;
  url: string;
  /** Date the text was read and compared; null = cited but not accessed. */
  accessed: string | null;
}

export const VERIFICATION_LABELS: Record<VerificationStatus, string> = {
  pending: "待查核",
  partial: "部分查核",
  "source-checked": "已對照來源",
  "expert-reviewed": "專家審閱",
};

export const CATEGORY_GUIDES = categoriesFile.categories as CategoryGuide[];
export const ELEMENT_STORIES = storiesFile.stories as ElementStory[];
const BIBLIOGRAPHY = referencesFile.references as Record<string, Omit<Reference, "id">>;

/** Dates each element's PubChem record was read, by atomic number (oldest first). */
const PUBCHEM_READ_ON = new Map<number, string[]>();
for (const [date, numbers] of Object.entries(referencesFile.elementPagesRead as Record<string, number[]>).sort()) {
  for (const n of numbers) PUBCHEM_READ_ON.set(n, [...(PUBCHEM_READ_ON.get(n) ?? []), date]);
}

const GUIDES_BY_ID = new Map(CATEGORY_GUIDES.map((g) => [g.id, g]));
const STORIES_BY_NUMBER = new Map(ELEMENT_STORIES.map((s) => [s.elementNumber, s]));

export function getCategoryGuide(id: ElementCategoryId): CategoryGuide | undefined {
  return GUIDES_BY_ID.get(id);
}

export function getElementStory(number: number): ElementStory | undefined {
  return STORIES_BY_NUMBER.get(number);
}

/** Retrieval date of the CIAAW element pages cited by the first batch. */
const CIAAW_PAGES_ACCESSED = "2026-10-16";

/**
 * Resolves a reference id. Besides bibliography ids, two families are
 * generated: "pubchem-element:<Z>[@<date read>]" (PubChem element page, which carries the
 * Los Alamos National Laboratory and Jefferson Lab texts) and
 * "ciaaw:<english-name>" (CIAAW element page).
 */
export function resolveReference(id: string): Reference {
  const entry = BIBLIOGRAPHY[id];
  if (entry) return { id, ...entry };

  // "pubchem-element:<Z>" or, when the page was read more than once, "pubchem-element:<Z>@<date>".
  const pubchem = id.match(/^pubchem-element:(\d+)(?:@(\d{4}-\d{2}-\d{2}))?$/);
  if (pubchem) {
    const element = getElementByNumber(Number(pubchem[1]));
    if (!element) throw new Error(`Unknown element in reference ${id}`);
    const reads = PUBCHEM_READ_ON.get(element.number) ?? [];
    const accessed = pubchem[2] ?? (reads.length === 1 ? reads[0] : undefined);
    if (!accessed || !reads.includes(accessed)) {
      throw new Error(
        reads.length > 1 && !pubchem[2]
          ? `${id} was read on ${reads.join(", ")}; cite it as ${id}@<date>`
          : `${id} is cited but not recorded as read (contentReferences.json → elementPagesRead)`,
      );
    }
    return {
      id,
      kind: "database",
      citation: `PubChem Element: ${element.name}（收錄 Los Alamos National Laboratory、Jefferson Lab 與 CIAAW 的元素資料）`,
      url: `https://pubchem.ncbi.nlm.nih.gov/element/${element.number}`,
      accessed,
    };
  }

  const ciaaw = id.match(/^ciaaw:([a-z]+)$/);
  if (ciaaw) {
    const name = ciaaw[1];
    return {
      id,
      kind: "standard",
      citation: `IUPAC Commission on Isotopic Abundances and Atomic Weights (CIAAW): ${name[0].toUpperCase()}${name.slice(1)}`,
      url: `https://www.ciaaw.org/${name}.htm`,
      accessed: CIAAW_PAGES_ACCESSED,
    };
  }

  throw new Error(`Unknown reference id: ${id}`);
}
