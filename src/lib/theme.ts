export const THEME_STORAGE_KEY = "meg-field-theme";

export type ThemeMode = "light" | "dark";

export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* private browsing */
  }
}

export function readStoredTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function initThemeFromStorage() {
  const stored = readStoredTheme();
  if (stored) {
    applyTheme(stored);
    return;
  }
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    applyTheme("dark");
  }
}
