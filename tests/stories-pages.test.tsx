import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const pathname = { current: "/stories" };
const push = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ push }),
}));

import { CategoryStoryPage } from "@/components/stories/CategoryStoryPage";
import { ElementStoryPage } from "@/components/stories/ElementStoryPage";
import { StoriesNav } from "@/components/stories/StoriesNav";
import { StoriesOverview } from "@/components/stories/StoriesOverview";
import { getElementByNumber } from "@/data/elements";
import { CATEGORY_GUIDES } from "@/lib/content";
import { formatAtomicMass } from "@/lib/element-utils";
import { STORY_PAGES, getStoryPosition } from "@/lib/stories-nav";

beforeEach(() => {
  pathname.current = "/stories";
  push.mockReset();
});

describe("reading order", () => {
  it("puts every category guide first, then all 118 elements by atomic number", () => {
    expect(STORY_PAGES).toHaveLength(CATEGORY_GUIDES.length + 118);
    expect(STORY_PAGES.slice(0, CATEGORY_GUIDES.length).every((p) => p.kind === "category")).toBe(true);
    const elements = STORY_PAGES.slice(CATEGORY_GUIDES.length);
    expect(elements.map((p) => p.href)).toEqual(Array.from({ length: 118 }, (_, i) => `/stories/elements/${i + 1}`));
  });

  it("links the last category guide to hydrogen", () => {
    const last = CATEGORY_GUIDES[CATEGORY_GUIDES.length - 1];
    expect(getStoryPosition(`/stories/categories/${last.id}`)?.next?.href).toBe("/stories/elements/1");
    expect(getStoryPosition("/stories/elements/118")?.next).toBeNull();
    expect(getStoryPosition(STORY_PAGES[0].href)?.previous).toBeNull();
  });
});

describe("StoriesOverview", () => {
  it("switches between the category and element tabs", async () => {
    const user = userEvent.setup();
    render(<StoriesOverview />);
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getAllByRole("link")).toHaveLength(CATEGORY_GUIDES.length);

    await user.click(screen.getByRole("tab", { name: /元素介紹/ }));
    expect(screen.getByRole("tab", { name: /元素介紹/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: /^1\s*H\s*氫/ })).toHaveAttribute("href", "/stories/elements/1");
  });

  it("pages through the element index one period at a time", async () => {
    const user = userEvent.setup();
    render(<StoriesOverview />);
    await user.click(screen.getByRole("tab", { name: /元素介紹/ }));
    const grid = () => within(screen.getByRole("tabpanel")).getAllByRole("listitem");
    expect(grid()).toHaveLength(2);

    const pager = screen.getByRole("navigation", { name: "元素分頁" });
    expect(within(pager).getByRole("button", { name: "上一頁" })).toBeDisabled();
    await user.click(within(pager).getByRole("button", { name: "下一頁" }));
    expect(grid()).toHaveLength(8);
    await user.click(within(pager).getByRole("button", { name: "第 6 週期" }));
    expect(grid()).toHaveLength(32);
    expect(within(pager).getByRole("button", { name: "第 6 週期" })).toHaveAttribute("aria-current", "page");
  });
});

describe("StoriesNav", () => {
  it("marks the current page and opens its period", () => {
    pathname.current = "/stories/elements/26";
    render(<StoriesNav />);
    const toc = screen.getByRole("navigation", { name: "元素故事目錄" });
    expect(within(toc).getByRole("link", { name: /^26\s*鐵/ })).toHaveAttribute("aria-current", "page");
    expect(within(toc).getByText("第 4 週期").closest("details")).toHaveAttribute("open");
    expect(within(toc).getByText("第 1 週期").closest("details")).not.toHaveAttribute("open");
  });

  it("jumps to an article from the narrow-screen menu", async () => {
    const user = userEvent.setup();
    render(<StoriesNav />);
    await user.selectOptions(screen.getByLabelText("跳到文章"), "/stories/elements/8");
    expect(push).toHaveBeenCalledWith("/stories/elements/8");
  });
});

describe("element pages", () => {
  it("shows the element data beside its published story, with previous and next links", () => {
    render(<ElementStoryPage number={1} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("第 1 號元素：氫");
    expect(screen.getByRole("heading", { name: "宇宙最初的元素" })).toBeInTheDocument();
    expect(screen.getByRole("article", { name: /氫/ })).toHaveTextContent(formatAtomicMass(getElementByNumber(1)!));
    const pager = screen.getByRole("navigation", { name: "上一篇與下一篇" });
    expect(within(pager).getByRole("link", { name: /下一篇.*2 氦 He/ })).toHaveAttribute("href", "/stories/elements/2");
    expect(within(pager).getByRole("link", { name: /上一篇/ })).toHaveAttribute("href", expect.stringMatching(/^\/stories\/categories\//));
  });

  it("says the story is still being written instead of inventing one", () => {
    render(<ElementStoryPage number={26} />);
    expect(screen.getByRole("heading", { name: "鐵的科學故事撰寫中" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "過渡金屬" })).toHaveAttribute("href", "/stories/categories/transition-metal");
    expect(screen.getByRole("link", { name: "27 Co 鈷" })).toHaveAttribute("href", "/stories/elements/27");
  });

  it("opens a category page from the classification tags", async () => {
    const user = userEvent.setup();
    render(<ElementStoryPage number={71} />);
    await user.click(screen.getByRole("button", { name: /同時屬於：過渡金屬/ }));
    expect(push).toHaveBeenCalledWith("/stories/categories/transition-metal");
  });
});

describe("category pages", () => {
  it("lists every tagged element, including documented overlaps", () => {
    render(<CategoryStoryPage id="transition-metal" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("分類導讀：過渡金屬");
    const members = screen.getByRole("region", { name: /本分類的元素/ });
    expect(within(members).getByRole("link", { name: /^26\s*Fe\s*鐵/ })).toHaveAttribute("href", "/stories/elements/26");
    expect(within(members).getByRole("link", { name: /^71\s*Lu.*同時屬於/ })).toBeInTheDocument();
  });
});
