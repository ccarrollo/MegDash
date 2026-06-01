"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Plan" },
  { href: "/doctors", label: "Doctors" },
  { href: "/anchors", label: "Anchors" },
  { href: "/inventory", label: "Inventory" },
  { href: "/sales", label: "Sales" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-violet-200 bg-fuchsia-50/95 safe-bottom dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-x-1 px-3 py-1">
        {links.map(({ href, label }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`py-3 text-center text-[11px] font-medium leading-tight tracking-tight sm:text-sm sm:tracking-normal ${
                active
                  ? "text-brand-600 dark:text-brand-400"
                  : "text-violet-700 hover:text-violet-950 dark:text-slate-400 dark:hover:text-slate-200"
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
