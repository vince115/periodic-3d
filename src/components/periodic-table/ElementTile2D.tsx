"use client";

import type { FocusEventHandler, KeyboardEventHandler, Ref } from "react";
import { getCategory } from "@/data/categories";
import { categoryStyle } from "@/lib/element-colors";
import type { ChemicalElement } from "@/types/element";

interface ElementTile2DProps {
  ref?: Ref<HTMLButtonElement>;
  element: ChemicalElement;
  row: number;
  column: number;
  isSelected: boolean;
  isDimmed: boolean;
  tabIndex: 0 | -1;
  onSelect: (number: number) => void;
  onFocus?: FocusEventHandler<HTMLButtonElement>;
  onKeyDown?: KeyboardEventHandler<HTMLButtonElement>;
}

export function ElementTile2D({
  ref,
  element,
  row,
  column,
  isSelected,
  isDimmed,
  tabIndex,
  onSelect,
  onFocus,
  onKeyDown,
}: ElementTile2DProps) {
  const category = getCategory(element.category);
  return (
    <button
      ref={ref}
      type="button"
      className="element-tile"
      style={{ ...categoryStyle(element.category), gridRow: row, gridColumn: column }}
      data-selected={isSelected || undefined}
      data-dimmed={isDimmed || undefined}
      aria-pressed={isSelected}
      aria-label={`${element.number} 號元素 ${element.nameZh}（${element.name}，${element.symbol}），${category.labelZh}`}
      title={`${element.nameZh} ${element.name} · ${category.labelZh}`}
      tabIndex={tabIndex}
      onClick={() => onSelect(element.number)}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
    >
      <span className="element-tile__number">{element.number}</span>
      <span className="element-tile__symbol">{element.symbol}</span>
      <span className="element-tile__name">{element.nameZh}</span>
    </button>
  );
}
