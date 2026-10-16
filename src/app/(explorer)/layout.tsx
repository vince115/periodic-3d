import { PeriodicExplorer } from "@/components/periodic-table/PeriodicExplorer";

/**
 * "/" (2D) and "/3d" share this layout, so switching views is a client-side
 * navigation that keeps the explorer mounted: selection, search, highlighted
 * category and a torn-off details panel all survive the switch. The explorer
 * reads the active view from the pathname.
 */
export default function ExplorerLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <PeriodicExplorer />
      {children}
    </>
  );
}
