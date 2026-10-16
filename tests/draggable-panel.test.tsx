import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DraggablePanel } from "@/components/periodic-table/DraggablePanel";
import { PeriodicExplorer } from "@/components/periodic-table/PeriodicExplorer";
import { useDraggable } from "@/hooks/useDraggable";

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

const DOCKED = { x: 700, y: 100 };
const PANEL = { width: 300, height: 400 };

/**
 * jsdom has no layout: report a 300×400 panel docked at (700, 100), or at its
 * inline left/top once floating — as a browser would.
 */
function mockPanelLayout() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const x = this.style.left ? parseFloat(this.style.left) : DOCKED.x;
    const y = this.style.top ? parseFloat(this.style.top) : DOCKED.y;
    return {
      left: x,
      top: y,
      right: x + PANEL.width,
      bottom: y + PANEL.height,
      ...PANEL,
      x,
      y,
    } as DOMRect;
  });
}

function Harness({ enabled }: { enabled: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useDraggable(ref, enabled);
  return (
    <DraggablePanel title="元素資訊" panelRef={ref} drag={drag} onClose={() => {}}>
      <p>內容</p>
    </DraggablePanel>
  );
}

const panelOf = () => screen.getByText("內容").parentElement!;
const grip = () => screen.getByRole("button", { name: /移動元素資訊面板/ });
const placement = () => [panelOf().style.left, panelOf().style.top];

describe("DraggablePanel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("on wide screens", () => {
    beforeEach(() => {
      mockMatchMedia(true);
      mockPanelLayout();
    });

    it("starts docked in the layout with no reset button", () => {
      render(<Harness enabled />);
      expect(panelOf()).not.toHaveAttribute("data-floating");
      expect(placement()).toEqual(["", ""]);
      expect(screen.queryByRole("button", { name: "放回原位" })).toBeNull();
    });

    it("undocks with the arrow keys from where it was, clamps to the viewport, and docks again", async () => {
      const user = userEvent.setup();
      render(<Harness enabled />);
      grip().focus();
      await user.keyboard("{ArrowLeft}{Shift>}{ArrowDown}{/Shift}");
      expect(panelOf()).toHaveAttribute("data-floating");
      expect(placement()).toEqual([`${DOCKED.x - 16}px`, `${DOCKED.y + 64}px`]);

      // Right edge: viewport width − panel width.
      for (let i = 0; i < 10; i++) await user.keyboard("{Shift>}{ArrowRight}{/Shift}");
      expect(panelOf().style.left).toBe(`${window.innerWidth - PANEL.width}px`);
      // Top edge.
      for (let i = 0; i < 5; i++) await user.keyboard("{Shift>}{ArrowUp}{/Shift}");
      expect(panelOf().style.top).toBe("0px");

      await user.click(screen.getByRole("button", { name: "放回原位" }));
      expect(panelOf()).not.toHaveAttribute("data-floating");
      expect(placement()).toEqual(["", ""]);
    });

    it("follows a pointer drag, but a plain click on the handle does not undock", () => {
      render(<Harness enabled />);
      const handle = grip().parentElement!;

      fireEvent.pointerDown(handle, { button: 0, pointerId: 1, clientX: 800, clientY: 110 });
      fireEvent.pointerMove(handle, { pointerId: 1, clientX: 802, clientY: 111 });
      fireEvent.pointerUp(handle, { pointerId: 1 });
      expect(panelOf()).not.toHaveAttribute("data-floating");

      fireEvent.pointerDown(handle, { button: 0, pointerId: 2, clientX: 800, clientY: 110 });
      fireEvent.pointerMove(handle, { pointerId: 2, clientX: 500, clientY: 250 });
      fireEvent.pointerUp(handle, { pointerId: 2 });
      expect(placement()).toEqual([`${DOCKED.x - 300}px`, `${DOCKED.y + 140}px`]);

      // Moves after release are ignored.
      fireEvent.pointerMove(handle, { pointerId: 2, clientX: 100, clientY: 100 });
      expect(placement()).toEqual([`${DOCKED.x - 300}px`, `${DOCKED.y + 140}px`]);
    });

    it("lets a clicked grip take focus so arrow keys work afterwards", async () => {
      const user = userEvent.setup();
      render(<Harness enabled />);
      await user.click(grip());
      expect(grip()).toHaveFocus();
      await user.keyboard("{ArrowDown}");
      expect(panelOf()).toHaveAttribute("data-floating");
    });

    it("gives the panel's column back to the table while floating", async () => {
      const user = userEvent.setup();
      const { container } = render(<PeriodicExplorer />);
      const layout = () => container.querySelector("[data-layout]")!;
      expect(layout()).toHaveAttribute("data-layout", "split");

      grip().focus();
      await user.keyboard("{ArrowLeft}");
      expect(layout()).toHaveAttribute("data-layout", "full-width");

      await user.click(screen.getByRole("button", { name: "放回原位" }));
      expect(layout()).toHaveAttribute("data-layout", "split");
    });
  });

  it("stays in the page flow without a handle on narrow screens", () => {
    mockMatchMedia(false);
    render(<Harness enabled={false} />);
    expect(screen.queryByRole("button", { name: /移動元素資訊面板/ })).toBeNull();
    expect(panelOf()).not.toHaveAttribute("data-floating");
  });
});
