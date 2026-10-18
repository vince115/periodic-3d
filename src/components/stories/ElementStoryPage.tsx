"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BookOpen } from "lucide-react";
import { ElementDetails } from "@/components/periodic-table/ElementDetails";
import { getCategory } from "@/data/categories";
import { getElementByNumber } from "@/data/elements";
import { getElementStory } from "@/lib/content";
import { categoryStyle } from "@/lib/element-colors";
import { categoryPath, elementPath } from "@/lib/stories-nav";
import type { ChemicalElement } from "@/types/element";
import { ArticlePager } from "./ArticlePager";
import { ArticleView } from "./ArticleView";
import { StoriesBreadcrumbs } from "./StoriesBreadcrumbs";

/**
 * One element per page: the sourced element data (same card as the explorer)
 * beside its science story, or a note while the story awaits checking.
 */
export function ElementStoryPage({ number }: { number: number }) {
  const router = useRouter();
  const element = getElementByNumber(number)!;
  const story = getElementStory(number);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <StoriesBreadcrumbs trail={["元素介紹"]} current={`${element.number} ${element.nameZh}`} />
        <h1 className="mt-1 text-2xl font-[653] leading-8 text-white">
          第 {element.number} 號元素：{element.nameZh}
          <span className="ml-2 text-base font-normal text-slate-400">
            {element.symbol} · {element.name}
          </span>
        </h1>
      </div>

      <div className="story-columns">
        <ElementDetails
          element={element}
          showClose={false}
          showStoryEntry={false}
          onClose={() => {}}
          onOpenCategory={(id) => router.push(categoryPath(id))}
        />
        <section className="details-panel" aria-label="科學故事">
          {story ? (
            <ArticleView
              kind="story"
              story={story}
              categoryHref={categoryPath}
              elementHref={elementPath}
            />
          ) : (
            <PendingStory element={element} />
          )}
        </section>
      </div>

      <ArticlePager href={elementPath(number)} />
    </div>
  );
}

function PendingStory({ element }: { element: ChemicalElement }) {
  return (
    <div className="article">
      <p className="article__eyebrow">
        <BookOpen aria-hidden className="size-3.5" />
        元素科學故事 · {element.nameZh}（{element.symbol}）
      </p>
      <h2 className="article__title">{element.nameZh}的科學故事撰寫中</h2>
      <p className="article__lede">
        每篇故事都要逐句對照 IUPAC、CIAAW、PubChem 等來源後才會發布，不為了趕進度而放上未經查核的內容。
        在此之前，左側的元素資料（原子量、電子排布、分類與簡介）都已附上來源。
      </p>

      <section className="article__section">
        <h3 className="article__h">先讀分類導讀</h3>
        <div className="flex flex-wrap gap-1.5">
          {element.categoryTags.map((tag) => (
            <Link key={tag.id} href={categoryPath(tag.id)} className="article__chip" style={categoryStyle(tag.id)}>
              {getCategory(tag.id).labelZh}
            </Link>
          ))}
        </div>
      </section>

      {element.relatedElementNumbers.length > 0 && (
        <section className="article__section">
          <h3 className="article__h">週期表上的鄰居</h3>
          <div className="flex flex-wrap gap-1.5">
            {element.relatedElementNumbers.map((n) => {
              const el = getElementByNumber(n);
              if (!el) return null;
              return (
                <Link key={n} href={elementPath(n)} className="article__chip" style={categoryStyle(el.category)}>
                  {el.number} {el.symbol} {el.nameZh}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
