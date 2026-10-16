import { describe, expect, it } from "vitest";
import { ELEMENTS } from "@/data/elements";
import { buildLayout, findNeighbor, type ElementCell } from "@/lib/element-layout";

const cells = buildLayout(ELEMENTS).filter((c): c is ElementCell => c.kind === "element");
const cellOf = (symbol: string) => cells.find((c) => c.element.symbol === symbol)!;
const move = (symbol: string, dir: "up" | "down" | "left" | "right") =>
  findNeighbor(cells, cellOf(symbol), dir)?.element.symbol;

describe("findNeighbor (keyboard navigation)", () => {
  it("moves horizontally and skips the gap in periods 1–3", () => {
    expect(move("H", "right")).toBe("He");
    expect(move("He", "left")).toBe("H");
    expect(move("Be", "right")).toBe("B");
    expect(move("Fe", "right")).toBe("Co");
  });

  it("moves vertically within a group", () => {
    expect(move("H", "down")).toBe("Li");
    // Period 3 has no d-block: jump to the nearest populated column (Al, group 13).
    expect(move("Fe", "up")).toBe("Al");
    expect(move("Fe", "down")).toBe("Ru");
    expect(move("Ne", "up")).toBe("He");
  });

  it("enters and leaves the detached f-block rows", () => {
    expect(move("Ra", "down")).toBe("La");
    expect(move("La", "down")).toBe("Ac");
    expect(move("Ac", "up")).toBe("La");
  });

  it("returns undefined at the edges", () => {
    expect(move("H", "up")).toBeUndefined();
    expect(move("H", "left")).toBeUndefined();
    expect(move("Og", "right")).toBeUndefined();
    expect(move("Lr", "down")).toBeUndefined();
  });
});
