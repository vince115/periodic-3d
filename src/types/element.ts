export const ELEMENT_CATEGORY_IDS = [
  "alkali-metal",
  "alkaline-earth-metal",
  "transition-metal",
  "post-transition-metal",
  "metalloid",
  "nonmetal",
  "halogen",
  "noble-gas",
  "lanthanide",
  "actinide",
] as const;

export type ElementCategoryId = (typeof ELEMENT_CATEGORY_IDS)[number];

export type ElementBlock = "s" | "p" | "d" | "f";

/**
 * How firmly an element belongs to a category:
 * - established: listed by IUPAC (Red Book 2005 IR-3.5) or unambiguous by group/block
 * - convention: common practice without a single authoritative list
 * - disputed: authorities or textbooks disagree (see noteZh)
 * - predicted: superheavy element whose chemistry is mainly theoretical
 */
export type ClassificationStatus = "established" | "convention" | "disputed" | "predicted";

/** Non-exclusive membership of an element in one of the intro categories. */
export interface CategoryTag {
  id: ElementCategoryId;
  /** "primary" is the display category (colour); "secondary" a documented overlap. */
  role: "primary" | "secondary";
  status: ClassificationStatus;
  noteZh: string | null;
}

/** Element families outside the ten intro categories (IUPAC collective names etc.). */
export const ELEMENT_FAMILY_IDS = [
  "pnictogen",
  "chalcogen",
  "rare-earth-metal",
  "platinum-group-metal",
  "transactinide",
] as const;
export type ElementFamilyId = (typeof ELEMENT_FAMILY_IDS)[number];

export type Metallicity = "metal" | "metalloid" | "nonmetal" | "uncertain";

/**
 * - "standard": CIAAW standard atomic weight (abridged), with uncertainty.
 * - "mass-number": no standard atomic weight exists; value is the mass number
 *   of the most stable known isotope (conventionally shown in brackets).
 */
export type AtomicMassKind = "standard" | "mass-number";

/** Photo of the element (Wikimedia Commons), served locally with attribution. */
export interface ElementImage {
  src: string;
  width: number;
  height: number;
  captionZh: string;
  author: string;
  license: string;
  licenseUrl: string | null;
  /** Commons file page (credits, full resolution). */
  sourceUrl: string;
}

export interface ChemicalElement {
  number: number;
  symbol: string;
  name: string;
  nameZh: string;
  /** Taiwan Mandarin reading of nameZh in Zhuyin (注音符號), e.g. "ㄧㄤˇ". */
  nameZhBopomofo: string;
  /** A common character with the same reading (讀音同), e.g. 鋁 → 呂. */
  nameZhHomophone: string;
  atomicMass: number;
  atomicMassUncertainty: number | null;
  atomicMassKind: AtomicMassKind;
  /** Other candidate mass numbers when the most stable isotope is ambiguous. */
  massNumberAlternatives: number[];
  category: ElementCategoryId;
  /** True when the category is a theoretical prediction (superheavy elements). */
  categoryPredicted: boolean;
  period: number;
  /** IUPAC group 1–18, or null for La–Yb and Ac–No (see notesZh). */
  group: number | null;
  block: ElementBlock;
  /** Noble-gas core notation, subshells ordered by n then l, e.g. "[Ar] 3d6 4s2". */
  electronConfiguration: string;
  electronConfigurationPredicted: boolean;
  /** Electrons per shell, K (n = 1) outward. */
  shellElectrons: number[];
  summaryZh: string;
  image: ElementImage | null;
  /** Why there is no photo, when image is null. */
  imageNoteZh: string | null;
  /** Caveats about conventions, predictions or disputed values. */
  notesZh: string[];
  /** One or more intro categories; the first is always the primary (display) one. */
  categoryTags: CategoryTag[];
  familyTags: ElementFamilyId[];
  metallicity: Metallicity;
  /** Why the classification needs a caveat (e.g. hydrogen in group 1). */
  classificationNoteZh: string | null;
  /** Table neighbours (same period, same group / f-block column). */
  relatedElementNumbers: number[];
}

export interface ElementDataSource {
  id: string;
  label: string;
  url: string;
  usedFor: string[];
}

export interface ElementDataset {
  meta: {
    schemaVersion: number;
    description: string;
    sources: ElementDataSource[];
    retrieved: string;
  };
  elements: ChemicalElement[];
}
