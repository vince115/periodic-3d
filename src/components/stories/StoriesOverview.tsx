"use client";

import Link from "next/link";
import { useState, type KeyboardEvent } from "react";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORY_GUIDES, ELEMENT_STORIES, VERIFICATION_LABELS, getElementStory } from "@/lib/content";
import { categoryStyle } from "@/lib/element-colors";
import {
  PERIODS,
  STORY_PAGES,
  categoryPath,
  elementPath,
  elementsInCategory,
  elementsInPeriod,
} from "@/lib/stories-nav";

const TABS = [
  { id: "categories", label: "分類導讀", count: CATEGORY_GUIDES.length },
  { id: "elements", label: "元素介紹", count: STORY_PAGES.length - CATEGORY_GUIDES.length },
] as const;
type TabId = (typeof TABS)[number]["id"];

/** Landing page of /stories: reading order, then one tab per part. */
export function StoriesOverview() {
  const [tab, setTab] = useState<TabId>("categories");
  const [period, setPeriod] = useState<number>(1);

  // Arrow keys move between tabs (WAI-ARIA tabs pattern).
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    const next = tab === "categories" ? "elements" : "categories";
    setTab(next);
    document.getElementById(`stories-tab-${next}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-5">
      <div>
        <nav aria-label="導覽路徑" className="breadcrumbs">
          <span>學習</span>
          <span aria-hidden>/</span>
          <span aria-current="page">元素故事</span>
        </nav>
        <h1 className="mt-1 text-2xl font-[653] leading-8 text-white">元素故事</h1>
        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-400">
          先從 {CATEGORY_GUIDES.length} 篇分類導讀認識各類元素的共同特性，再逐一閱讀 118 種元素的介紹。
          每個元素都有一頁，附上有來源的基本資料與一篇科學故事（共 {ELEMENT_STORIES.length} 篇）；
          每篇都標示參考來源與查核狀態，來源之間說法不一時會並陳差異。
        </p>
        <Link href={STORY_PAGES[0].href} className="story-start">
          從第一篇開始閱讀
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>

      <div role="tablist" aria-label="元素故事分類" className="segmented self-start">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`stories-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`stories-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            data-active={tab === t.id || undefined}
            onClick={() => setTab(t.id)}
            onKeyDown={onTabKeyDown}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-slate-500">{t.count}</span>
          </button>
        ))}
      </div>

      {tab === "categories" ? (
        <section id="stories-panel-categories" role="tabpanel" aria-labelledby="stories-tab-categories">
          <ul className="story-card-grid">
            {CATEGORY_GUIDES.map((g, i) => (
              <li key={g.id}>
                <Link href={categoryPath(g.id)} className="story-card" style={categoryStyle(g.id)}>
                  <span className="text-xs text-slate-400">
                    第 {i + 1} 篇 · {elementsInCategory(g.id).length} 種元素
                  </span>
                  <span className="text-base font-semibold text-white">{g.nameZh}</span>
                  <span className="line-clamp-3 text-sm leading-relaxed text-slate-300">{g.definitionZh}</span>
                  <span className="mt-auto text-xs text-slate-500">{VERIFICATION_LABELS[g.verification.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section id="stories-panel-elements" role="tabpanel" aria-labelledby="stories-tab-elements">
          <PeriodPager label="元素分頁" period={period} onChange={setPeriod} />
          <h2 className="mt-4 mb-2 text-sm font-semibold text-slate-300">
            第 {period} 週期（{elementsInPeriod(period).length} 種元素）
          </h2>
          <ul className="story-element-grid">
            {elementsInPeriod(period).map((el) => {
              const story = getElementStory(el.number);
              return (
                <li key={el.number}>
                  <Link href={elementPath(el.number)} className="story-element" style={categoryStyle(el.category)}>
                    <span className="font-mono text-xs tabular-nums text-slate-400">{el.number}</span>
                    <span className="text-xl font-semibold leading-tight text-white">{el.symbol}</span>
                    <span className="text-sm text-slate-200">{el.nameZh}</span>
                    {story ? (
                      <span className="story-element__story">
                        <BookOpen aria-hidden className="size-3" />
                        {story.title}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500">故事撰寫中</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
          <PeriodPager label="元素分頁（頁尾）" period={period} onChange={setPeriod} />
        </section>
      )}
    </div>
  );
}

/** Pagination of the element index: one page per period. */
function PeriodPager({
  label,
  period,
  onChange,
}: {
  label: string;
  period: number;
  onChange: (period: number) => void;
}) {
  const first = PERIODS[0];
  const last = PERIODS[PERIODS.length - 1];
  return (
    <nav aria-label={label} className="period-pager">
      <button
        type="button"
        className="icon-button"
        aria-label="上一頁"
        disabled={period === first}
        onClick={() => onChange(period - 1)}
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          className="period-pager__page"
          aria-current={p === period ? "page" : undefined}
          aria-label={`第 ${p} 週期`}
          onClick={() => onChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className="icon-button"
        aria-label="下一頁"
        disabled={period === last}
        onClick={() => onChange(period + 1)}
      >
        <ChevronRight aria-hidden className="size-4" />
      </button>
    </nav>
  );
}
