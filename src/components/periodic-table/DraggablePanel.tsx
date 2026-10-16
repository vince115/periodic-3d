"use client";

import type { ReactNode, Ref } from "react";
import { GripHorizontal, Undo2, X } from "lucide-react";
import type { DraggableState } from "@/hooks/useDraggable";

interface DraggablePanelProps {
  title: string;
  panelRef: Ref<HTMLDivElement>;
  drag: DraggableState;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Presentational shell for the details panel. Docked in the layout by
 * default; once dragged it floats (position: fixed) and the page gives its
 * column back to the table. State lives in useDraggable, owned by the page.
 */
export function DraggablePanel({ title, panelRef, drag, onClose, children }: DraggablePanelProps) {
  const { floating, position, enabled, reset, handleProps, onHandleKeyDown } = drag;

  return (
    <div
      ref={panelRef}
      className="floating-panel"
      data-floating={floating || undefined}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {enabled && (
        <div className="panel-handle" {...handleProps}>
          <button
            type="button"
            className="panel-handle__grip"
            aria-label={`移動${title}面板：拖曳或使用方向鍵，按住 Shift 可移動較大距離；移出後週期表會放大`}
            title="拖曳以移出面板，週期表將放大至滿版"
            onKeyDown={onHandleKeyDown}
          >
            <GripHorizontal aria-hidden className="size-4" />
            <span>{title}</span>
          </button>
          <span className="flex items-center gap-1">
            {floating && (
              <button
                type="button"
                data-no-drag
                className="panel-handle__reset"
                onClick={reset}
                title="放回原位"
              >
                <Undo2 aria-hidden className="size-3.5" />
                放回原位
              </button>
            )}
            <button
              type="button"
              data-no-drag
              className="icon-button"
              onClick={onClose}
              aria-label={`關閉${title}`}
              title="關閉（點選任一元素即可重新開啟）"
            >
              <X aria-hidden className="size-4" />
            </button>
          </span>
        </div>
      )}
      {children}
    </div>
  );
}
