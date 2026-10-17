import type { Metadata } from "next";
import { StoriesHub } from "@/components/stories/StoriesHub";

export const metadata: Metadata = {
  title: "元素故事｜Periodic 3D",
  description: "元素分類導讀與個別元素的科學故事，附參考來源與查核狀態。",
};

export default function StoriesPage() {
  return <StoriesHub />;
}
