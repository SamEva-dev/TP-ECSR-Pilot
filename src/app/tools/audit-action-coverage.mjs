/**
 * S00: static inventory of Angular template events. This is not an API wiring test.
 * Usage: node src/tools/audit-action-coverage.mjs [src/app] [output.csv]
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "src/app");
const output = path.resolve(process.argv[3] || "audit/S00/actions-ui-inventaire.csv");
const ignoredEvents = new Set(["routerLinkActive"]);
const entries = [];

function roleOf(expression) {
  const s = expression.toLowerCase();
  if (/logout|deconnex|signout/.test(s)) return "Fermer la session";
  if (/delete|remove|supprim/.test(s)) return "Supprimer ou retirer une ressource";
  if (/create|add|ajout|invite/.test(s)) return "Créer, inviter ou ajouter une ressource";
  if (/save|persist|submit|enregist|valider/.test(s)) return "Enregistrer ou valider une opération";
  if (/update|edit|modif|toggle|change|switch/.test(s)) return "Modifier un état ou un paramètre";
  if (/open|close|show|hide|drawer|modal/.test(s)) return "Piloter l’interface locale (à confirmer)";
  if (/select|filter|search|sort|page|navigate|goTo/.test(s)) return "Sélectionner, filtrer ou naviguer";
  return "À qualifier selon le métier";
}
function csvEscape(v) { return `"${String(v ?? "").replaceAll('"', '""')}"`; }
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, item.name);
    if (item.isDirectory()) { walk(filename); continue; }
    if (!item.name.endsWith(".html")) continue;
    const source = fs.readFileSync(filename, "utf8");
    // Capture event bindings regardless of line breaks; Angular control-flow blocks are included.
    const matcher = /\(([\w.:\-]+)\)\s*=\s*(["'])([\s\S]*?)\2/g;
    const classSource = filename.replace(/\.html$/, ".ts");
    const component = fs.existsSync(classSource) ? fs.readFileSync(classSource, "utf8") : "";
    let match;
    while ((match = matcher.exec(source))) {
      if (ignoredEvents.has(match[1])) continue;
      const line = source.slice(0, match.index).split("\n").length;
      const expression = match[3].trim().replace(/\s+/g, " ");
      const functionMatch = expression.match(/^(?:\$event\s*;\s*)?(?:this\.)?([A-Za-z_$][\w$]*)\s*\(/);
      const method = functionMatch ? functionMatch[1] : "";
      const defined = method && new RegExp(`\\b${method}\\s*\\(`).test(component);
      entries.push([
        path.relative(root, filename).replaceAll("\\", "/"), line, match[1], expression,
        method, defined ? "Déclarée (statique)" : method ? "Non retrouvée / contexte à vérifier" : "Expression composée / à examiner",
        roleOf(expression), "Non attribué (S00)", "Non vérifiée (S00)",
        "À tracer : template → TS → service → HTTP → contrôleur → handler → DB → refresh"
      ]);
    }
    // A routerLink is an actionable navigation even without a DOM event binding.
    const navMatcher = /(?:\[routerLink\]|routerLink)\s*=\s*(["'])([\s\S]*?)\1/g;
    while ((match = navMatcher.exec(source))) {
      const line = source.slice(0, match.index).split("\n").length;
      const expression = match[2].trim().replace(/\s+/g, " ");
      entries.push([
        path.relative(root, filename).replaceAll("\\", "/"), line,
        "routerLink", expression, "", "Navigation déclarative",
        "Naviguer vers une route Angular", "Non attribué (S00)",
        "Non vérifiée (S00)", "À tracer : route → garde → profil → autorisation API éventuelle"
      ]);
    }
  }
}
walk(root);
entries.sort((a, b) => a[0].localeCompare(b[0]) || a[1] - b[1]);
fs.mkdirSync(path.dirname(output), { recursive: true });
const columns = ["Template", "Ligne", "Événement", "Expression", "Méthode candidate", "Présence méthode", "Rôle fonctionnel proposé", "Profil utilisateur", "Permission API", "État de vérification"];
fs.writeFileSync(output, [columns, ...entries].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n");
const unresolved = entries.filter((e) => !e[5].startsWith("Déclarée"));
console.log(`${entries.length} bindings d’événements répertoriés sur ${new Set(entries.map(e => e[0])).size} templates.`);
console.log(`${unresolved.length} expressions complexes ou méthodes à qualifier ; 0 chaîne UI/API déclarée validée sans preuve.`);
console.log(`Matrice : ${output}`);
