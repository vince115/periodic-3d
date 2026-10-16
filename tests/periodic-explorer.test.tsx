import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PeriodicExplorer } from "@/components/periodic-table/PeriodicExplorer";

const tile = (name: RegExp) => screen.getByRole("button", { name });

describe("PeriodicExplorer", () => {
  it("renders 118 element tiles and the empty details state", () => {
    render(<PeriodicExplorer />);
    const table = screen.getByRole("group", { name: /元素週期表/ });
    expect(within(table).getAllByRole("button")).toHaveLength(118);
    expect(screen.getByText("尚未選取元素")).toBeInTheDocument();
  });

  it("shows details when a tile is clicked, and closes them", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    await user.click(tile(/^26 號元素 鐵/));

    const details = screen.getByRole("article");
    expect(within(details).getByRole("heading", { level: 2 })).toHaveTextContent("鐵ㄊㄧㄝˇIron");
    expect(details).toHaveTextContent("55.845");
    expect(details).toHaveTextContent("過渡金屬");
    expect(details).toHaveTextContent("音同「帖」");
    expect(within(details).getByLabelText("電子殼層分布：2、8、14、2")).toBeInTheDocument();
    expect(tile(/^26 號元素 鐵/)).toHaveAttribute("aria-pressed", "true");

    // Closing hides the whole panel; the table takes its place.
    await user.click(screen.getByRole("button", { name: "關閉元素資訊" }));
    expect(screen.queryByRole("complementary", { name: "元素詳細資訊" })).toBeNull();
    expect(screen.queryByRole("article")).toBeNull();
    expect(tile(/^26 號元素 鐵/)).toHaveAttribute("aria-pressed", "false");

    // Choosing any element opens it again.
    await user.click(tile(/^8 號元素 氧/));
    expect(screen.getByRole("complementary", { name: "元素詳細資訊" })).toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveTextContent("Oxygen");
  });

  it("shows the element photo with attribution, or why there is none", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    await user.click(tile(/^26 號元素 鐵/));
    const photo = screen.getByRole("img", { name: /鐵（Iron）/ });
    expect(photo).toBeInTheDocument();
    const article = screen.getByRole("article");
    expect(within(article).getByRole("link", { name: "FAL" })).toHaveAttribute("href", expect.stringContaining("artlibre"));
    expect(article).toHaveTextContent("Wikimedia Commons");

    await user.click(tile(/^118 號元素/));
    expect(screen.getByRole("article")).toHaveTextContent("無法拍攝實物照片");
  });

  it("selects an element from search results with the keyboard", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    const input = screen.getByRole("combobox");
    await user.type(input, "氧");
    expect(screen.getByRole("listbox")).toHaveTextContent("氧");
    await user.keyboard("{Enter}");
    expect(screen.getByRole("article")).toHaveTextContent("Oxygen");
  });

  it("dims tiles that do not match the search", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    await user.type(screen.getByRole("combobox"), "8");
    expect(tile(/^8 號元素 氧/)).not.toHaveAttribute("data-dimmed");
    expect(tile(/^1 號元素 氫/)).toHaveAttribute("data-dimmed");
  });

  it("moves focus with arrow keys and selects with Enter", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    tile(/^1 號元素 氫/).focus();
    await user.keyboard("{ArrowDown}{ArrowRight}");
    expect(tile(/^4 號元素 鈹/)).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("article")).toHaveTextContent("Beryllium");
    await user.keyboard("{Escape}");
    expect(screen.getByText("尚未選取元素")).toBeInTheDocument();
  });

  it("lazily opens the 3D atom view, keeps it open across selections, and degrades without WebGL", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    await user.click(tile(/^6 號元素 碳/));
    const toggle = screen.getByRole("button", { name: "探索 3D 原子結構" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // jsdom has no WebGL 2, so the scene must fall back to text.
    expect(await screen.findByText("暫時無法顯示 3D")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /碳的三維原子殼層示意：2 層，共 6 個電子/ })).toBeInTheDocument();

    await user.click(tile(/^8 號元素 氧/));
    expect(
      await screen.findByRole("img", { name: /氧的三維原子殼層示意：2 層，共 8 個電子/ }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "收合 3D 原子結構" }));
    expect(screen.queryByRole("img", { name: /三維原子殼層示意/ })).toBeNull();
  });

  it("highlights a category from the legend", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    await user.click(screen.getByRole("button", { name: /^稀有氣體/ }));
    expect(tile(/^10 號元素 氖/)).not.toHaveAttribute("data-dimmed");
    expect(tile(/^11 號元素 鈉/)).toHaveAttribute("data-dimmed");
  });
});
