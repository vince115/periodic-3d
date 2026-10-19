"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { MenuList } from "./SideMenu";
import { Navbar } from "./Navbar";
import { SiteFooter } from "./SiteFooter";

/** Keep in sync with --navbar-h in globals.css (single-row navbar, lg+). */
export const NAVBAR_HEIGHT_PX = 48;

/** Tailwind `lg`: persistent side menu; below it the menu is a drawer. */
const DESKTOP_QUERY = "(min-width: 1024px)";
/** In "auto" mode the side menu shows labels only from this width up. */
const ROOMY_QUERY = "(min-width: 1600px)";

/**
 * - "auto": icon rail below 1600px (leaving room for the table), full menu above.
 *   Resolved in CSS, so there is no layout flash on load.
 * - "expanded" / "collapsed": the user's explicit choice via the menu button.
 */
type SidebarPreference = "auto" | "expanded" | "collapsed";

interface AppShellProps {
  /** NAV_SECTIONS item id of the current page. */
  activeNavId: string;
  search?: ReactNode;
  navbarTrailing?: ReactNode;
  children: ReactNode;
}

export function AppShell({ activeNavId, search, navbarTrailing, children }: AppShellProps) {
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const isRoomy = useMediaQuery(ROOMY_QUERY);
  const [preference, setPreference] = useState<SidebarPreference>("auto");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  const sidebarExpanded = preference === "auto" ? isRoomy : preference === "expanded";
  const showDrawer = drawerOpen && !isDesktop;

  const onMenuClick = () => {
    if (isDesktop) setPreference(sidebarExpanded ? "collapsed" : "expanded");
    else setDrawerOpen(true);
  };

  // Stable so the drawer's focus/Escape effect runs once per opening.
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    menuButton.current?.focus();
  }, []);

  return (
    <div className="app-shell" data-sidebar={preference}>
      <Navbar
        menuButtonRef={menuButton}
        menuExpanded={isDesktop ? sidebarExpanded : showDrawer}
        menuControls={isDesktop ? "side-menu" : "menu-drawer"}
        onMenuClick={onMenuClick}
        search={search}
        trailing={navbarTrailing}
      />
      <div className="flex">
        <nav id="side-menu" aria-label="主選單" className="side-menu">
          <MenuList activeId={activeNavId} />
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </div>
      {showDrawer && <MenuDrawer activeId={activeNavId} onClose={closeDrawer} />}
    </div>
  );
}

function MenuDrawer({ activeId, onClose }: { activeId: string; onClose: () => void }) {
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="menu-drawer" role="dialog" aria-modal="true" aria-label="主選單">
      <div className="menu-drawer__backdrop" aria-hidden onClick={onClose} />
      <nav id="menu-drawer" aria-label="主選單" className="menu-drawer__panel">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Periodic 3D</span>
          <button ref={closeButton} type="button" className="icon-button" aria-label="關閉主選單" onClick={onClose}>
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <MenuList activeId={activeId} onNavigate={onClose} />
      </nav>
    </div>
  );
}
