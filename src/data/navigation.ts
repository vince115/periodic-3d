import { BookOpen, Box, Gamepad2, LayoutGrid, type LucideIcon } from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Route for available items; coming-soon items have no destination yet. */
  href?: string;
  status: "available" | "coming-soon";
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}

/** Site navigation shown in the left menu. Add pages here as they ship. */
export const NAV_SECTIONS: readonly NavSection[] = [
  {
    id: "explore",
    label: "探索",
    items: [
      {
        id: "periodic-table",
        label: "元素週期表",
        description: "118 種元素的互動式週期表",
        icon: LayoutGrid,
        href: "/",
        status: "available",
      },
      {
        id: "periodic-table-3d",
        label: "3D 週期表",
        description: "以立體場景瀏覽元素",
        icon: Box,
        href: "/3d",
        status: "available",
      },
    ],
  },
  {
    id: "learn",
    label: "學習",
    items: [
      {
        id: "element-stories",
        label: "元素故事",
        description: "元素分類導讀與元素的科學故事",
        icon: BookOpen,
        href: "/stories",
        status: "available",
      },
    ],
  },
  {
    id: "play",
    label: "遊戲",
    items: [
      {
        id: "periodic-table-game",
        label: "週期表遊戲",
        description: "用遊戲記住元素與位置",
        icon: Gamepad2,
        status: "coming-soon",
      },
    ],
  },
];
