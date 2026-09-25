import fs from "node:fs";
import path from "node:path";

const appRoot = process.argv[2] ?? "src/app";
const projectRoot = path.resolve(appRoot, "..", "..");
const navFile = path.join(appRoot, "core", "navigation", "app-navigation.config.ts");
const frFile = path.join(projectRoot, "public", "i18n", "fr.json");
const enFile = path.join(projectRoot, "public", "i18n", "en.json");

const navSource = fs.readFileSync(navFile, "utf8");
const fr = JSON.parse(fs.readFileSync(frFile, "utf8"));
const en = JSON.parse(fs.readFileSync(enFile, "utf8"));

const roles = ["direction", "formateur", "stagiaire", "secretariat", "jury"];
const itemRegex = /\{\s*path:\s*"([^"]+)"[\s\S]*?labelKey:\s*"([^"]+)"[\s\S]*?audiences:\s*\[([^\]]*)\][\s\S]*?\}/g;

const items = [];
for (const match of navSource.matchAll(itemRegex)) {
  const audiences = [...match[3].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  items.push({ path: match[1], labelKey: match[2], audiences });
}

if (!items.length) {
  console.error("No navigation items found.");
  process.exit(1);
}

function read(dictionary, key) {
  return key.split(".").reduce((value, part) => value?.[part], dictionary);
}

const errors = [];
for (const item of items) {
  for (const [locale, dictionary] of [["fr", fr], ["en", en]]) {
    const value = read(dictionary, item.labelKey);
    if (typeof value !== "string" || !value.trim()) {
      errors.push(`${locale} missing/empty: ${item.labelKey} (${item.path})`);
    }
  }
  for (const role of item.audiences) {
    if (!roles.includes(role)) errors.push(`Unknown audience '${role}' on ${item.path}`);
  }
}

const expected = {
  direction: ["/accueil", "/organisation", "/etablissements", "/formations", "/referentiels", "/planning", "/stagiaires", "/promotions", "/certification", "/rapports", "/acces", "/administration"],
  formateur: ["/accueil", "/planning", "/stagiaires", "/seances", "/conduite", "/fiches", "/competences", "/presences", "/stages", "/documents", "/certification"],
  stagiaire: ["/accueil", "/planning", "/distanciel", "/seances", "/conduite", "/fiches", "/competences", "/stages", "/documents", "/certification"],
  secretariat: ["/accueil", "/planning", "/stagiaires", "/promotions", "/seances", "/presences", "/stages", "/documents", "/certification", "/resultats", "/reussites", "/rapports"],
  jury: ["/jury"],
};

for (const [role, requiredPaths] of Object.entries(expected)) {
  const paths = items.filter((item) => item.audiences.includes(role)).map((item) => item.path);
  for (const required of requiredPaths) {
    if (!paths.includes(required)) errors.push(`${role}: required menu missing ${required}`);
  }
}

if (errors.length) {
  console.error("Profile navigation verification failed:");
  errors.forEach((error) => console.error(` - ${error}`));
  process.exit(1);
}

console.log("Profile navigation verification passed.");
for (const role of roles) {
  const paths = items.filter((item) => item.audiences.includes(role)).map((item) => item.path);
  console.log(`${role}: ${paths.join(", ")}`);
}
