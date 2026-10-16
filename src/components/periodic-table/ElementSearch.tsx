"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { getCategory } from "@/data/categories";
import { categoryStyle } from "@/lib/element-colors";
import type { ChemicalElement } from "@/types/element";

interface ElementSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  results: readonly ChemicalElement[];
  onSelect: (number: number) => void;
}

const MAX_VISIBLE_RESULTS = 8;

export function ElementSearch({ query, onQueryChange, results, onSelect }: ElementSearchProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const visible = results.slice(0, MAX_VISIBLE_RESULTS);
  const hasQuery = query.trim().length > 0;
  const expanded = open && hasQuery;
  const active = expanded ? visible[Math.min(activeIndex, visible.length - 1)] : undefined;

  const choose = (el: ChemicalElement) => {
    onSelect(el.number);
    setOpen(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setOpen(true);
        setActiveIndex((i) => (visible.length ? (i + 1) % visible.length : 0));
        break;
      case "ArrowUp":
        event.preventDefault();
        setOpen(true);
        setActiveIndex((i) => (visible.length ? (i - 1 + visible.length) % visible.length : 0));
        break;
      case "Enter":
        if (active) {
          event.preventDefault();
          choose(active);
        }
        break;
      case "Escape":
        if (expanded) setOpen(false);
        else onQueryChange("");
        break;
    }
  };

  return (
    <div className="relative w-full">
      <label htmlFor={`${listId}-input`} className="sr-only">
        搜尋元素
      </label>
      <div className="search-field">
        <Search aria-hidden className="size-4 shrink-0 text-slate-400" />
        <input
          id={`${listId}-input`}
          type="search"
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active ? `${listId}-${active.number}` : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder="搜尋名稱、符號或原子序，例如：氧、Oxygen、O、8"
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={handleKeyDown}
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500 [&::-webkit-search-cancel-button]:hidden"
        />
        {hasQuery && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            className="icon-button"
            aria-label="清除搜尋"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {hasQuery ? `找到 ${results.length} 個元素` : ""}
      </p>

      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label="搜尋結果"
          className="search-results"
          // Keep focus in the input while clicking a result.
          onMouseDown={(e) => e.preventDefault()}
        >
          {visible.length === 0 ? (
            <li className="px-3 py-3 text-sm text-slate-400">找不到符合「{query.trim()}」的元素</li>
          ) : (
            visible.map((el, index) => (
              <li
                key={el.number}
                id={`${listId}-${el.number}`}
                role="option"
                aria-selected={el === active}
                data-active={el === active || undefined}
                className="search-result"
                style={categoryStyle(el.category)}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(el)}
              >
                <span className="search-result__symbol">{el.symbol}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-100">
                    {el.nameZh} <span className="text-slate-400">{el.name}</span>
                  </span>
                  <span className="block text-xs text-slate-400">
                    原子序 {el.number} · {getCategory(el.category).labelZh}
                  </span>
                </span>
              </li>
            ))
          )}
          {results.length > visible.length && (
            <li className="border-t border-white/5 px-3 py-2 text-xs text-slate-500" aria-hidden>
              另有 {results.length - visible.length} 筆結果，已在週期表中標示
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
