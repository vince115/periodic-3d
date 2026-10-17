"use client";

import { useMemo } from "react";
import { ELEMENT_CATEGORIES } from "@/data/categories";
import { categoryStyle } from "@/lib/element-colors";
import type { ChemicalElement, ElementCategoryId } from "@/types/element";

interface CategoryLegendProps {
  elements: readonly ChemicalElement[];
  highlighted: ElementCategoryId | null;
  onToggle: (id: ElementCategoryId) => void;
}

export function CategoryLegend({ elements, highlighted, onToggle }: CategoryLegendProps) {
  const counts = useMemo(() => {
    const map = new Map<ElementCategoryId, number>();
    // Counts tag memberships, so the totals can exceed 118 (tags overlap).
    for (const el of elements) {
      for (const tag of el.categoryTags) map.set(tag.id, (map.get(tag.id) ?? 0) + 1);
    }
    return map;
  }, [elements]);

  return (
    <section aria-labelledby="legend-heading">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 id="legend-heading" className="text-xs font-medium tracking-wide text-slate-400">
          元素分類
        </h2>
        <p className="text-xs text-slate-500">顏色為主要分類；點選可標示元素並閱讀分類導讀（分類可重疊）</p>
      </div>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
        {ELEMENT_CATEGORIES.map((category) => (
          <li key={category.id}>
            <button
              type="button"
              className="legend-item"
              style={categoryStyle(category.id)}
              aria-pressed={highlighted === category.id}
              data-active={highlighted === category.id || undefined}
              data-muted={(highlighted !== null && highlighted !== category.id) || undefined}
              title={category.descriptionZh}
              onClick={() => onToggle(category.id)}
            >
              <span aria-hidden className="legend-item__swatch" />
              <span className="min-w-0 flex-1 truncate text-left">{category.labelZh}</span>
              <span className="text-xs tabular-nums text-slate-400">{counts.get(category.id) ?? 0}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
