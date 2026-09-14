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
    batchId: e.batchId || undefined,
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

// 世代別（バッチ別）内訳
const batchGroups = {
  "batch-03-2026-09-14-capitalism100": { label: "第3期 今回収集 (100社)", items: [] },
  "batch-02-2026-09-13-expansion101": { label: "第2期 前回収集 (101社)", items: [] },
  "batch-01-core-foundation134": { label: "第1期 初期コア台帳 (134社)", items: [] },
  "other": { label: "その他バッチ", items: [] },
};

index.forEach((e) => {
  const bId = e.batchId || "other";
  if (batchGroups[bId]) {
    batchGroups[bId].items.push(e.name.trim());
  } else {
    batchGroups["other"].items.push(e.name.trim());
  }
});

const mdContent = `# 収集済み企業・サービス一覧リスト (Collected Entities Ledger)

> **更新日時**: ${new Date().toISOString().slice(0, 10)}
> **総登録社数**: ${uniqueNames.length} 社
> **内訳**:
> - 第3期 今回収集: ${batchGroups["batch-03-2026-09-14-capitalism100"].items.length} 社
> - 第2期 前回収集: ${batchGroups["batch-02-2026-09-13-expansion101"].items.length} 社
> - 第1期 初期コア: ${batchGroups["batch-01-core-foundation134"].items.length} 社
> **Raw URL**: https://raw.githubusercontent.com/salve-de/Make-money/codex/reliability-boundaries/docs/COLLECTED_ENTITIES.md
> **用途**: 外部AIへの「重複除外ブラックリスト」として使用。ここに記載された企業はすでに収集済みのため、絶対に取りに行くな。

---

## 50音・アルファベット順 全量一覧 (${uniqueNames.length} 社)

${uniqueNames.map((n, i) => `${i + 1}. ${n}`).join("\n")}
`;
fs.writeFileSync(docListPath, mdContent, "utf-8");

console.log(`[Registry Sync] Synced ${registry.length} entities to ${registryPath}, R2 Lake manifest, and ${docListPath}.`);

