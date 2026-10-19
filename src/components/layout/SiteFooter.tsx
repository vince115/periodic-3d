import { CoffeeCup } from "./CoffeeCup";

export const COFFEE_URL = "https://buymeacoffee.com/vince115";

/**
 * Site footer with a "Buy me a coffee" button, following the author's
 * aisiwhale project: a plain link (no Buy Me a Coffee script, which would load
 * its code and font on every page), drawn in the service's style — bold Lato
 * and its cup — with brown/yellow colours on dark and yellow/white on light.
 */
export function SiteFooter() {
  return (
    <footer className="site-footer" data-testid="site-footer">
      <div className="site-footer__inner">
        <p className="flex items-baseline gap-3">
          <span className="font-semibold text-white">Periodic 3D</span>
          <span className="text-xs text-slate-400">繁體中文互動式元素週期表</span>
        </p>
        <div className="site-footer__coffee" data-testid="site-coffee">
          <p className="text-xs text-slate-400">小額贊助，請我喝咖啡</p>
          <a href={COFFEE_URL} target="_blank" rel="noopener noreferrer" className="coffee-button">
            <CoffeeCup className="h-5 w-auto shrink-0" />
            <span className="coffee-button__label">Buy me a coffee</span>
            <span className="sr-only">（另開新分頁）</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
