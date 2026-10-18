import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ElementStoryPage } from "@/components/stories/ElementStoryPage";
import { ELEMENTS, getElementByNumber } from "@/data/elements";

export const dynamicParams = false;

export function generateStaticParams() {
  return ELEMENTS.map((el) => ({ number: String(el.number) }));
}

export async function generateMetadata(props: PageProps<"/stories/elements/[number]">): Promise<Metadata> {
  const { number } = await props.params;
  const element = getElementByNumber(Number(number));
  if (!element) return {};
  return {
    title: `${element.number} ${element.nameZh}（${element.symbol}）｜元素介紹｜Periodic 3D`,
    description: element.summaryZh,
  };
}

export default async function ElementPage(props: PageProps<"/stories/elements/[number]">) {
  const { number } = await props.params;
  const element = getElementByNumber(Number(number));
  if (!element) notFound();
  return <ElementStoryPage number={element.number} />;
}
