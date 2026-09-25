import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? "src/app";
const dictionaries = {
  fr: JSON.parse(fs.readFileSync("public/i18n/fr.json", "utf8")),
  en: JSON.parse(fs.readFileSync("public/i18n/en.json", "utf8")),
};

const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && /\.(html|ts)$/.test(entry.name)) files.push(full);
  }
}
walk(root);

const keyPattern = /["']([A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+)["']\s*\|\s*t\b/g;
const missing = [];

function get(dict, key) {
  return key.split(".").reduce((value, segment) =>
    value && typeof value === "object" ? value[segment] : undefined, dict);
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(keyPattern)) {
    const key = match[1];
    for (const [locale, dict] of Object.entries(dictionaries)) {
      const value = get(dict, key);
      if (typeof value !== "string" || !value.trim()) {
        missing.push(`${locale}: ${key} (${file})`);
      }
    }
  }
}

if (missing.length) {
  console.error("Missing/empty static UI translations:");
  for (const row of [...new Set(missing)].sort()) console.error(` - ${row}`);
  process.exit(1);
}
console.log("Static UI translation guard passed.");
