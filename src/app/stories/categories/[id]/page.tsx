import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryStoryPage } from "@/components/stories/CategoryStoryPage";
import { isElementCategoryId } from "@/data/categories";
import { CATEGORY_GUIDES, getCategoryGuide } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORY_GUIDES.map((g) => ({ id: g.id }));
}

export async function generateMetadata(props: PageProps<"/stories/categories/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const guide = isElementCategoryId(id) ? getCategoryGuide(id) : undefined;
  if (!guide) return {};
  return {
    title: `${guide.nameZh}｜分類導讀｜Periodic 3D`,
    description: guide.definitionZh,
  };
}

export default async function CategoryPage(props: PageProps<"/stories/categories/[id]">) {
  const { id } = await props.params;
  if (!isElementCategoryId(id) || !getCategoryGuide(id)) notFound();
  return <CategoryStoryPage id={id} />;
}
