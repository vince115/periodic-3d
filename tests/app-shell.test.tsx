import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/AppShell";
import { NAV_SECTIONS } from "@/data/navigation";

/** Viewport width used to answer (min-width: Npx) media queries. */
function mockViewport(width: number) {
  vi.stubGlobal("matchMedia", (query: string) => {
    const min = Number(query.match(/min-width:\s*(\d+)px/)?.[1] ?? 0);
    return {
      matches: width >= min,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  });
}

const renderShell = () =>
  render(
    <AppShell activeNavId="periodic-table" search={<input aria-label="搜尋" />}>
      <p>頁面內容</p>
    </AppShell>,
  );
const menuButton = () => screen.getByRole("button", { name: /主選單/ });
const shell = (container: HTMLElement) => container.querySelector(".app-shell")!;

describe("AppShell", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the brand, page content and every navigation item", () => {
    mockViewport(1920);
    renderShell();
    expect(screen.getByRole("link", { name: "Periodic 3D 首頁" })).toHaveAttribute("href", "/");
    expect(screen.getByText("頁面內容")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "主選單" });
    for (const item of NAV_SECTIONS.flatMap((s) => s.items)) {
      expect(within(nav).getByText(item.label)).toBeInTheDocument();
    }
  });

  it("marks the current page and disables coming-soon items", () => {
    mockViewport(1920);
    renderShell();
    const nav = screen.getByRole("navigation", { name: "主選單" });
    expect(within(nav).getByRole("link", { name: /元素週期表/ })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: /3D 週期表/ })).toHaveAttribute("href", "/3d");
    for (const label of ["元素故事", "週期表遊戲"]) {
      const item = within(nav).getByText(label).closest(".side-menu__item")!;
      expect(item, label).toHaveAttribute("aria-disabled", "true");
      expect(item.tagName, label).not.toBe("A");
      expect(item, label).toHaveTextContent("即將推出");
    }
  });

  it("toggles between full menu and icon rail on desktop", async () => {
    mockViewport(1920);
    const user = userEvent.setup();
    const { container } = renderShell();
    // "auto" resolves to the full menu on a roomy screen.
    expect(shell(container)).toHaveAttribute("data-sidebar", "auto");
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");

    await user.click(menuButton());
    expect(shell(container)).toHaveAttribute("data-sidebar", "collapsed");
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");

    await user.click(menuButton());
    expect(shell(container)).toHaveAttribute("data-sidebar", "expanded");
    expect(menuButton()).toHaveAttribute("aria-expanded", "true");
  });

  it("starts as an icon rail on mid-size desktops to leave room for the table", () => {
    mockViewport(1440);
    renderShell();
    expect(menuButton()).toHaveAttribute("aria-expanded", "false");
    expect(menuButton()).toHaveAccessibleName("展開主選單");
  });

  it("opens a drawer on phones that closes with Escape and returns focus", async () => {
    mockViewport(375);
    const user = userEvent.setup();
    renderShell();
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(menuButton());
    const drawer = screen.getByRole("dialog", { name: "主選單" });
    expect(within(drawer).getByRole("button", { name: "關閉主選單" })).toHaveFocus();
    expect(within(drawer).getByRole("link", { name: /元素週期表/ })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(menuButton()).toHaveFocus();
  });
});
