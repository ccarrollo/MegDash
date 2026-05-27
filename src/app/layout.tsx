import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
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
  themeColor: "#2563eb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen pb-20 antialiased">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
                Meg Field
              </p>
              <p className="text-sm text-slate-500">Orthofix territory</p>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-lg px-4 py-4 safe-bottom">{children}</main>
        <Nav />
      </body>
    </html>
  );
}
