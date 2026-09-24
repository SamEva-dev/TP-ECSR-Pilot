import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv.find((x, i) => i > 1 && x !== "--strict") ?? "src/app");
const strict = process.argv.includes("--strict");
const findings = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else if (entry.isFile() && p.endsWith(".ts")) {
      let text = fs.readFileSync(p, "utf8");
      // Type-only imports are compile-time contracts and do not execute mock data.
      text = text.replace(/import\s+type\s+[\s\S]*?from\s+["'][^"']*mock-data\/[^"']+["'];/g, "");
      // Also remove named imports made exclusively of `type X` entries.
      text = text.replace(/import\s*\{([\s\S]*?)\}\s*from\s*["'][^"']*mock-data\/[^"']+["'];/g, (full, body) => {
        const parts = body.split(",").map((x) => x.trim()).filter(Boolean);
        return parts.length > 0 && parts.every((x) => x.startsWith("type ")) ? "" : full;
      });
      if (/from\s+["'][^"']*mock-data\//.test(text)) findings.push(path.relative(root, p));
    }
  }
}
walk(root);

if (findings.length) {
  console.error(`Runtime legacy mock imports detected (${findings.length}):`);
  for (const f of findings) console.error(` - ${f}`);
  if (strict) process.exit(1);
} else {
  console.log("No runtime legacy business mock imports detected. API-only runtime guard passed.");
}
