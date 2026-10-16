"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type RefObject,
} from "react";

export interface Point {
  x: number;
  y: number;
}

const KEY_STEP = 16;
const KEY_STEP_LARGE = 64;
/** Pointer travel before a press on the handle counts as a drag (not a click). */
const DRAG_THRESHOLD = 4;
/** Keep at least this much of the panel (its handle) on screen vertically. */
const MIN_VISIBLE_HEIGHT = 56;

function clampToViewport(p: Point, width: number, minTop: number): Point {
  const maxX = Math.max(0, window.innerWidth - width);
  const maxY = Math.max(minTop, window.innerHeight - MIN_VISIBLE_HEIGHT);
  return {
    x: Math.round(Math.min(Math.max(p.x, 0), maxX)),
    y: Math.round(Math.min(Math.max(p.y, minTop), maxY)),
  };
}

/**
 * Lets a docked panel be torn off and moved freely. While docked, `position`
 * is null and the panel sits in the layout; the first drag (pointer beyond a
 * small threshold, or an arrow key on the handle) undocks it at its current
 * on-screen spot, and from then on `position` is its fixed viewport position.
 * `reset()` docks it again.
 */
export function useDraggable(
  target: RefObject<HTMLElement | null>,
  enabled: boolean,
  /** Lowest allowed top edge in px, e.g. to stay clear of a fixed navbar. */
  minTop = 0,
) {
  const [position, setPosition] = useState<Point | null>(null);
  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    from: Point;
    width: number;
    moved: boolean;
  } | null>(null);

  const currentBox = useCallback((): { from: Point; width: number } | null => {
    const rect = target.current?.getBoundingClientRect();
    if (!rect) return null;
    return { from: position ?? { x: rect.left, y: rect.top }, width: rect.width };
  }, [target, position]);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.button !== 0) return;
    // Let buttons inside the handle (e.g. reset) receive their own clicks.
    if ((event.target as HTMLElement).closest("[data-no-drag]")) return;
    const box = currentBox();
    if (!box) return;
    // No preventDefault: it would stop the grip button from taking focus on
    // click (breaking arrow-key moves). Text selection and touch scrolling are
    // already disabled on the handle via CSS (user-select / touch-action).
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      ...box,
      moved: false,
    };
  };

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    state.moved = true;
    setPosition(
      clampToViewport({ x: state.from.x + dx, y: state.from.y + dy }, state.width, minTop),
    );
  };

  const endDrag = (event: PointerEvent<HTMLElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!enabled) return;
    const step = event.shiftKey ? KEY_STEP_LARGE : KEY_STEP;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const d = delta[event.key];
    const box = d && currentBox();
    if (!box) return;
    event.preventDefault();
    setPosition(clampToViewport({ x: box.from.x + d.x, y: box.from.y + d.y }, box.width, minTop));
  };

  // Keep a floating panel reachable when the window shrinks.
  useEffect(() => {
    if (position === null) return;
    const onResize = () => {
      const width = target.current?.getBoundingClientRect().width ?? 0;
      setPosition((p) => (p ? clampToViewport(p, width, minTop) : p));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [position, target, minTop]);

  const reset = useCallback(() => setPosition(null), []);

  // Narrow screens always use the docked, in-flow layout.
  const floating = enabled && position !== null;

  return {
    floating,
    position: floating ? position : null,
    enabled,
    reset,
    handleProps: { onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag },
    onHandleKeyDown: onKeyDown,
  };
}

export type DraggableState = ReturnType<typeof useDraggable>;
