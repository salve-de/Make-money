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

// docs/COLLECTED_ENTITIES.md (人間・外部AI用シンプル除外リスト) の自動更新
const docListPath = path.join(process.cwd(), "docs", "COLLECTED_ENTITIES.md");
const uniqueNames = Array.from(new Set(index.map((e) => e.name.trim()))).sort((a, b) => a.localeCompare(b, "ja"));
const mdContent = `# 収集済み企業・サービス一覧リスト (Collected Entities Ledger)

> **更新日時**: ${new Date().toISOString().slice(0, 10)}
> **総登録社数**: ${uniqueNames.length} 社
> **Raw URL**: https://raw.githubusercontent.com/salve-de/Make-money/codex/reliability-boundaries/docs/COLLECTED_ENTITIES.md
> **用途**: 外部AIへの「重複除外ブラックリスト」として使用。ここに記載された企業はすでに収集済みのため、絶対に取りに行くな。

---

${uniqueNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}
`;
fs.writeFileSync(docListPath, mdContent, "utf-8");

console.log(`[Registry Sync] Synced ${registry.length} entities to ${registryPath}, R2 Lake manifest, and ${docListPath}.`);

