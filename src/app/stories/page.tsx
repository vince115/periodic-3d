import type { Metadata } from "next";
import { StoriesOverview } from "@/components/stories/StoriesOverview";

export const metadata: Metadata = {
  title: "元素故事｜Periodic 3D",
  description: "先讀元素分類導讀，再逐一認識 118 種元素，附參考來源與查核狀態。",
};

export default function StoriesPage() {
  return <StoriesOverview />;
}
