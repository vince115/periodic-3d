"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Grid3x3 } from "lucide-react";
import { SceneBoundary } from "@/components/three-d/SceneBoundary";
import { AppShell, NAVBAR_HEIGHT_PX } from "@/components/layout/AppShell";
import { useDraggable } from "@/hooks/useDraggable";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSwipe } from "@/hooks/useSwipe";
import { useElements } from "@/hooks/useElements";
import { ArticleView } from "@/components/stories/ArticleView";
import { getCategoryGuide, getElementStory } from "@/lib/content";
import type { ElementCategoryId } from "@/types/element";
import { CategoryLegend } from "./CategoryLegend";
import { DraggablePanel } from "./DraggablePanel";
import { ElementCardNav } from "./ElementCardNav";
import { ElementDetails } from "./ElementDetails";
import { ElementSearch } from "./ElementSearch";
import { PeriodicTable2D } from "./PeriodicTable2D";

/** Tailwind `xl`: the details panel sits beside the table and can be torn off. */
const WIDE_LAYOUT_QUERY = "(min-width: 1280px)";
/** Tailwind `md`: below this the details become a full-width bottom-sheet card. */
const TABLET_QUERY = "(min-width: 768px)";

export type ExplorerView = "2d" | "3d";

/** Route ↔ view. Both routes share the (explorer) layout, so state persists. */
const VIEW_ROUTES: Record<ExplorerView, string> = { "2d": "/", "3d": "/3d" };
const VIEW_NAV_IDS: Record<ExplorerView, string> = {
  "2d": "periodic-table",
  "3d": "periodic-table-3d",
};

type Reading = { kind: "category"; id: ElementCategoryId } | { kind: "story"; number: number } | null;

export function viewFromPathname(pathname: string | null): ExplorerView {
  return pathname === VIEW_ROUTES["3d"] ? "3d" : "2d";
}

// three.js is only downloaded when the 3D view is opened.
const PeriodicTable3D = dynamic(() => import("@/components/three-d/PeriodicTable3D"), {
  ssr: false,
  loading: () => (
    <div className="scene-message table-scene" role="status">
      正在載入 3D 週期表…
    </div>
  ),
});

/** Composes the explorer; owns no data logic beyond wiring useElements. */
export function PeriodicExplorer() {
  const view = viewFromPathname(usePathname());
  const state = useElements();
  const detailsRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isWide = useMediaQuery(WIDE_LAYOUT_QUERY);
  // Phones show the details as a bottom-sheet card sized to the screen.
  const isPhone = !useMediaQuery(TABLET_QUERY);
  // Floating panel may not slide under the sticky navbar.
  const panelDrag = useDraggable(panelRef, isWide, NAVBAR_HEIGHT_PX + 8);
  const selectedNumber = state.selected?.number ?? null;

  // The details panel can be closed; choosing any element opens it again.
  const [panelOpen, setPanelOpen] = useState(true);
  // What the panel shows besides element details: a category guide or a story.
  const [reading, setReading] = useState<Reading>(null);
  // 3D atom view stays open across elements (the card remounts per element).
  const [atomOpen, setAtomOpen] = useState(false);
  // Direction the next card slides in from (set by ‹ › and swipes).
  const [slideFrom, setSlideFrom] = useState<"left" | "right" | null>(null);
  const { select, highlightedCategory, setHighlightedCategory } = state;
  const { reset: dockPanel } = panelDrag;
  const selectElement = useCallback(
    (number: number | null) => {
      select(number);
      setReading(null);
      setSlideFrom(null);
      if (number !== null) setPanelOpen(true);
    },
    [select],
  );
  const closePanel = useCallback(() => {
    select(null);
    setReading(null);
    setPanelOpen(false);
    dockPanel(); // reopen docked, not wherever it was dragged
  }, [select, dockPanel]);
  const openCategory = useCallback(
    (id: ElementCategoryId) => {
      setHighlightedCategory(id);
      setReading({ kind: "category", id });
      setPanelOpen(true);
    },
    [setHighlightedCategory],
  );
  const openStory = useCallback((number: number) => {
    setReading({ kind: "story", number });
    setPanelOpen(true);
  }, []);
  // Legend: first click highlights the category and opens its guide; a second clears both.
  const toggleLegendCategory = useCallback(
    (id: ElementCategoryId) => {
      if (highlightedCategory === id) {
        setHighlightedCategory(null);
        setReading((r) => (r?.kind === "category" && r.id === id ? null : r));
      } else {
        openCategory(id);
      }
    },
    [highlightedCategory, setHighlightedCategory, openCategory],
  );
  // Card browsing (‹ › and swipe): neighbours in atomic-number order, limited to
  // the elements still visible when a search or category highlight is active.
  const filtered = state.query.trim() !== "" || highlightedCategory !== null;
  const { elements, isDimmed } = state;
  const sequence = useMemo(() => {
    const visible = filtered ? elements.filter((el) => !isDimmed(el)) : elements;
    // If the current element is itself filtered out, browse the whole table.
    return selectedNumber !== null && !visible.some((el) => el.number === selectedNumber)
      ? elements
      : visible;
  }, [filtered, elements, isDimmed, selectedNumber]);
  const index = sequence.findIndex((el) => el.number === selectedNumber);
  const previous = index > 0 ? sequence[index - 1] : null;
  const next = index >= 0 && index < sequence.length - 1 ? sequence[index + 1] : null;
  const browseTo = useCallback(
    (number: number, from: "left" | "right") => {
      selectElement(number);
      setSlideFrom(from);
    },
    [selectElement],
  );
  const swipe = useSwipe({
    onSwipeLeft: () => next && browseTo(next.number, "right"),
    onSwipeRight: () => previous && browseTo(previous.number, "left"),
  });
  const showSheet = isPhone && panelOpen && (state.selected !== null || reading !== null);

  const guide = reading?.kind === "category" ? getCategoryGuide(reading.id) : undefined;
  const story = reading?.kind === "story" ? getElementStory(reading.number) : undefined;
  // Closed or torn off: the table takes the panel's column and scales up.
  const tableFullWidth = panelDrag.floating || !panelOpen;

  // On narrow screens the panel sits below the table: bring it into view.
  useEffect(() => {
    if (selectedNumber === null && reading === null) return;
    if (window.matchMedia(WIDE_LAYOUT_QUERY).matches) return;
    // Phones use a fixed bottom-sheet card instead; nothing to scroll to.
    if (!window.matchMedia(TABLET_QUERY).matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    detailsRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  }, [selectedNumber, reading]);

  const search = (
    <ElementSearch
      query={state.query}
      onQueryChange={state.setQuery}
      results={state.results}
      onSelect={selectElement}
    />
  );

  const viewToggle = (
    <nav aria-label="檢視模式" className="view-toggle">
      <Link
        href={VIEW_ROUTES["2d"]}
        aria-current={view === "2d" ? "page" : undefined}
        data-active={view === "2d" || undefined}
      >
        <Grid3x3 aria-hidden className="size-4" />
        2D
      </Link>
      <Link
        href={VIEW_ROUTES["3d"]}
        aria-current={view === "3d" ? "page" : undefined}
        data-active={view === "3d" || undefined}
      >
        <Box aria-hidden className="size-4" />
        3D
      </Link>
    </nav>
  );

  return (
    <AppShell activeNavId={VIEW_NAV_IDS[view]} search={search} navbarTrailing={viewToggle}>
      <main className="flex w-full flex-col gap-5 px-4 py-5 sm:px-6 lg:py-6">
        {/* Page heading, not a banner: the navbar is the page's only <header>. */}
        <div>
          <nav aria-label="導覽路徑" className="breadcrumbs">
            <span>探索</span>
            <span aria-hidden>/</span>
            <span aria-current="page">{view === "3d" ? "3D 週期表" : "元素週期表"}</span>
          </nav>
          <h1 className="mt-1 text-2xl font-[653] leading-7 text-white">
            {view === "3d" ? "3D 元素週期表" : "互動式元素週期表"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {state.elements.length} 種已命名元素 · 點選或搜尋以探索各元素的性質
          </p>
        </div>

        {/* A floating (torn-off) panel gives its column back: the table goes full width and scales up. */}
        <div
          data-layout={tableFullWidth ? "full-width" : "split"}
          className={
            tableFullWidth ? "grid gap-x-5" : "grid gap-5 xl:grid-cols-[minmax(0,1fr)_23rem]"
          }
        >
          <div className="flex min-w-0 flex-col gap-5">
            {view === "2d" ? (
              <div>
                <PeriodicTable2D
                  elements={state.elements}
                  selectedNumber={selectedNumber}
                  onSelect={selectElement}
                  isDimmed={state.isDimmed}
                />
                <p className="mt-1 px-1 text-xs text-slate-500 md:hidden">← 左右滑動以瀏覽完整週期表 →</p>
              </div>
            ) : (
              <SceneBoundary
                fallback={
                  <div className="scene-message table-scene" role="alert">
                    <strong className="text-sm text-slate-200">3D 場景載入失敗</strong>
                    <p>你的選取與搜尋都已保留。</p>
                    <Link href={VIEW_ROUTES["2d"]} className="scene-fallback-action">
                      回到 2D 週期表
                    </Link>
                  </div>
                }
              >
                <PeriodicTable3D
                  elements={state.elements}
                  selectedNumber={selectedNumber}
                  onSelect={selectElement}
                  isDimmed={state.isDimmed}
                />
              </SceneBoundary>
            )}
            <CategoryLegend
              elements={state.elements}
              highlighted={state.highlightedCategory}
              onToggle={toggleLegendCategory}
            />
          </div>

          {panelOpen && (
            <>
              {/*
                Sticky creates a stacking context, so the dragged panel's z-index only
                counts inside it: lift the whole aside above the tiles (z ≤ 2) while
                staying below the navbar and its search dropdown (z-40).
              */}
              <aside
                ref={detailsRef}
                aria-label="元素詳細資訊"
                className="relative z-20 scroll-mt-20 xl:sticky xl:top-[calc(var(--navbar-h)+1.5rem)] xl:self-start"
                data-sheet={showSheet || undefined}
              >
                <DraggablePanel title="元素資訊" panelRef={panelRef} drag={panelDrag} onClose={closePanel}>
                  {/* On wide screens the panel's title bar carries the close button. */}
                  {guide || story ? (
                    <div className="details-panel">
                      {guide ? (
                        <ArticleView
                          kind="category"
                          guide={guide}
                          onBack={() => setReading(null)}
                          backLabel={state.selected ? "返回元素資訊" : "返回"}
                          onSelectElement={selectElement}
                        />
                      ) : (
                        <ArticleView
                          kind="story"
                          story={story!}
                          onBack={() => setReading(null)}
                          onSelectElement={selectElement}
                          onOpenCategory={openCategory}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="card-swipe" {...swipe}>
                      {state.selected && (
                        <ElementCardNav
                          previous={previous}
                          next={next}
                          position={index + 1}
                          total={sequence.length}
                          filtered={filtered && sequence !== elements}
                          onSelect={(n) => browseTo(n, n > (selectedNumber ?? 0) ? "right" : "left")}
                        />
                      )}
                      {/* Keyed so each element slides in from the side it came from. */}
                      <div key={selectedNumber ?? "empty"} className="card-slide" data-from={slideFrom ?? undefined}>
                        <ElementDetails
                          element={state.selected}
                          onClose={closePanel}
                          showClose={!isWide}
                          onOpenCategory={openCategory}
                          onOpenStory={openStory}
                          atomOpen={atomOpen}
                          onAtomOpenChange={setAtomOpen}
                        />
                      </div>
                    </div>
                  )}
                </DraggablePanel>
              </aside>
            </>
          )}
        </div>

        <footer className="pb-2 text-xs leading-relaxed text-slate-500">
          資料來源：PubChem（名稱、分類、電子排布）、CIAAW 2024 標準原子量與 NUBASE2020 最穩定同位素、NIST ASD（電子排布交叉核對）；
          中文名稱依教育部公布用字。方括號 [ ] 表示無標準原子量之元素的最穩定同位素質量數。
        </footer>
      </main>
    </AppShell>
  );
}
