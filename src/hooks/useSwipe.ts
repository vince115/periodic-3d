"use client";

import { useRef, type PointerEvent } from "react";

/** Minimum horizontal travel (px) for a swipe. */
const SWIPE_DISTANCE = 56;
/** Horizontal travel must dominate vertical travel by this factor. */
const SWIPE_DOMINANCE = 1.5;
/** Slower drags are treated as reading/scrolling, not swipes. */
const SWIPE_MAX_MS = 700;

interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

/**
 * Horizontal swipe detection for touch (and pen). Mouse drags are ignored so
 * desktop text selection keeps working. Pair with `touch-action: pan-y` on the
 * element so vertical scrolling stays native while horizontal moves reach us.
 */
export function useSwipe({ onSwipeLeft, onSwipeRight }: SwipeHandlers) {
  const start = useRef<{ id: number; x: number; y: number; t: number } | null>(null);

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, t: event.timeStamp };
  };

  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    const s = start.current;
    start.current = null;
    if (!s || s.id !== event.pointerId) return;
    const dx = event.clientX - s.x;
    const dy = event.clientY - s.y;
    if (event.timeStamp - s.t > SWIPE_MAX_MS) return;
    if (Math.abs(dx) < SWIPE_DISTANCE || Math.abs(dx) < Math.abs(dy) * SWIPE_DOMINANCE) return;
    if (dx < 0) onSwipeLeft?.();
    else onSwipeRight?.();
  };

  const onPointerCancel = () => {
    start.current = null;
  };

  return { onPointerDown, onPointerUp, onPointerCancel };
}
