"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Today" },
  { href: "/doctors", label: "Doctors" },
  { href: "/lunches", label: "Lunches" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 border-t border-slate-200 bg-white safe-bottom">
      <div className="mx-auto flex max-w-lg">
        {links.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 py-3 text-center text-sm font-medium ${
                active
                  ? "text-brand-600"
                  : "text-slate-500 hover:text-slate-800"
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
