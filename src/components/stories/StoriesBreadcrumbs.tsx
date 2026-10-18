import Link from "next/link";
import { STORIES_HOME } from "@/lib/stories-nav";

export function StoriesBreadcrumbs({ trail = [], current }: { trail?: string[]; current: string }) {
  return (
    <nav aria-label="導覽路徑" className="breadcrumbs">
      <span>學習</span>
      <span aria-hidden>/</span>
      <Link href={STORIES_HOME} className="hover:underline">
        元素故事
      </Link>
      {trail.map((t) => (
        <span key={t} className="contents">
          <span aria-hidden>/</span>
          <span>{t}</span>
        </span>
      ))}
      <span aria-hidden>/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}
