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

# 【2026-10-07 追加：数字の決まり（scripts/reader-case/collect-prompt.md が正本）】
- 数字には1件ずつ numberKind（何の数字か）・asOf（出来事の日付。投稿日ではない）・quote（原文どおり15語以内。数字を含む）・sourceUrl・checkedAt を付ける。数を含む事実の文も同じ。
- 直接の支払い・取扱高・アンケートの区分を「年商・月商・売上」にしない。推定は numberKind: ESTIMATE（事実に入らない）。
- 創業と転機（FOUNDING・EVENT・TEAM・CHANNEL）の事実を必ず集める。料金と規約だけの記録にしない。
- 読めない出典（403等）は Web アーカイブの保存版か別の出典で取り直す。無ければ書かずに reaudit.unknown へ。
- 同じ事例の同じ種類の数字は突き合わせ、別の数字なら basis で見分ける。
- 事実の1文は、そのまま画面に出せる自然な日本語で書く（正本 .claude/skills/natural-japanese/SKILL.md を必ず読む。1文＝1つの事実、程度の語を使わない）。原文の引用は別欄 quote に残す。
  悪い例「Cool Tools経由はよく払い、Reddit経由はほぼ払わなかった」→ 良い例「Cool Toolsから来た読者は払う人が多く、Redditから来た読者は払う人がほとんどいなかった。人数は出典に無い」
- 書いた後に自分の文を英語に戻し（逆翻訳）、出典の英語と意味が合うかを確かめる。

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
