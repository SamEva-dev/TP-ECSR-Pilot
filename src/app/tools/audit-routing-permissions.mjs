/** S00: inventory declared frontend route permissions; no API authorization claim. */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
let ts;
try { ts = require("typescript"); }
catch {
  try { ts = require(path.resolve(path.dirname(process.execPath), "../lib/node_modules/typescript")); }
  catch { throw new Error("TypeScript is required to inventory route declarations."); }
}
const source = path.resolve(process.argv[2] || "src/app/app.routes.ts");
const output = path.resolve(process.argv[3] || "audit/S00/routes-permissions.csv");
const sf = ts.createSourceFile(source, fs.readFileSync(source, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const rows = [];
const propMap = (object) => Object.fromEntries(object.properties.filter(ts.isPropertyAssignment).map(p => [p.name.getText(sf), p.initializer]));
function extract(node, parent = "") {
  if (!ts.isObjectLiteralExpression(node)) return;
  const props = propMap(node);
  const segment = props.path?.text ?? "";
  const route = [parent, segment].filter(Boolean).join("/");
  const data = props.data && ts.isObjectLiteralExpression(props.data) ? propMap(props.data) : {};
  const permission = data.permission?.text ?? "";
  const roles = data.membershipRoles?.getText(sf) ?? data.roles?.getText(sf) ?? "";
  const component = props.loadComponent?.getText(sf).match(/import\(["']([^"']+)/)?.[1] ?? "";
  if (component) rows.push([route, component, permission, roles, "Contrôle frontend ; enforcement API non validé"]);
  if (props.children && ts.isArrayLiteralExpression(props.children)) for (const child of props.children.elements) extract(child, route);
}
function scan(node) {
  if (ts.isVariableDeclaration(node) && node.name.getText(sf) === "routes" && node.initializer && ts.isArrayLiteralExpression(node.initializer))
    for (const route of node.initializer.elements) extract(route);
  ts.forEachChild(node, scan);
}
scan(sf);
const escape = (s) => `"${String(s).replaceAll('"', '""')}"`;
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, [["Route Angular", "Composant", "Permission UI déclarée", "Rôles explicites UI", "Portée de preuve"], ...rows].map(r => r.map(escape).join(",")).join("\n") + "\n");
console.log(`${rows.length} routes/components répertoriés : ${output}`);
