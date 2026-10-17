"use client";

import { ArrowLeft, BookOpen, ExternalLink, Lightbulb, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { getCategory } from "@/data/categories";
import { getElementByNumber } from "@/data/elements";
import { categoryStyle } from "@/lib/element-colors";
import {
  VERIFICATION_LABELS,
  getElementStory,
  resolveReference,
  type ArticleSection,
  type CategoryGuide,
  type ElementStory,
  type Verification,
} from "@/lib/content";
import type { ElementCategoryId } from "@/types/element";

/**
 * How links inside an article behave. In the explorer panel they act on the
 * table (select an element, open another article); on the /stories page
 * they are in-page anchors. Missing handlers render plain text.
 */
export interface ArticleLinks {
  onSelectElement?: (number: number) => void;
  onOpenCategory?: (id: ElementCategoryId) => void;
  /** Builds an href instead of using callbacks (page mode). */
  categoryHref?: (id: ElementCategoryId) => string;
  storyHref?: (number: number) => string;
}

type ArticleViewProps = ArticleLinks & {
  onBack?: () => void;
  backLabel?: string;
  headingLevel?: "h2" | "h3";
} & ({ kind: "category"; guide: CategoryGuide } | { kind: "story"; story: ElementStory });

export function ArticleView(props: ArticleViewProps) {
  const { onBack, backLabel = "返回元素資訊", headingLevel = "h2" } = props;
  const Heading = headingLevel;
  // Section headings sit one level below the article title (no skipped levels).
  const SectionHeading = headingLevel === "h2" ? "h3" : "h4";
  const isCategory = props.kind === "category";
  const title = isCategory ? props.guide.article.title : props.story.title;
  const sections = isCategory ? props.guide.article.sections : props.story.sections;
  const question = isCategory ? props.guide.article.thinkingQuestionZh : props.story.thinkingQuestionZh;
  const verification = isCategory ? props.guide.verification : props.story.verification;
  const referenceIds = isCategory ? props.guide.referenceIds : props.story.referenceIds;
  const version = isCategory ? props.guide.version : props.story.version;
  const element = isCategory ? null : getElementByNumber(props.story.elementNumber);
  const accent = isCategory ? props.guide.id : element?.category;

  return (
    <article className="article" style={accent ? categoryStyle(accent) : undefined} aria-labelledby={`article-${isCategory ? props.guide.id : props.story.elementNumber}`}>
      {onBack && (
        <button type="button" className="article__back" onClick={onBack}>
          <ArrowLeft aria-hidden className="size-4" />
          {backLabel}
        </button>
      )}

      <p className="article__eyebrow">
        <BookOpen aria-hidden className="size-3.5" />
        {isCategory ? `分類導讀 · ${props.guide.nameZh}` : `元素科學故事 · ${element?.nameZh}（${element?.symbol}）`}
      </p>
      <Heading id={`article-${isCategory ? props.guide.id : props.story.elementNumber}`} className="article__title">
        {title}
      </Heading>
      <VerificationBadge verification={verification} version={version} />

      {isCategory ? (
        <CategoryFacts guide={props.guide} />
      ) : (
        <p className="article__lede">{props.story.openingZh}</p>
      )}

      {sections.map((section: ArticleSection) => (
        <section key={section.heading} className="article__section">
          <SectionHeading className="article__h">{section.heading}</SectionHeading>
          {section.paragraphs.map((p) => (
            <p key={p.slice(0, 24)} className="article__p">
              {p}
            </p>
          ))}
        </section>
      ))}

      <div className="article__question" role="note" aria-label="延伸思考">
        <Lightbulb aria-hidden className="size-4 shrink-0" />
        <p>
          <strong className="block text-xs font-semibold">延伸思考</strong>
          {question}
        </p>
      </div>

      {isCategory ? (
        <LinkGroup title="代表元素" level={SectionHeading}>
          {props.guide.representativeElements.map((n) => (
            <ElementLink key={n} number={n} links={props} />
          ))}
        </LinkGroup>
      ) : (
        <>
          <LinkGroup title="相關分類" level={SectionHeading}>
            {props.story.categoryIds.map((id) => (
              <CategoryLink key={id} id={id} links={props} />
            ))}
          </LinkGroup>
          <LinkGroup title="延伸閱讀元素" level={SectionHeading}>
            {props.story.furtherReadingElementNumbers.map((n) => (
              <ElementLink key={n} number={n} links={props} />
            ))}
          </LinkGroup>
        </>
      )}

      <section className="article__section">
        <SectionHeading className="article__h">參考來源</SectionHeading>
        <ol className="article__refs">
          {referenceIds.map((id) => {
            const ref = resolveReference(id);
            return (
              <li key={id}>
                <a href={ref.url} target="_blank" rel="noreferrer" className="article__ref-link">
                  {ref.citation}
                  <ExternalLink aria-hidden className="ml-1 inline size-3" />
                </a>
                <span className="article__ref-status">
                  {ref.accessed ? `已查閱 ${ref.accessed}` : "引用背景文獻，未取得全文"}
                </span>
              </li>
            );
          })}
        </ol>
      </section>
    </article>
  );
}

function VerificationBadge({ verification, version }: { verification: Verification; version: string }) {
  return (
    <details className="article__verification" data-status={verification.status}>
      <summary>
        <ShieldCheck aria-hidden className="size-3.5" />
        {VERIFICATION_LABELS[verification.status]}
        <span className="text-[11px] font-normal">· 版本 {version}</span>
      </summary>
      <p>{verification.notesZh}</p>
    </details>
  );
}

function CategoryFacts({ guide }: { guide: CategoryGuide }) {
  return (
    <dl className="article__facts">
      <div>
        <dt>定義</dt>
        <dd>{guide.definitionZh}</dd>
      </div>
      <div>
        <dt>分類規則</dt>
        <dd>
          <ul>
            {guide.rulesZh.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </dd>
      </div>
      {guide.exceptionsZh.length > 0 && (
        <div>
          <dt>例外與爭議</dt>
          <dd>
            <ul>
              {guide.exceptionsZh.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </dd>
        </div>
      )}
      <div>
        <dt>共同特性</dt>
        <dd>{guide.sharedPropertiesZh.join("、")}</dd>
      </div>
      <div>
        <dt>科學原理</dt>
        <dd>{guide.principleZh}</dd>
      </div>
    </dl>
  );
}

function LinkGroup({
  title,
  level: Level,
  children,
}: {
  title: string;
  level: "h3" | "h4";
  children: ReactNode;
}) {
  return (
    // Visible heading names the group; an aria-label would turn every
    // article's copy into a duplicate landmark on the /stories page.
    <section className="article__section">
      <Level className="article__h">{title}</Level>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </section>
  );
}

function ElementLink({ number, links }: { number: number; links: ArticleLinks }) {
  const el = getElementByNumber(number);
  if (!el) return null;
  const label = `${el.number} ${el.symbol} ${el.nameZh}`;
  const hasStory = Boolean(getElementStory(number));
  if (links.onSelectElement) {
    return (
      <button type="button" className="article__chip" style={categoryStyle(el.category)} onClick={() => links.onSelectElement!(number)}>
        {label}
      </button>
    );
  }
  if (links.storyHref && hasStory) {
    return (
      <a className="article__chip" style={categoryStyle(el.category)} href={links.storyHref(number)}>
        {label}
      </a>
    );
  }
  return (
    <span className="article__chip" style={categoryStyle(el.category)}>
      {label}
    </span>
  );
}

function CategoryLink({ id, links }: { id: ElementCategoryId; links: ArticleLinks }) {
  const label = getCategory(id).labelZh;
  if (links.onOpenCategory) {
    return (
      <button type="button" className="article__chip" style={categoryStyle(id)} onClick={() => links.onOpenCategory!(id)}>
        {label}
      </button>
    );
  }
  if (links.categoryHref) {
    return (
      <a className="article__chip" style={categoryStyle(id)} href={links.categoryHref(id)}>
        {label}
      </a>
    );
  }
  return (
    <span className="article__chip" style={categoryStyle(id)}>
      {label}
    </span>
  );
}
