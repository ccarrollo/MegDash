import fs from "fs";
import path from "path";

const root = path.join(process.cwd(), "src");

/** Light-mode slate/white → purple/violet. Skips classes that include "dark:". */
function lightOnlyReplace(content, from, to) {
  return content.replace(
    new RegExp(`(^|[^\\w-])${from}(?![^"'\\s]*dark:)`, "g"),
    `$1${to}`,
  );
}

const rules = [
  ["bg-white", "bg-violet-50"],
  ["bg-slate-50", "bg-violet-50/70"],
  ["bg-slate-100", "bg-violet-100"],
  ["border-slate-200", "border-violet-200"],
  ["border-slate-100", "border-violet-100"],
  ["border-slate-300", "border-violet-300"],
  ["text-slate-900", "text-violet-950"],
  ["text-slate-800", "text-violet-950"],
  ["text-slate-700", "text-violet-900"],
  ["text-slate-600", "text-violet-800"],
  ["text-slate-500", "text-violet-700"],
  ["text-slate-400", "text-violet-600"],
  ["hover:text-slate-800", "hover:text-violet-950"],
  ["file:bg-slate-100", "file:bg-violet-100"],
];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.(tsx|css)$/.test(ent.name)) {
      let s = fs.readFileSync(p, "utf8");
      let changed = false;
      for (const [from, to] of rules) {
        const next = lightOnlyReplace(s, from, to);
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
console.log("Light purple theme classes applied.");
