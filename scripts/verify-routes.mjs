import { existsSync } from "fs";

const dirs = ["src/app", "app", "pages", "src/pages"];
const found = dirs.filter((d) => existsSync(d));

if (!found.length) {
  console.error(
    "\n❌ No Next.js routes folder in this directory.\n" +
      "   Expected src/app (or app) to be committed to Git.\n" +
      "   Run: git add src public && git commit && git push\n",
  );
  process.exit(1);
}

console.log(`✓ Next.js routes found: ${found.join(", ")}`);
