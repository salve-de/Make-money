import fs from "node:fs";
import path from "node:path";

const indexPath = path.join(process.cwd(), "data", "entities-index.json");
const registryPath = path.join(process.cwd(), "data", "collected-registry.json");

const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));

// 収集済み社名一覧（一意化）
const collectedNames = Array.from(new Set(registry.map(e => e.name))).sort();

// 業種別の手薄セクター集計
const sectorCounts = {};
index.forEach(e => {
  const s = e.sector || "UNKNOWN";
  sectorCounts[s] = (sectorCounts[s] || 0) + 1;
});

const sortedSectors = Object.entries(sectorCounts).sort((a, b) => a[1] - b[1]);
const underrepresented = sortedSectors.slice(0, 4).map(([s, c]) => `${s} (現在わずか${c}社)`).join(", ");

const prompt = `【外部AI委託用：完全重複ゼロ ＆ 未開拓フロンティア発掘プロンプト】

# 前提
GitHubの https://raw.githubusercontent.com/salve-de/Make-money/main/docs/DATA_COLLECTION_MASTER_GUIDE.md を熟読せよ。
過去の重大やらかし事故（為替逆数掛けバグ、100倍誤爆、ID衝突、未確認フラグ欠落、SaaS誤爆）を1件たりとも繰り返すな。

# 【今回追加の絶対ルール：型と意味を壊さない】
- 数値は metricType / value / unit / currency を別フィールドで出力する。currency が不明なら null のままにし、USDへ補完しない。
- owner_tenure=25, unit=years, currency=null は「25年」であり、「$25 / 年」ではない。金額でないmetricを金額として書かない。
- 業種・AI分類は明示的な根拠がある場合だけ付与する。本文の部分文字列（例: remains に含まれる ai）から分類してはならない。根拠がなければ UNKNOWN。
- 欠損は null / UNKNOWN、候補段階は CANDIDATE のまま保存し、架空の補完やテンプレ作文をしない。

# 【絶対禁止：重複収集の完全遮断】
以下の【収集済み企業 ${collectedNames.length}社】は既に当社の台帳に格納済みである。
以下の企業（およびその同一サービス・直接の親会社/子会社）は【1件たりとも絶対に含めるな】。重複した事例は1秒で検知され即座に破棄される：

[収集済み企業リスト（除外対象）]
${collectedNames.join(", ")}

# 【優先収集フロンティア：手薄なセクターを集中爆撃せよ】
台帳の現在の業種別件数を基に、以下の領域を優先して新規事例を発掘せよ。件数の少なさは探索の手掛かりであり、他業種を除外する条件ではない：
優先セクター: ${underrepresented}

# 出力形式
完全体JSONフォーマット（docs/DATA_COLLECTION_MASTER_GUIDE.md 準拠）で新規50社〜100社のデータを一括出力せよ。
`;

const outPath = path.join(process.cwd(), "data", "next-collection-prompt.txt");
fs.writeFileSync(outPath, prompt, "utf-8");

console.log("==================================================================");
console.log("【完全重複ゼロ・収集プロンプトを自動生成しました】");
console.log("出力ファイル: data/next-collection-prompt.txt");
console.log(`除外対象（収集済み）: ${collectedNames.length}社を完全ブロック`);
console.log(`重点発掘セクター: ${underrepresented}`);
console.log("==================================================================");
