"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import {
  Atom,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ImageOff,
  Info,
  Keyboard,
  MousePointerClick,
  Orbit,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import { SceneBoundary } from "@/components/three-d/SceneBoundary";
import { Bopomofo } from "./Bopomofo";
import { getCategory } from "@/data/categories";
import { useTheme } from "@/hooks/useTheme";
import { categoryStyle, shellColors } from "@/lib/element-colors";
import {
  SHELL_LABELS,
  formatAtomicMass,
  formatElectronConfiguration,
  formatGroup,
  parseElectronConfiguration,
} from "@/lib/element-utils";
import { getElementStory } from "@/lib/content";
import type { ChemicalElement, ElementCategoryId } from "@/types/element";
import { CategoryTagList } from "./CategoryTagList";

interface ElementDetailsProps {
  element: ChemicalElement | null;
  onClose: () => void;
  /** Hide the header close button when the surrounding panel provides one. */
  showClose?: boolean;
  /** Open the guide article of a category (from the classification tags). */
  onOpenCategory?: (id: ElementCategoryId) => void;
  /** Open this element's science story. */
  onOpenStory?: (number: number) => void;
  /** Hide the story entry when the story is already shown alongside (stories pages). */
  showStoryEntry?: boolean;
  /**
   * Whether the 3D atom view is expanded. Owned by the caller so the choice
   * survives switching elements (the card remounts per element for its slide-in).
   */
  atomOpen?: boolean;
  onAtomOpenChange?: (open: boolean) => void;
}

/** Widest possible shell (n = 4, 5 in real atoms) — used to scale the bars. */
const MAX_SHELL_ELECTRONS = 32;

// three.js is only downloaded once the user opens the atom view.
const AtomViewer = dynamic(() => import("@/components/three-d/AtomViewer"), {
  ssr: false,
  loading: () => (
    <div className="scene-message atom-canvas mt-3" role="status">
      正在載入原子結構…
    </div>
  ),
});

export function ElementDetails({
  element,
  onClose,
  showClose = true,
  onOpenCategory,
  onOpenStory,
  showStoryEntry = true,
  atomOpen,
  onAtomOpenChange,
}: ElementDetailsProps) {
  // Uncontrolled fallback when no owner is provided.
  const [localAtomOpen, setLocalAtomOpen] = useState(false);
  const showAtom = atomOpen ?? localAtomOpen;
  const setShowAtom = (open: boolean) => (onAtomOpenChange ?? setLocalAtomOpen)(open);
  // Shell bars double as the 3D atom's legend, so they share its palette.
  const palette = shellColors(useTheme());
  if (!element) return <EmptyState />;

  const category = getCategory(element.category);
  const config = parseElectronConfiguration(element.electronConfiguration);

  return (
    <article className="details-panel" style={categoryStyle(element.category)} aria-labelledby="details-title">
      <header className="flex items-start gap-4">
        <div className="details-symbol" aria-hidden>
          <span className="text-xs text-slate-200 tabular-nums">{element.number}</span>
          <span className="text-4xl font-semibold leading-none text-white">{element.symbol}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="details-title" className="text-2xl font-semibold text-white">
            <span className="details-name">
              {element.nameZh}
              <Bopomofo value={element.nameZhBopomofo} orientation="vertical" />
            </span>
            <span className="ml-2 text-base font-normal text-slate-400">{element.name}</span>
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            注音 <Bopomofo value={element.nameZhBopomofo} className="text-slate-200" />
            <span className="mx-1.5 text-slate-600">·</span>
            音同「<span className="text-slate-200">{element.nameZhHomophone}</span>」
          </p>
          <CategoryTagList element={element} onOpenCategory={onOpenCategory} />
        </div>
        {showClose && (
          <button type="button" onClick={onClose} className="icon-button" aria-label="關閉元素資訊">
            <X aria-hidden className="size-4" />
          </button>
        )}
      </header>

      <ElementPhoto element={element} />
      {showStoryEntry && <StoryEntry element={element} onOpenStory={onOpenStory} />}

      <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Fact label="原子序">{element.number}</Fact>
        <Fact label="元素符號">{element.symbol}</Fact>
        <Fact
          label={element.atomicMassKind === "standard" ? "標準原子量" : "最穩定同位素質量數"}
          hint={
            element.atomicMassUncertainty !== null
              ? `± ${element.atomicMassUncertainty}`
              : undefined
          }
        >
          {formatAtomicMass(element)}
        </Fact>
        <Fact label="週期">{element.period}</Fact>
        <Fact label="族">{formatGroup(element)}</Fact>
        <Fact label="區塊">{element.block} 區</Fact>
      </dl>

      <Section icon={<Atom aria-hidden className="size-4" />} title="電子排布">
        <p
          className="font-mono text-base text-slate-100"
          aria-label={formatElectronConfiguration(element.electronConfiguration)}
        >
          {config.map((part, i) => (
            <span key={i} className="mr-1.5 inline-block">
              {part.label}
              {part.count !== null && <sup className="text-[0.7em]">{part.count}</sup>}
            </span>
          ))}
        </p>
        {element.electronConfigurationPredicted && (
          <p className="mt-1 text-xs text-amber-200/80">此排布為理論預測值。</p>
        )}
      </Section>

      <Section icon={<Orbit aria-hidden className="size-4" />} title="原子結構與電子殼層分布">
        <button
          type="button"
          className="atom-toggle"
          aria-expanded={showAtom}
          aria-controls="atom-viewer-panel"
          onClick={() => setShowAtom(!showAtom)}
        >
          <Orbit aria-hidden className="size-4" />
          <span className="flex-1 text-left">{showAtom ? "收合 3D 原子結構" : "探索 3D 原子結構"}</span>
          <ChevronDown aria-hidden className="size-4 transition-transform" data-open={showAtom || undefined} />
        </button>
        {showAtom && (
          <div id="atom-viewer-panel">
            <SceneBoundary
              key={element.number}
              fallback={
                <p className="scene-message atom-canvas mt-3" role="status">
                  原子場景載入失敗，殼層電子數仍可於下方查看。
                </p>
              }
            >
              <AtomViewer key={element.number} element={element} />
            </SceneBoundary>
          </div>
        )}
        <ol
          className="mt-3 space-y-1.5"
          aria-label={`電子殼層分布：${element.shellElectrons.join("、")}`}
        >
          {element.shellElectrons.map((count, i) => (
            <li key={i} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 text-xs">
              <span className="text-slate-400">
                {SHELL_LABELS[i]} <span className="text-slate-500">n={i + 1}</span>
              </span>
              <span className="shell-bar" aria-hidden>
                <span
                  style={{
                    width: `${(count / MAX_SHELL_ELECTRONS) * 100}%`,
                    background: palette[i],
                  }}
                />
              </span>
              <span className="text-right font-mono tabular-nums text-slate-200">{count}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section icon={<Info aria-hidden className="size-4" />} title="簡介">
        <p className="text-sm leading-relaxed text-slate-300">{element.summaryZh}</p>
        <p className="mt-2 text-xs text-slate-500">{category.descriptionZh}</p>
      </Section>

      {element.notesZh.length > 0 && (
        <Section icon={<TriangleAlert aria-hidden className="size-4" />} title="資料附註">
          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-400">
            {element.notesZh.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </Section>
      )}
    </article>
  );
}

function Fact({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="fact">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="mt-0.5 font-mono text-base text-slate-100 tabular-nums">
        {children}
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </dd>
    </div>
  );
}

function Section({ icon, title, children }: { icon?: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="mt-5 border-t border-white/5 pt-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium tracking-wide text-slate-400">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function EmptyState() {
  return (
    <div className="details-panel details-panel--empty">
      <div className="flex size-12 items-center justify-center rounded-xl bg-white/5 text-sky-300">
        <Atom aria-hidden className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-white">尚未選取元素</h2>
      <p className="mt-1 text-sm text-slate-400">選取任一元素，即可查看原子量、電子排布與簡介。</p>
      <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
        <li className="flex items-center gap-2.5">
          <MousePointerClick aria-hidden className="size-4 text-slate-500" />
          點選週期表中的元素方格
        </li>
        <li className="flex items-center gap-2.5">
          <Search aria-hidden className="size-4 text-slate-500" />
          以中英文名稱、符號或原子序搜尋
        </li>
        <li className="flex items-center gap-2.5">
          <Keyboard aria-hidden className="size-4 text-slate-500" />
          使用方向鍵移動，Enter 選取，Esc 取消
        </li>
      </ul>
    </div>
  );
}

/** Photo from Wikimedia Commons with the attribution its licence requires. */
function ElementPhoto({ element }: { element: ChemicalElement }) {
  const { image } = element;
  if (!image) {
    return (
      <p className="element-photo element-photo--empty">
        <ImageOff aria-hidden className="size-4 shrink-0" />
        {element.imageNoteZh}
      </p>
    );
  }
  return (
    <figure className="element-photo">
      <Image
        // Keyed so the previous element's photo never lingers while loading.
        key={image.src}
        src={image.src}
        width={image.width}
        height={image.height}
        alt={`${element.nameZh}（${element.name}）：${image.captionZh}`}
        sizes="(min-width: 1280px) 23rem, 100vw"
        // Shown right after a user click, often the largest thing on screen.
        loading="eager"
        className="element-photo__img"
      />
      <figcaption className="mt-1.5 text-xs leading-relaxed text-slate-400">
        {image.captionZh}
        <span className="block text-slate-500">
          照片：
          <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="element-photo__link">
            {image.author}
          </a>
          {" · "}
          {image.licenseUrl ? (
            <a href={image.licenseUrl} target="_blank" rel="noreferrer license" className="element-photo__link">
              {image.license}
            </a>
          ) : (
            image.license
          )}
          {" · Wikimedia Commons"}
        </span>
      </figcaption>
    </figure>
  );
}

/** Entry point to the element's science story (or a note that it is being written). */
function StoryEntry({
  element,
  onOpenStory,
}: {
  element: ChemicalElement;
  onOpenStory?: (number: number) => void;
}) {
  const story = getElementStory(element.number);
  if (!story) {
    return (
      <p className="story-entry story-entry--pending">
        <BookOpen aria-hidden className="size-4 shrink-0" />
        {element.nameZh}的科學故事撰寫中，將在查核後陸續上線。
      </p>
    );
  }
  return (
    <button
      type="button"
      className="story-entry"
      onClick={() => onOpenStory?.(element.number)}
      disabled={!onOpenStory}
    >
      <BookOpen aria-hidden className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-xs text-slate-400">科學故事</span>
        <span className="block truncate font-medium text-white">{story.title}</span>
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0" />
    </button>
  );
}
