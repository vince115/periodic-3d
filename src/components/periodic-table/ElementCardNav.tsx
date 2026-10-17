"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ChemicalElement } from "@/types/element";

interface ElementCardNavProps {
  previous: ChemicalElement | null;
  next: ChemicalElement | null;
  /** 1-based position of the current element in the browsing sequence. */
  position: number;
  total: number;
  /** True when the sequence is narrowed by search or a category highlight. */
  filtered: boolean;
  onSelect: (number: number) => void;
}

/** "‹ previous · n / total · next ›" bar above the element card. */
export function ElementCardNav({ previous, next, position, total, filtered, onSelect }: ElementCardNavProps) {
  return (
    <nav className="card-nav" aria-label="切換元素">
      <button
        type="button"
        className="card-nav__btn"
        disabled={!previous}
        onClick={() => previous && onSelect(previous.number)}
        aria-label={previous ? `上一個元素：${previous.number} 號 ${previous.nameZh}` : "沒有上一個元素"}
      >
        <ChevronLeft aria-hidden className="size-5" />
        {previous && (
          <span className="card-nav__label">
            {previous.symbol} <span className="opacity-70">{previous.nameZh}</span>
          </span>
        )}
      </button>
      <span className="card-nav__position" aria-live="polite">
        {position} / {total}
        {filtered && <span className="block text-[10px] opacity-70">篩選中</span>}
      </span>
      <button
        type="button"
        className="card-nav__btn card-nav__btn--next"
        disabled={!next}
        onClick={() => next && onSelect(next.number)}
        aria-label={next ? `下一個元素：${next.number} 號 ${next.nameZh}` : "沒有下一個元素"}
      >
        {next && (
          <span className="card-nav__label">
            <span className="opacity-70">{next.nameZh}</span> {next.symbol}
          </span>
        )}
        <ChevronRight aria-hidden className="size-5" />
      </button>
    </nav>
  );
}
