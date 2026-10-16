export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "periodic-3d-theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";

/**
 * Runs in <head> before first paint so the page never flashes the wrong
 * theme: the saved choice wins, otherwise the OS preference. Kept as a string
 * because it executes before React hydrates.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){var d=document.documentElement,t;try{t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)})}catch(e){}if(t!=="light"&&t!=="dark"){t=window.matchMedia(${JSON.stringify(
  LIGHT_QUERY,
)}).matches?"light":"dark"}d.dataset.theme=t})();`;

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}

export function getDocumentTheme(): Theme {
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

/** The user's explicit choice, or null when following the OS. */
export function readStoredTheme(): Theme | null {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null; // storage blocked (private mode, sandboxed iframe…)
  }
}

export function storeTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Not persisted; the toggle still works for this page view.
  }
}

export function systemTheme(): Theme {
  return window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
}

export const SYSTEM_THEME_QUERY = LIGHT_QUERY;
