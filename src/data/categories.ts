import { ELEMENT_CATEGORY_IDS, type ElementCategoryId } from "@/types/element";

export interface ElementCategory {
  id: ElementCategoryId;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
}

/** Display order follows the conventional reading order of the table. */
export const ELEMENT_CATEGORIES: readonly ElementCategory[] = [
  {
    id: "alkali-metal",
    labelZh: "鹼金屬",
    labelEn: "Alkali metal",
    descriptionZh: "第 1 族（氫除外），價電子僅一個，化學性質非常活潑。",
  },
  {
    id: "alkaline-earth-metal",
    labelZh: "鹼土金屬",
    labelEn: "Alkaline earth metal",
    descriptionZh: "第 2 族，具兩個價電子，活性次於鹼金屬。",
  },
  {
    id: "transition-metal",
    labelZh: "過渡金屬",
    labelEn: "Transition metal",
    descriptionZh: "第 3–12 族的 d 區金屬，常具多種氧化態與有色化合物。",
  },
  {
    id: "post-transition-metal",
    labelZh: "其他金屬",
    labelEn: "Post-transition metal",
    descriptionZh: "位於過渡金屬右側的 p 區金屬，質地通常較軟、熔點較低。",
  },
  {
    id: "metalloid",
    labelZh: "類金屬",
    labelEn: "Metalloid",
    descriptionZh: "性質介於金屬與非金屬之間，許多是半導體材料。",
  },
  {
    id: "nonmetal",
    labelZh: "其他非金屬",
    labelEn: "Nonmetal",
    descriptionZh: "不屬於鹵素與稀有氣體的非金屬元素，例如氫、碳、氮、氧。",
  },
  {
    id: "halogen",
    labelZh: "鹵素",
    labelEn: "Halogen",
    descriptionZh: "第 17 族，易獲得一個電子形成負離子，反應性強。",
  },
  {
    id: "noble-gas",
    labelZh: "稀有氣體",
    labelEn: "Noble gas",
    descriptionZh: "第 18 族，價殼層填滿，化學性質極不活潑。",
  },
  {
    id: "lanthanide",
    labelZh: "鑭系",
    labelEn: "Lanthanide",
    descriptionZh: "原子序 57–71，逐步填入 4f 軌域，多為稀土金屬。",
  },
  {
    id: "actinide",
    labelZh: "錒系",
    labelEn: "Actinide",
    descriptionZh: "原子序 89–103，逐步填入 5f 軌域，全部具放射性。",
  },
];

const BY_ID = new Map(ELEMENT_CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: ElementCategoryId): ElementCategory {
  const category = BY_ID.get(id);
  if (!category) throw new Error(`Unknown element category: ${id}`);
  return category;
}

export function isElementCategoryId(value: unknown): value is ElementCategoryId {
  return typeof value === "string" && (ELEMENT_CATEGORY_IDS as readonly string[]).includes(value);
}
