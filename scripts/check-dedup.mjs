import fs from "node:fs";
import path from "node:path";

const query = process.argv[2];

if (!query) {
  console.log("Usage: node scripts/check-dedup.mjs <company-name-or-domain>");
  process.exit(0);
}

const registryPath = path.join(process.cwd(), "data", "collected-registry.json");
if (!fs.existsSync(registryPath)) {
  console.error("Error: data/collected-registry.json not found.");
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
const normQuery = query.toLowerCase().trim().replace(/[\s\-_・（）()株式会社有限会社]/g, "");

const matched = registry.find((item) => {
  if (item.normName === normQuery) return true;
  if (item.ticker && item.ticker.toLowerCase() === query.toLowerCase().trim()) return true;
  if (item.domain && item.domain.toLowerCase() === query.toLowerCase().trim()) return true;
  if (item.name.toLowerCase() === query.toLowerCase().trim()) return true;
  return false;
});

if (matched) {
  console.log(JSON.stringify({
    status: "EXISTS",
    message: `既に収集済みです: [${matched.name}] (ID: ${matched.id}, Ticker: ${matched.ticker || "N/A"}, Sector: ${matched.sector})`,
    entity: matched,
  }, null, 2));
} else {
  console.log(JSON.stringify({
    status: "AVAILABLE",
    message: `未収集です（重複なし）。新規収集可能です: "${query}"`,
    query,
  }, null, 2));
}
