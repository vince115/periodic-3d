import { AppShell } from "@/components/layout/AppShell";
import { StoriesNav } from "@/components/stories/StoriesNav";

/** Shared frame for the overview, category guides and element pages. */
export default function StoriesLayout({ children }: LayoutProps<"/stories">) {
  return (
    <AppShell activeNavId="element-stories">
      <div className="stories-layout">
        <StoriesNav />
        <main className="stories-main">{children}</main>
      </div>
    </AppShell>
  );
}
