import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? "src/app";
const offenders = [];
const datePattern = /\b(?:0?[1-9]|[12]\d|3[01])\/(?:0?[1-9]|1[0-2])\/20\d{2}\b|\b20\d{2}[–-]20\d{2}\b/g;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.endsWith(".html")) {
      const source = fs.readFileSync(full, "utf8");
      for (const match of source.matchAll(datePattern)) {
        const line = source.slice(0, match.index).split("\n").length;
        offenders.push(`${full}:${line}: ${match[0]}`);
      }
    }
  }
}
walk(root);

if (offenders.length) {
  console.error("Hard-coded calendar dates found in Angular templates:");
  for (const row of offenders) console.error(` - ${row}`);
  process.exit(1);
}
console.log("No hard-coded calendar dates found in Angular templates.");
