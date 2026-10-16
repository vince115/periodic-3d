"use client";

import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { categoryStyle } from "@/lib/element-colors";
import {
  ACTINIDE_ROW,
  GRID_COLUMNS,
  LANTHANIDE_ROW,
  MAIN_ROWS,
  buildLayout,
  findNeighbor,
  type ArrowDirection,
  type ElementCell,
} from "@/lib/element-layout";
import type { ChemicalElement } from "@/types/element";
import { ElementTile2D } from "./ElementTile2D";

interface PeriodicTable2DProps {
  elements: readonly ChemicalElement[];
  selectedNumber: number | null;
  onSelect: (number: number | null) => void;
  isDimmed: (element: ChemicalElement) => boolean;
}

const ARROW_KEYS: Record<string, ArrowDirection> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/** One leading row for group numbers and one leading column for period labels. */
const HEADER_OFFSET = 1;

export function PeriodicTable2D({
  elements,
  selectedNumber,
  onSelect,
  isDimmed,
}: PeriodicTable2DProps) {
  const layout = useMemo(() => buildLayout(elements), [elements]);
  const elementCells = useMemo(
    () => layout.filter((c): c is ElementCell => c.kind === "element"),
    [layout],
  );
  const placeholders = useMemo(
    () => layout.filter((c) => c.kind === "series-placeholder"),
    [layout],
  );

  // Roving tabindex: exactly one tile is reachable with Tab.
  const [focusNumber, setFocusNumber] = useState<number>(elementCells[0]?.element.number ?? 1);
  const rovingNumber = selectedNumber ?? focusNumber;
  const tileRefs = useRef(new Map<number, HTMLButtonElement>());

  const focusElement = useCallback((number: number) => {
    setFocusNumber(number);
    tileRefs.current.get(number)?.focus();
  }, []);

  const handleKeyDown = useCallback(
    (cell: ElementCell) => (event: KeyboardEvent<HTMLButtonElement>) => {
      const direction = ARROW_KEYS[event.key];
      if (direction) {
        event.preventDefault();
        const next = findNeighbor(elementCells, cell, direction);
        if (next) focusElement(next.element.number);
        return;
      }
      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        const row = elementCells
          .filter((c) => c.row === cell.row)
          .sort((a, b) => a.column - b.column);
        const target = event.key === "Home" ? row[0] : row[row.length - 1];
        if (target) focusElement(target.element.number);
        return;
      }
      if (event.key === "Escape" && selectedNumber !== null) {
        event.preventDefault();
        onSelect(null);
      }
    },
    [elementCells, focusElement, onSelect, selectedNumber],
  );

  return (
    <div className="table-scroll" tabIndex={-1}>
      {/* Size container: every tile metric is in cqi, so the table scales as one unit. */}
      <div className="table-scaler">
        <div
          role="group"
          aria-label="元素週期表，可使用方向鍵移動，Enter 或空白鍵選取，Esc 取消選取"
          className="periodic-grid"
          style={{
            gridTemplateColumns: `var(--label-size) repeat(${GRID_COLUMNS}, minmax(0, 1fr))`,
            gridTemplateRows: `auto repeat(${MAIN_ROWS}, auto) var(--series-gap) auto auto`,
          }}
        >
          {Array.from({ length: GRID_COLUMNS }, (_, i) => (
            <span
              key={`group-${i + 1}`}
              aria-hidden
              className="grid-axis-label"
              style={{ gridRow: 1, gridColumn: i + 1 + HEADER_OFFSET }}
            >
              {i + 1}
            </span>
          ))}
          {Array.from({ length: MAIN_ROWS }, (_, i) => (
            <span
              key={`period-${i + 1}`}
              aria-hidden
              className="grid-axis-label"
              style={{ gridRow: i + 1 + HEADER_OFFSET, gridColumn: 1 }}
            >
              {i + 1}
            </span>
          ))}

          {elementCells.map((cell) => {
            const { element } = cell;
            return (
              <ElementTile2D
                key={element.number}
                ref={(node) => {
                  if (node) tileRefs.current.set(element.number, node);
                  else tileRefs.current.delete(element.number);
                }}
                element={element}
                row={cell.row + HEADER_OFFSET}
                column={cell.column + HEADER_OFFSET}
                isSelected={element.number === selectedNumber}
                isDimmed={isDimmed(element)}
                tabIndex={element.number === rovingNumber ? 0 : -1}
                onSelect={onSelect}
                onFocus={() => setFocusNumber(element.number)}
                onKeyDown={handleKeyDown(cell)}
              />
            );
          })}

          {placeholders.map((cell) => (
            <div
              key={cell.label}
              aria-hidden
              className="series-placeholder"
              style={{
                ...categoryStyle(cell.series),
                gridRow: cell.row + HEADER_OFFSET,
                gridColumn: cell.column + HEADER_OFFSET,
              }}
            >
              <span className="series-placeholder__range">{cell.label}</span>
              <span className="series-placeholder__label">{cell.labelZh}</span>
            </div>
          ))}

          {[
            { row: LANTHANIDE_ROW, label: "鑭系", series: "lanthanide" as const },
            { row: ACTINIDE_ROW, label: "錒系", series: "actinide" as const },
          ].map(({ row, label, series }) => (
            <span
              key={series}
              className="series-row-label"
              style={{ ...categoryStyle(series), gridRow: row + HEADER_OFFSET, gridColumn: "1 / span 3" }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
