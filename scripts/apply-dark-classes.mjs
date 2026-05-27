import fs from "fs";
import path from "path";

const root = path.join(process.cwd(), "src");

/** Append dark: tailwind pairs where not already present. */
const rules = [
  [/border-slate-200(?!\s+dark:)/g, "border-slate-200 dark:border-slate-700"],
  [/border-slate-100(?!\s+dark:)/g, "border-slate-100 dark:border-slate-800"],
  [/border-slate-300(?!\s+dark:)/g, "border-slate-300 dark:border-slate-600"],
  [/border-dashed border-slate-300(?!\s+dark:)/g, "border-dashed border-slate-300 dark:border-slate-600"],
  [/bg-white(?!\s+dark:)/g, "bg-white dark:bg-slate-900"],
  [/bg-slate-50(?!\s+dark:)/g, "bg-slate-50 dark:bg-slate-800"],
  [/bg-slate-100(?!\s+dark:)/g, "bg-slate-100 dark:bg-slate-800"],
  [/text-slate-900(?!\s+dark:)/g, "text-slate-900 dark:text-slate-100"],
  [/text-slate-800(?!\s+dark:)/g, "text-slate-800 dark:text-slate-200"],
  [/text-slate-700(?!\s+dark:)/g, "text-slate-700 dark:text-slate-300"],
  [/text-slate-600(?!\s+dark:)/g, "text-slate-600 dark:text-slate-400"],
  [/text-slate-500(?!\s+dark:)/g, "text-slate-500 dark:text-slate-400"],
  [/text-slate-400(?!\s+dark:)/g, "text-slate-400 dark:text-slate-500"],
  // run dedupe after slate-400/500 rules — order matters in walk()
  [/bg-brand-50\/40(?!\s+dark:)/g, "bg-brand-50/40 dark:bg-brand-950/30"],
  [/bg-brand-50(?!\s+dark:|\/)/g, "bg-brand-50 dark:bg-brand-950/40"],
  [/border-brand-200(?!\s+dark:)/g, "border-brand-200 dark:border-brand-800"],
  [/border-brand-400(?!\s+dark:)/g, "border-brand-400 dark:border-brand-600"],
  [/hover:bg-brand-50(?!\s+dark:)/g, "hover:bg-brand-50 dark:hover:bg-brand-950/50"],
  [/hover:text-slate-800(?!\s+dark:)/g, "hover:text-slate-800 dark:hover:text-slate-200"],
  [/shadow-sm(?!\s+dark:)/g, "shadow-sm dark:shadow-slate-950/50"],
];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx|css)$/.test(ent.name)) {
      let s = fs.readFileSync(p, "utf8");
      let changed = false;
      for (const [re, rep] of rules) {
        const next = s.replace(re, rep);
        if (next !== s) {
          s = next;
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(p, s);
    }
  }
}

walk(root);
function dedupe(content) {
  return content.replace(/dark:text-slate-400 dark:text-slate-500/g, "dark:text-slate-400");
}

function walkDedupe(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkDedupe(p);
    else if (ent.name.endsWith(".tsx")) {
      const s = fs.readFileSync(p, "utf8");
      const next = dedupe(s);
      if (next !== s) fs.writeFileSync(p, next);
    }
  }
}

walkDedupe(root);
console.log("Dark mode classes applied.");
