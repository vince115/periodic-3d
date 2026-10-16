"use client";

import { useCallback, useMemo, useState } from "react";
import { ELEMENTS, getElementByNumber } from "@/data/elements";
import { searchElements } from "@/lib/element-utils";
import type { ChemicalElement, ElementCategoryId } from "@/types/element";

/**
 * Shared explorer state: selection, search and category highlight.
 * View-agnostic so the phase-2 3D table can consume the same hook.
 */
export function useElements(elements: readonly ChemicalElement[] = ELEMENTS) {
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [highlightedCategory, setHighlightedCategory] = useState<ElementCategoryId | null>(null);

  const results = useMemo(() => searchElements(elements, query), [elements, query]);

  const matchingNumbers = useMemo<ReadonlySet<number> | null>(
    () => (query.trim() ? new Set(results.map((el) => el.number)) : null),
    [query, results],
  );

  const selected = useMemo(
    () => (selectedNumber === null ? null : (getElementByNumber(selectedNumber) ?? null)),
    [selectedNumber],
  );

  const select = useCallback((number: number | null) => setSelectedNumber(number), []);

  const toggleCategory = useCallback(
    (id: ElementCategoryId) => setHighlightedCategory((current) => (current === id ? null : id)),
    [],
  );

  /** Dimmed = filtered out by the active search or category highlight. */
  const isDimmed = useCallback(
    (el: ChemicalElement) =>
      (matchingNumbers !== null && !matchingNumbers.has(el.number)) ||
      (highlightedCategory !== null && el.category !== highlightedCategory),
    [matchingNumbers, highlightedCategory],
  );

  return {
    elements,
    selected,
    select,
    query,
    setQuery,
    results,
    highlightedCategory,
    setHighlightedCategory,
    toggleCategory,
    isDimmed,
  };
}

export type ElementsState = ReturnType<typeof useElements>;
