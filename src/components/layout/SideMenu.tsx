"use client";

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { NAV_SECTIONS, type NavItem } from "@/data/navigation";

interface MenuListProps {
  activeId: string;
  /** Called after following a link (closes the mobile drawer). */
  onNavigate?: () => void;
}

/**
 * Navigation list shared by the desktop side menu and the mobile drawer.
 * In the desktop icon-rail state, labels are visually hidden by CSS but stay
 * in the accessibility tree.
 */
export function MenuList({ activeId, onNavigate }: MenuListProps) {
  return (
    <div className="flex flex-col gap-5">
      <SpaceHeader />
      {NAV_SECTIONS.map((section) => (
        <section key={section.id} aria-labelledby={`nav-${section.id}`}>
          <h2 id={`nav-${section.id}`} className="side-menu__section">
            {section.label}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.id}>
                <MenuItem item={item} active={item.id === activeId} onNavigate={onNavigate} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MenuItem({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon aria-hidden className="side-menu__icon" />
      <span className="side-menu__label">{item.label}</span>
      {item.status === "coming-soon" && <span className="side-menu__badge">即將推出</span>}
    </>
  );

  if (item.status === "coming-soon" || !item.href) {
    return (
      <span
        className="side-menu__item"
        aria-disabled="true"
        title={`${item.label}（即將推出）：${item.description}`}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className="side-menu__item"
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      title={`${item.label}：${item.description}`}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

/** Jira-style space header: what this sidebar navigates. */
function SpaceHeader() {
  return (
    <div className="side-menu__space">
      <span className="side-menu__space-avatar" aria-hidden>
        <FlaskConical className="size-4" />
      </span>
      <span className="side-menu__space-text">
        <span className="block truncate text-sm font-semibold text-white">元素探索</span>
        <span className="block truncate text-xs text-slate-400">化學學習空間</span>
      </span>
    </div>
  );
}
