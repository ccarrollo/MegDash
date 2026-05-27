"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Today" },
  { href: "/doctors", label: "Doctors" },
  { href: "/lunches", label: "Lunches" },
  { href: "/inventory", label: "Inventory" },
  { href: "/sales", label: "Sales" },
  { href: "/search", label: "Search" },
  { href: "/add", label: "Add" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 safe-bottom dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-lg">
        {links.map(({ href, label }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 py-3 text-center text-sm font-medium ${
                active
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
