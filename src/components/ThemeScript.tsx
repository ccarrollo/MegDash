import { THEME_STORAGE_KEY } from "@/lib/theme";

/** Runs before paint to avoid light flash when night mode is saved. */
export function ThemeScript() {
  const script = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var t=localStorage.getItem(k);var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
