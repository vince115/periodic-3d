"use client";

import Link from "next/link";
import type { ReactNode, Ref } from "react";
import { Atom, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface NavbarProps {
  menuButtonRef: Ref<HTMLButtonElement>;
  menuExpanded: boolean;
  menuControls: string;
  onMenuClick: () => void;
  /** Search field: inline on md+, its own full-width row on phones. */
  search?: ReactNode;
  /** Right-aligned controls, e.g. the 2D/3D view toggle. */
  trailing?: ReactNode;
}

export function Navbar({
  menuButtonRef,
  menuExpanded,
  menuControls,
  onMenuClick,
  search,
  trailing,
}: NavbarProps) {
  const MenuIcon = menuExpanded ? PanelLeftClose : PanelLeftOpen;
  return (
    <header className="navbar">
      <div className="flex min-h-[var(--navbar-h)] flex-wrap items-center gap-x-2 gap-y-2 px-2 py-1.5 sm:px-3">
        <button
          ref={menuButtonRef}
          type="button"
          className="icon-button"
          aria-label={menuExpanded ? "收合主選單" : "展開主選單"}
          aria-expanded={menuExpanded}
          aria-controls={menuControls}
          onClick={onMenuClick}
        >
          <MenuIcon aria-hidden className="size-5" />
        </button>

        <Link href="/" className="navbar__brand" aria-label="Periodic 3D 首頁">
          <span className="navbar__logo" aria-hidden>
            <Atom className="size-[1.1rem]" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-white">Periodic 3D</span>
            <span className="hidden text-[11px] text-slate-500 sm:block">互動式元素週期表</span>
          </span>
        </Link>

        {search && (
          <div className="order-last w-full md:order-none md:mx-auto md:max-w-[36rem] md:flex-1">
            {search}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {trailing}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
