import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Periodic 3D｜互動式元素週期表",
  description: "繁體中文互動式元素週期表：118 種元素的原子量、分類、電子排布與殼層分布。",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#060a14" },
    { media: "(prefers-color-scheme: light)", color: "#f5f7fb" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="zh-Hant-TW"
      className={`${geistMono.variable} h-full antialiased`}
      // data-theme is set by the bootstrap script before hydration.
      suppressHydrationWarning
    >
      <head>
        {/*
          A plain blocking script (not next/script, which queues inline code
          until its runtime loads) so the theme applies before first paint.
          React warns about it only if the root layout re-renders on the
          client, which happens during dev Fast Refresh, not in normal use.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
