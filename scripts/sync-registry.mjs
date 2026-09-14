import fs from "node:fs";
import path from "node:path";

const indexPath = path.join(process.cwd(), "data", "entities-index.json");
const registryPath = path.join(process.cwd(), "data", "collected-registry.json");
const r2RegistryPath = path.join(process.cwd(), "data", "r2-local", "foundation-lake", "manifest", "collected-registry.json");

if (!fs.existsSync(indexPath)) {
  console.error("entities-index.json not found");
  process.exit(1);
}

const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
const registry = index.map((e) => {
  let domain = "";
  if (e.url) {
    try { domain = new URL(e.url).hostname.replace(/^www\./, ""); } catch {}
  }
  return {
    id: e.id,
    name: e.name,
    normName: e.name.toLowerCase().trim().replace(/[\s\-_・（）()株式会社有限会社]/g, ""),
    ticker: e.ticker || "",
    domain,
    sector: e.sector,
    status: e.pnl?.financialStatus || "UNKNOWN",
  };
});

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf-8");

const r2Dir = path.dirname(r2RegistryPath);
if (!fs.existsSync(r2Dir)) {
  fs.mkdirSync(r2Dir, { recursive: true });
}
fs.writeFileSync(r2RegistryPath, JSON.stringify(registry, null, 2), "utf-8");

console.log(`[Registry Sync] Synced ${registry.length} entities to ${registryPath} and R2 Lake manifest.`);
