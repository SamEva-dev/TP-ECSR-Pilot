import fs from "node:fs";

const backendFile = process.argv[2];
const frFile = process.argv[3] ?? "public/i18n/fr.json";
const enFile = process.argv[4] ?? "public/i18n/en.json";
if (!backendFile) throw new Error("Usage: node verify-error-translations.mjs <ErrorKeys.cs> [fr.json] [en.json]");

const backend = fs.readFileSync(backendFile, "utf8");
const fr = fs.readFileSync(frFile, "utf8");
const en = fs.readFileSync(enFile, "utf8");
const codes = [...backend.matchAll(/const string \w+\s*=\s*"([A-Z0-9_]+)"/g)].map(m => m[1]);
const missing = codes.filter(code => !fr.includes(code) || !en.includes(code));
if (missing.length) {
  console.error("Missing FR/EN backend error translations:");
  missing.forEach(x => console.error(` - ${x}`));
  process.exit(1);
}
console.log(`${codes.length} backend error keys have FR/EN entries.`);
