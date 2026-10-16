"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import {
  SYSTEM_THEME_QUERY,
  applyTheme,
  readStoredTheme,
  storeTheme,
  systemTheme,
  type Theme,
} from "@/lib/theme";

export function ThemeToggle() {
  const theme = useTheme();

  // Until the user picks a theme, keep following the OS setting live.
  useEffect(() => {
    const media = window.matchMedia(SYSTEM_THEME_QUERY);
    const onSystemChange = () => {
      if (readStoredTheme() === null) applyTheme(systemTheme());
    };
    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "light" ? "切換為淺色模式" : "切換為深色模式";
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      onClick={() => {
        applyTheme(next);
        storeTheme(next);
      }}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
