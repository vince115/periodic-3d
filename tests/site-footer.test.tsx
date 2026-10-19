import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppShell } from "@/components/layout/AppShell";
import { COFFEE_URL, SiteFooter } from "@/components/layout/SiteFooter";

describe("SiteFooter", () => {
  it("links to Buy Me a Coffee in a new tab, and says so to screen readers", () => {
    render(<SiteFooter />);
    const coffee = screen.getByTestId("site-coffee");
    expect(coffee).toHaveTextContent("小額贊助，請我喝咖啡");
    const link = within(coffee).getByRole("link", { name: /Buy me a coffee/ });
    expect(COFFEE_URL).toBe("https://buymeacoffee.com/vince115");
    expect(link).toHaveAttribute("href", COFFEE_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveTextContent("（另開新分頁）");
  });

  it("appears at the bottom of every page built on the app shell", () => {
    render(
      <AppShell activeNavId="element-stories">
        <p>page content</p>
      </AppShell>,
    );
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBe(screen.getByTestId("site-footer"));
    // After the page content, not before it.
    const content = screen.getByText("page content");
    expect(content.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
