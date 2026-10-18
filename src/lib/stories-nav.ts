import { ELEMENTS } from "@/data/elements";
import type { ChemicalElement, ElementCategoryId } from "@/types/element";
import { CATEGORY_GUIDES, getElementStory } from "./content";

/**
 * Reading order of the /stories section: the ten category guides first,
 * then every element by atomic number. Each entry is its own page.
 */

export const STORIES_HOME = "/stories";
export const categoryPath = (id: ElementCategoryId) => `/stories/categories/${id}`;
export const elementPath = (number: number) => `/stories/elements/${number}`;

export interface StoryPage {
  href: string;
  kind: "category" | "element";
  /** Full label, e.g. "鹼金屬" or "26 鐵 Fe". */
  label: string;
  /** Whether a written article (guide or science story) exists. */
  hasArticle: boolean;
}

export const STORY_PAGES: readonly StoryPage[] = [
  ...CATEGORY_GUIDES.map((g) => ({
    href: categoryPath(g.id),
    kind: "category" as const,
    label: g.nameZh,
    hasArticle: true,
  })),
  ...ELEMENTS.map((el) => ({
    href: elementPath(el.number),
    kind: "element" as const,
    label: `${el.number} ${el.nameZh} ${el.symbol}`,
    hasArticle: Boolean(getElementStory(el.number)),
  })),
];

const INDEX_BY_HREF = new Map(STORY_PAGES.map((p, i) => [p.href, i]));

export interface StoryPosition {
  index: number;
  total: number;
  previous: StoryPage | null;
  next: StoryPage | null;
}

/** Position of a page in the reading order, or null for pages outside it. */
export function getStoryPosition(href: string): StoryPosition | null {
  const index = INDEX_BY_HREF.get(href);
  if (index === undefined) return null;
  return {
    index,
    total: STORY_PAGES.length,
    previous: STORY_PAGES[index - 1] ?? null,
    next: STORY_PAGES[index + 1] ?? null,
  };
}

/** Elements carrying a category tag (primary or secondary), by atomic number. */
export function elementsInCategory(id: ElementCategoryId): ChemicalElement[] {
  return ELEMENTS.filter((el) => el.categoryTags.some((t) => t.id === id));
}

/** Element index pages on the overview: one page per period. */
export const PERIODS = [1, 2, 3, 4, 5, 6, 7] as const;

export function elementsInPeriod(period: number): ChemicalElement[] {
  return ELEMENTS.filter((el) => el.period === period);
}
