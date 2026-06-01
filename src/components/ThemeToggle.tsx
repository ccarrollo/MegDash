"use client";

import { useEffect, useState } from "react";
import { applyTheme, initThemeFromStorage, type ThemeMode } from "@/lib/theme";

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    initThemeFromStorage();
    setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
    setMounted(true);
  }, []);

  function toggle() {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    applyTheme(next);
    setMode(next);
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Theme"
        className="rounded-lg border border-violet-200 dark:border-slate-700 p-2 text-sm dark:border-slate-600"
      >
        ◐
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to night mode"}
      className="rounded-lg border border-violet-200 dark:border-slate-700 bg-violet-50/70 dark:bg-slate-800 px-2.5 py-1.5 text-sm text-violet-900 dark:text-slate-300 hover:bg-violet-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {mode === "dark" ? "☀️ Light" : "🌙 Night"}
    </button>
  );
}
