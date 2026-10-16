import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { THEME_BOOTSTRAP_SCRIPT, THEME_STORAGE_KEY } from "@/lib/theme";

function mockPrefersLight(prefersLight: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("light") ? prefersLight : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));
}

const runBootstrap = () => new Function(THEME_BOOTSTRAP_SCRIPT)();
const theme = () => document.documentElement.dataset.theme;

beforeEach(() => {
  delete document.documentElement.dataset.theme;
  localStorage.clear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("theme bootstrap script", () => {
  it("uses the saved choice over the OS preference", () => {
    mockPrefersLight(false);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    runBootstrap();
    expect(theme()).toBe("light");
  });

  it("follows the OS preference when nothing is saved", () => {
    mockPrefersLight(true);
    runBootstrap();
    expect(theme()).toBe("light");

    mockPrefersLight(false);
    runBootstrap();
    expect(theme()).toBe("dark");
  });

  it("ignores invalid saved values and blocked storage", () => {
    mockPrefersLight(false);
    localStorage.setItem(THEME_STORAGE_KEY, "sepia");
    runBootstrap();
    expect(theme()).toBe("dark");

    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    mockPrefersLight(true);
    runBootstrap();
    expect(theme()).toBe("light");
  });
});

describe("ThemeToggle", () => {
  it("switches between dark and light and remembers the choice", async () => {
    mockPrefersLight(false);
    document.documentElement.dataset.theme = "dark";
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole("button", { name: "切換為淺色模式" }));
    expect(theme()).toBe("light");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");

    await user.click(await screen.findByRole("button", { name: "切換為深色模式" }));
    expect(theme()).toBe("dark");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("stays in sync when the theme changes elsewhere", async () => {
    mockPrefersLight(false);
    document.documentElement.dataset.theme = "dark";
    render(<ThemeToggle />);
    document.documentElement.dataset.theme = "light";
    expect(await screen.findByRole("button", { name: "切換為深色模式" })).toBeInTheDocument();
  });

  it("still toggles when storage is unavailable", async () => {
    mockPrefersLight(false);
    document.documentElement.dataset.theme = "dark";
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole("button", { name: "切換為淺色模式" }));
    expect(theme()).toBe("light");
  });
});
