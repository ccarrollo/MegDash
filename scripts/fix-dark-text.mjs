import fs from "fs";
import path from "path";

const root = path.join(process.cwd(), "src");

const rules = [
  [/dark:text-violet-950/g, "dark:text-slate-100"],
  [/dark:text-violet-900/g, "dark:text-slate-200"],
  [/dark:text-violet-800/g, "dark:text-slate-300"],
  [/dark:text-violet-700/g, "dark:text-slate-400"],
  [/dark:text-violet-600/g, "dark:text-slate-400"],
  [/dark:hover:text-violet-950/g, "dark:hover:text-slate-200"],
];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith(".tsx")) {
      let s = fs.readFileSync(p, "utf8");
      let changed = false;
      for (const [re, rep] of rules) {
        const next = s.replace(re, rep);
        if (next !== s) {
          s = next;
          changed = true;
        }
      }
      s = s.replace(/dark:text-slate-400 dark:text-slate-400/g, "dark:text-slate-400");
      if (changed) fs.writeFileSync(p, s);
    }
  }
}

walk(root);
console.log("Restored dark-mode text contrast.");
