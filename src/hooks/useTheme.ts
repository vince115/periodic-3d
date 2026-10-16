"use client";

import { useSyncExternalStore } from "react";
import { getDocumentTheme, type Theme } from "@/lib/theme";

/** The theme lives on <html data-theme>; observe it so every consumer stays in sync. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

/**
 * Current theme for code that cannot use CSS variables (WebGL materials,
 * canvas textures). Server render assumes dark, the CSS default.
 */
export function useTheme(): Theme {
  return useSyncExternalStore<Theme>(subscribe, getDocumentTheme, () => "dark");
}
