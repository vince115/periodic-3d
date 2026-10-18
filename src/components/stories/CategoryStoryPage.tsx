"use client";

import Link from "next/link";
import { getCategoryGuide } from "@/lib/content";
import { categoryStyle } from "@/lib/element-colors";
import { categoryPath, elementPath, elementsInCategory } from "@/lib/stories-nav";
import type { ElementCategoryId } from "@/types/element";
import { ArticlePager } from "./ArticlePager";
import { ArticleView } from "./ArticleView";
import { StoriesBreadcrumbs } from "./StoriesBreadcrumbs";

/** A category guide, with every element tagged with the category beside it. */
export function CategoryStoryPage({ id }: { id: ElementCategoryId }) {
  const guide = getCategoryGuide(id)!;
  const members = elementsInCategory(id);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <StoriesBreadcrumbs trail={["分類導讀"]} current={guide.nameZh} />
        <h1 className="mt-1 text-2xl font-[653] leading-8 text-white">
          分類導讀：{guide.nameZh}
          <span className="ml-2 text-base font-normal text-slate-400">{guide.nameEn}</span>
        </h1>
      </div>

      <div className="story-columns story-columns--article-first">
        <section className="details-panel" aria-label="導讀文章">
          <ArticleView kind="category" guide={guide} categoryHref={categoryPath} elementHref={elementPath} />
        </section>

        <section className="details-panel self-start" aria-labelledby="members-title" style={categoryStyle(id)}>
          <h2 id="members-title" className="article__h">
            本分類的元素（{members.length}）
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-slate-400">
            分類並非互斥：標示「同時屬於」的元素以其他分類為主，但也常被歸入本類。
          </p>
          <ul className="story-member-grid">
            {members.map((el) => {
              const tag = el.categoryTags.find((t) => t.id === id)!;
              return (
                <li key={el.number}>
                  <Link href={elementPath(el.number)} className="story-member" style={categoryStyle(el.category)}>
                    <span className="font-mono text-xs tabular-nums text-slate-400">{el.number}</span>
                    <span className="text-lg font-semibold leading-tight text-white">{el.symbol}</span>
                    <span className="text-xs text-slate-200">{el.nameZh}</span>
                    {tag.role === "secondary" && <span className="story-member__note">同時屬於</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <ArticlePager href={categoryPath(id)} />
    </div>
  );
}
