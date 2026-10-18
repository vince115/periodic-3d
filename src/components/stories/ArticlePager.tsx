import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getStoryPosition } from "@/lib/stories-nav";

/** Previous / next article in the reading order (category guides, then elements). */
export function ArticlePager({ href }: { href: string }) {
  const position = getStoryPosition(href);
  if (!position) return null;
  const { index, total, previous, next } = position;

  return (
    <nav aria-label="上一篇與下一篇" className="story-pager">
      {previous ? (
        <Link href={previous.href} className="story-pager__link" rel="prev">
          <ChevronLeft aria-hidden className="size-5 shrink-0" />
          <span className="min-w-0">
            <span className="block text-xs text-slate-400">上一篇</span>
            <span className="block truncate font-medium text-white">{previous.label}</span>
          </span>
        </Link>
      ) : (
        <span />
      )}
      <p className="story-pager__count" aria-label={`第 ${index + 1} 篇，共 ${total} 篇`}>
        {index + 1} / {total}
      </p>
      {next ? (
        <Link href={next.href} className="story-pager__link story-pager__link--next" rel="next">
          <span className="min-w-0 text-right">
            <span className="block text-xs text-slate-400">下一篇</span>
            <span className="block truncate font-medium text-white">{next.label}</span>
          </span>
          <ChevronRight aria-hidden className="size-5 shrink-0" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
