"use client";

import { AppShell } from "@/components/layout/AppShell";
import { getElementByNumber } from "@/data/elements";
import { CATEGORY_GUIDES, ELEMENT_STORIES, VERIFICATION_LABELS } from "@/lib/content";
import { ArticleView } from "./ArticleView";

const categoryAnchor = (id: string) => `category-${id}`;
const storyAnchor = (n: number) => `story-${n}`;

/**
 * Long-form reading page: all category guides and published element stories,
 * with a table of contents and in-page cross links. The same ArticleView is
 * used in the explorer panel.
 */
export function StoriesHub() {
  return (
    <AppShell activeNavId="element-stories">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
        <div>
          <nav aria-label="導覽路徑" className="breadcrumbs">
            <span>學習</span>
            <span aria-hidden>/</span>
            <span aria-current="page">元素故事</span>
          </nav>
          <h1 className="mt-1 text-2xl font-[653] leading-7 text-white">元素故事</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            從元素分類開始，認識每一類元素的共同特性與背後原理，再閱讀個別元素的科學故事。
            每篇文章都標示了來源與查核狀態；第一批故事為氫、碳、氧、矽、銅、金，其他元素將在查核後陸續加入。
          </p>
        </div>

        <nav aria-label="文章目錄" className="details-panel">
          <h2 className="article__h">分類導讀</h2>
          <ul className="grid gap-1 sm:grid-cols-2">
            {CATEGORY_GUIDES.map((g) => (
              <li key={g.id}>
                <a href={`#${categoryAnchor(g.id)}`} className="article__ref-link">
                  {g.nameZh}
                </a>
                <span className="ml-2 text-xs text-slate-500">{VERIFICATION_LABELS[g.verification.status]}</span>
              </li>
            ))}
          </ul>
          <h2 className="article__h mt-4">元素科學故事</h2>
          <ul className="grid gap-1 sm:grid-cols-2">
            {ELEMENT_STORIES.map((s) => {
              const el = getElementByNumber(s.elementNumber);
              return (
                <li key={s.elementNumber}>
                  <a href={`#${storyAnchor(s.elementNumber)}`} className="article__ref-link">
                    {el?.nameZh}（{el?.symbol}）：{s.title}
                  </a>
                  <span className="ml-2 text-xs text-slate-500">{VERIFICATION_LABELS[s.verification.status]}</span>
                </li>
              );
            })}
          </ul>
        </nav>

        {CATEGORY_GUIDES.map((guide) => (
          <section key={guide.id} id={categoryAnchor(guide.id)} className="details-panel scroll-mt-20">
            <ArticleView
              kind="category"
              guide={guide}
              storyHref={(n) => `#${storyAnchor(n)}`}
            />
          </section>
        ))}
        {ELEMENT_STORIES.map((story) => (
          <section key={story.elementNumber} id={storyAnchor(story.elementNumber)} className="details-panel scroll-mt-20">
            <ArticleView
              kind="story"
              story={story}
              categoryHref={(id) => `#${categoryAnchor(id)}`}
              storyHref={(n) => `#${storyAnchor(n)}`}
            />
          </section>
        ))}
      </main>
    </AppShell>
  );
}
