import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PeriodicExplorer, viewFromPathname } from "@/components/periodic-table/PeriodicExplorer";

const pathname = vi.hoisted(() => ({ current: "/3d" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

afterEach(() => {
  pathname.current = "/3d";
});

describe("viewFromPathname", () => {
  it("maps routes to views", () => {
    expect(viewFromPathname("/")).toBe("2d");
    expect(viewFromPathname("/3d")).toBe("3d");
    expect(viewFromPathname(null)).toBe("2d");
  });
});

describe("PeriodicExplorer in 3D view", () => {
  it("marks 3D as current in the view toggle and the side menu", async () => {
    render(<PeriodicExplorer />);
    const toggle = screen.getByRole("navigation", { name: "檢視模式" });
    expect(within(toggle).getByRole("link", { name: /3D/ })).toHaveAttribute("aria-current", "page");
    expect(within(toggle).getByRole("link", { name: /2D/ })).not.toHaveAttribute("aria-current");
    const menu = screen.getByRole("navigation", { name: "主選單" });
    expect(within(menu).getByRole("link", { name: /3D 週期表/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("3D 元素週期表");
    // No 2D grid while in 3D.
    expect(screen.queryByRole("group", { name: /元素週期表，可使用方向鍵/ })).toBeNull();
  });

  it("falls back without WebGL and offers a way back to 2D", async () => {
    render(<PeriodicExplorer />);
    expect(await screen.findByText("暫時無法顯示 3D")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "回到 2D 週期表" })).toHaveAttribute("href", "/");
  });

  it("switches arrangement and selects elements from the keyboard picker", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    const arrangements = await screen.findByRole("group", { name: "3D 排列方式" });
    const sphere = within(arrangements).getByRole("button", { name: "球體" });
    await user.click(sphere);
    expect(sphere).toHaveAttribute("aria-pressed", "true");
    expect(within(arrangements).getByRole("button", { name: "週期表" })).toHaveAttribute("aria-pressed", "false");

    await user.selectOptions(screen.getByRole("combobox", { name: "從 3D 場景選取元素" }), "26");
    expect(screen.getByRole("article")).toHaveTextContent("Iron");
  });

  it("limits the picker to elements matching the search", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    await user.type(screen.getByRole("combobox", { name: /搜尋/ }), "氧");
    const picker = await screen.findByRole("combobox", { name: "從 3D 場景選取元素" });
    // Placeholder + the single match.
    expect(within(picker).getAllByRole("option")).toHaveLength(2);
    expect(screen.getByText("1 / 118 個元素")).toBeInTheDocument();
  });
});
