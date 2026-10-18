"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Library } from "lucide-react";
import { CATEGORY_GUIDES, getElementStory } from "@/lib/content";
import { getElementByNumber } from "@/data/elements";
import {
  PERIODS,
  STORIES_HOME,
  categoryPath,
  elementPath,
  elementsInPeriod,
} from "@/lib/stories-nav";

/**
 * Table of contents for /stories: category guides, then elements grouped by
 * period. A sidebar on wide screens, a jump menu on narrow ones.
 */
export function StoriesNav() {
  const pathname = usePathname();
  const router = useRouter();
  const currentNumber = Number(pathname.match(/^\/stories\/elements\/(\d+)$/)?.[1]);
  const currentPeriod = getElementByNumber(currentNumber)?.period ?? null;

  return (
    <>
      <div className="stories-jump">
        <label htmlFor="stories-jump" className="text-xs text-slate-400">
          跳到文章
        </label>
        <select
          id="stories-jump"
          className="stories-jump__select"
          value={pathname}
          onChange={(event) => router.push(event.target.value)}
        >
          <option value={STORIES_HOME}>元素故事總覽</option>
          <optgroup label="分類導讀">
            {CATEGORY_GUIDES.map((g) => (
              <option key={g.id} value={categoryPath(g.id)}>
                {g.nameZh}
              </option>
            ))}
          </optgroup>
          {PERIODS.map((period) => (
            <optgroup key={period} label={`元素介紹：第 ${period} 週期`}>
              {elementsInPeriod(period).map((el) => (
                <option key={el.number} value={elementPath(el.number)}>
                  {el.number} {el.nameZh} {el.symbol}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <nav aria-label="元素故事目錄" className="stories-toc">
        <TocLink href={STORIES_HOME} pathname={pathname}>
          <Library aria-hidden className="size-4" />
          總覽
        </TocLink>

        <h2 className="stories-toc__heading">分類導讀</h2>
        <ul>
          {CATEGORY_GUIDES.map((g) => (
            <li key={g.id}>
              <TocLink href={categoryPath(g.id)} pathname={pathname}>
                {g.nameZh}
              </TocLink>
            </li>
          ))}
        </ul>

        <h2 className="stories-toc__heading">元素介紹</h2>
        {PERIODS.map((period) => (
          <details
            // Remount when the current period changes so it opens by default.
            key={`${period}-${currentPeriod === period}`}
            className="stories-toc__period"
            open={currentPeriod === period}
          >
            <summary>
              第 {period} 週期
              <span className="ml-auto text-xs text-slate-500">{elementsInPeriod(period).length}</span>
            </summary>
            <ul>
              {elementsInPeriod(period).map((el) => (
                <li key={el.number}>
                  <TocLink href={elementPath(el.number)} pathname={pathname}>
                    <span className="w-7 shrink-0 text-right font-mono text-xs tabular-nums text-slate-500">
                      {el.number}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {el.nameZh} <span className="text-slate-500">{el.symbol}</span>
                    </span>
                    <StoryMark number={el.number} />
                  </TocLink>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </nav>
    </>
  );
}

function TocLink({ href, pathname, children }: { href: string; pathname: string; children: ReactNode }) {
  const active = pathname === href;
  return (
    <Link href={href} className="stories-toc__link" aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}

/** Marks elements whose science story is already published. */
function StoryMark({ number }: { number: number }) {
  return getElementStory(number) ? (
    <BookOpen aria-label="已有科學故事" role="img" className="size-3.5 shrink-0 text-sky-300" />
  ) : null;
}
