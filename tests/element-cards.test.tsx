import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { PeriodicExplorer } from "@/components/periodic-table/PeriodicExplorer";

const tile = (name: RegExp) => screen.getByRole("button", { name });
/** Title of the element card (the side menu also has level-2 headings). */
const heading = () => document.getElementById("details-title") as HTMLElement;
const card = () => document.querySelector(".card-swipe") as HTMLElement;

function swipe(el: HTMLElement, dx: number, dy = 0, pointerType = "touch") {
  fireEvent.pointerDown(el, { pointerId: 1, pointerType, clientX: 200, clientY: 300 });
  fireEvent.pointerUp(el, { pointerId: 1, pointerType, clientX: 200 + dx, clientY: 300 + dy });
}

describe("element card browsing", () => {
  it("steps to the previous and next element with ‹ ›, disabled at the ends", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    await user.click(tile(/^26 號元素 鐵/));
    expect(screen.getByText("26 / 118")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /下一個元素：27 號 鈷/ }));
    expect(heading()).toHaveTextContent("鈷");
    await user.click(screen.getByRole("button", { name: /上一個元素：26 號 鐵/ }));
    expect(heading()).toHaveTextContent("鐵");

    await user.click(tile(/^1 號元素 氫/));
    expect(screen.getByRole("button", { name: "沒有上一個元素" })).toBeDisabled();
    await user.click(tile(/^118 號元素/));
    expect(screen.getByRole("button", { name: "沒有下一個元素" })).toBeDisabled();
  });

  it("browses only the highlighted category while a filter is active", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    await user.click(screen.getByRole("button", { name: /^稀有氣體/ }));
    await user.click(tile(/^10 號元素 氖/));
    expect(screen.getByText(/2 \/ 7/)).toBeInTheDocument();
    expect(screen.getByText("篩選中")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /下一個元素：18 號 氬/ }));
    expect(heading()).toHaveTextContent("氬");
  });

  it("swipes between elements on touch, and ignores mouse drags and vertical scrolls", async () => {
    const user = userEvent.setup();
    render(<PeriodicExplorer />);
    await user.click(tile(/^26 號元素 鐵/));

    swipe(card(), -120); // swipe left → next
    expect(heading()).toHaveTextContent("鈷");
    swipe(card(), 120); // swipe right → previous
    expect(heading()).toHaveTextContent("鐵");

    swipe(card(), -120, 0, "mouse");
    expect(heading()).toHaveTextContent("鐵");
    swipe(card(), -70, 200); // mostly vertical: a scroll, not a swipe
    expect(heading()).toHaveTextContent("鐵");
    swipe(card(), -30); // too short
    expect(heading()).toHaveTextContent("鐵");
  });
});
