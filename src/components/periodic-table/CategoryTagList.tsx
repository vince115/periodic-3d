"use client";

import {
  CLASSIFICATION_STATUS_LABELS,
  FAMILY_LABELS,
  METALLICITY_LABELS,
  getCategory,
} from "@/data/categories";
import { categoryStyle } from "@/lib/element-colors";
import type { CategoryTag, ChemicalElement, ElementCategoryId } from "@/types/element";

interface CategoryTagListProps {
  element: ChemicalElement;
  onOpenCategory?: (id: ElementCategoryId) => void;
}

/**
 * Classification at a glance. The primary tag (solid, "主要分類") is the one
 * that colours the tile; secondary tags (outlined, "同時屬於") are documented
 * overlaps. Every tag shows its status, and the notes explain why.
 */
export function CategoryTagList({ element, onOpenCategory }: CategoryTagListProps) {
  const notes = [
    ...element.categoryTags.filter((t) => t.noteZh).map((t) => `${getCategory(t.id).labelZh}：${t.noteZh}`),
    ...(element.classificationNoteZh ? [element.classificationNoteZh] : []),
  ];

  return (
    <div className="mt-2">
      <ul className="flex flex-wrap items-center gap-1.5" aria-label="分類標籤">
        {element.categoryTags.map((tag) => (
          <li key={tag.id}>
            <TagLozenge tag={tag} onOpen={onOpenCategory} />
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
        {element.categoryTags.length > 1 ? "實心為主要分類（決定顏色），框線為同時屬於的分類" : "主要分類（決定顏色）"}
        {" · "}金屬性：{METALLICITY_LABELS[element.metallicity]}
        {element.familyTags.length > 0 && <> · {element.familyTags.map((f) => FAMILY_LABELS[f]).join("、")}</>}
      </p>
      {notes.length > 0 && (
        <details className="tag-notes">
          <summary>分類說明</summary>
          <ul>
            {notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function TagLozenge({ tag, onOpen }: { tag: CategoryTag; onOpen?: (id: ElementCategoryId) => void }) {
  const label = getCategory(tag.id).labelZh;
  const status = CLASSIFICATION_STATUS_LABELS[tag.status];
  const role = tag.role === "primary" ? "主要分類" : "同時屬於";
  const content = (
    <>
      {tag.role === "primary" && <span aria-hidden className="legend-item__swatch" />}
      <span className="sr-only">{role}：</span>
      {label}
      {status && <span className="tag-lozenge__status">{status}</span>}
    </>
  );
  const props = {
    className: "tag-lozenge",
    "data-role": tag.role,
    style: categoryStyle(tag.id),
    title: `${role}：${label}${status ? `（${status}）` : ""}${onOpen ? "，點選閱讀分類導讀" : ""}`,
  };
  return onOpen ? (
    <button type="button" {...props} onClick={() => onOpen(tag.id)}>
      {content}
    </button>
  ) : (
    <span {...props}>{content}</span>
  );
}
