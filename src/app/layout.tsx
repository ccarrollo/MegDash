import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import { ThemeScript } from "@/components/ThemeScript";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meg Field",
  description: "Daily prospecting plan for Orthofix territory",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Meg Field",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#9333ea" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-[var(--bg)] pb-20 antialiased transition-colors">
        <header className="sticky top-0 z-10 border-b border-violet-200 bg-fuchsia-50/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
                Meg Field
              </p>
              <p className="text-sm text-violet-700 dark:text-slate-400">
                Orthofix territory
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-lg px-4 py-4 safe-bottom">{children}</main>
        <Nav />
      </body>
    </html>
  );
}
