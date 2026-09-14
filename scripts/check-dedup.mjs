import fs from "node:fs";
import path from "node:path";

// 既知のエイリアス・代表製品名・親会社マッピング
const KNOWN_ALIASES = {
  "basecamp": "37signals, llc（basecampは製品名）",
  "37signals": "37signals, llc（basecampは製品名）",
  "uniqlo": "fast retailing co., ltd. / uniqlo",
  "ユニクロ": "fast retailing co., ltd. / uniqlo",
  "ファーストリテイリング": "fast retailing co., ltd. / uniqlo",
  "facebook": "meta",
  "instagram": "meta",
  "whatsapp": "meta",
  "google": "alphabet",
  "youtube": "alphabet",
  "microacquire": "acquire.com",
  "convertkit": "kit (formerly convertkit)",
  "chatgpt": "openai",
  "anysphere": "cursor (anysphere)",
  "cursor": "cursor (anysphere)",
  "photoai": "photo ai",
  "interiorai": "interior ai",
  "loops": "loops.so",
  "dub": "dub.co",
  "screen studio": "screen studio",
  "ali abdaal": "ali abdaal courses",
  "egghead": "egghead.io",
  "posthog": "posthog",
  "cleanmymac": "cleanmymac (macpaw)",
  "macpaw": "cleanmymac (macpaw)",
};

const registryPath = path.join(process.cwd(), "data", "collected-registry.json");
if (!fs.existsSync(registryPath)) {
  console.error("Error: data/collected-registry.json not found.");
  process.exit(1);
}

const registry = JSON.parse(fs.readFileSync(registryPath, "utf-8"));

function normalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s\-_・（）()株式会社有限会社llcinc\.corp]/g, "");
}

function checkSingle(query) {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const qLower = trimmed.toLowerCase();
  const qNorm = normalize(trimmed);
  let qDomain = "";
  try {
    qDomain = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`).hostname.replace(/^www\./, "");
  } catch {}

  // 1. エイリアス確認
  const aliasTarget = KNOWN_ALIASES[qLower] || KNOWN_ALIASES[qNorm];

  // 2. 完全一致・ドメイン一致・ティッカー一致
  for (const item of registry) {
    const itemNorm = item.normName || normalize(item.name);
    const itemTicker = (item.ticker || "").toLowerCase();
    const itemDomain = (item.domain || "").toLowerCase();
    const itemNameLower = item.name.toLowerCase();

    // A. エイリアス一致
    if (aliasTarget && (itemNorm.includes(normalize(aliasTarget)) || itemNameLower.includes(aliasTarget.toLowerCase()))) {
      return {
        status: "EXISTS",
        matchType: "ALIAS_MATCH",
        reason: `エイリアス/製品名「${trimmed}」は既存の [${item.name}] に該当します`,
        matchedEntity: item,
      };
    }

    // B. 完全正規化一致
    if (itemNorm === qNorm && qNorm.length > 0) {
      return {
        status: "EXISTS",
        matchType: "EXACT_NAME",
        reason: `社名が完全に一致します: [${item.name}]`,
        matchedEntity: item,
      };
    }

    // C. ティッカー一致
    if (itemTicker && (itemTicker === qLower || itemTicker === qNorm)) {
      return {
        status: "EXISTS",
        matchType: "TICKER_MATCH",
        reason: `Tickerが一致します: [${item.ticker}] (${item.name})`,
        matchedEntity: item,
      };
    }

    // D. ドメイン一致
    if (qDomain && itemDomain && (itemDomain === qDomain || qDomain.endsWith(`.${itemDomain}`) || itemDomain.endsWith(`.${qDomain}`))) {
      return {
        status: "EXISTS",
        matchType: "DOMAIN_MATCH",
        reason: `ドメインが一致します: [${itemDomain}] (${item.name})`,
        matchedEntity: item,
      };
    }
  }

  // 3. 部分一致・あいまい判定 (有意な長さの文字列の場合)
  if (qNorm.length >= 3) {
    for (const item of registry) {
      const itemNorm = item.normName || normalize(item.name);
      if (itemNorm.includes(qNorm) || (qNorm.length >= 5 && qNorm.includes(itemNorm))) {
        return {
          status: "POSSIBLE_DUPLICATE",
          matchType: "PARTIAL_MATCH",
          reason: `類似の既存企業が見つかりました: [${item.name}] (既存ID: ${item.id})`,
          matchedEntity: item,
        };
      }
    }
  }

  return {
    status: "AVAILABLE",
    matchType: "NONE",
    reason: `未収集です（重複なし）。新規収集可能です。`,
    query: trimmed,
  };
}

// コマンドライン引数の処理
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
🔍 重複判定エンジン (Deduplication Registry Checker)
--------------------------------------------------
使用方法:
  1. 単一クエリ判定:
     pnpm dedup:check "Costco"
     pnpm dedup:check "basecamp"
     pnpm dedup:check "stripe.com"

  2. 複数一括判定:
     pnpm dedup:check "Costco" "Stripe" "新規SaaS"

  3. カンマ区切り一括判定:
     pnpm dedup:check --list "Costco, Stripe, Notion, 新規SaaS"

  4. テキストファイル一括判定:
     pnpm dedup:check --file candidate_companies.txt
`);
  process.exit(0);
}

let queries = [];

if (args[0] === "--file" && args[1]) {
  const filePath = path.resolve(process.cwd(), args[1]);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  queries = fs.readFileSync(filePath, "utf-8")
    .split(/\r?\n/)
    .map(line => line.trim().replace(/^[\d\.\-\*\s]+/, "")) // 行頭の番号や記号を除去
    .filter(Boolean);
} else if (args[0] === "--list" && args[1]) {
  queries = args[1].split(/[,、\n]/).map(s => s.trim()).filter(Boolean);
} else {
  queries = args;
}

if (queries.length === 1) {
  const result = checkSingle(queries[0]);
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log(`\n🔍 [一括重複監査] ${queries.length} 件の候補を照合中... (マスター台帳: ${registry.length}社)\n`);
  const duplicates = [];
  const warnings = [];
  const availables = [];

  for (const q of queries) {
    const res = checkSingle(q);
    if (!res) continue;
    if (res.status === "EXISTS") {
      duplicates.push({ query: q, matched: res.matchedEntity.name, reason: res.reason, id: res.matchedEntity.id });
    } else if (res.status === "POSSIBLE_DUPLICATE") {
      warnings.push({ query: q, matched: res.matchedEntity.name, reason: res.reason, id: res.matchedEntity.id });
    } else {
      availables.push(q);
    }
  }

  console.log(`=======================================================`);
  console.log(`📊 監査結果サマリー:`);
  console.log(`  - ❌ 重複（収集不可・除外対象）: ${duplicates.length} 件`);
  console.log(`  - ⚠️  類似疑い（要確認）:        ${warnings.length} 件`);
  console.log(`  - ✅ 安全（新規収集可能）:        ${availables.length} 件`);
  console.log(`=======================================================\n`);

  if (duplicates.length > 0) {
    console.log(`❌ 【重複・収集禁止リスト (${duplicates.length}件)】:`);
    duplicates.forEach((d, i) => {
      console.log(`  ${i + 1}. "${d.query}" ➔ 既存: [${d.matched}] (${d.id}) - ${d.reason}`);
    });
    console.log("");
  }

  if (warnings.length > 0) {
    console.log(`⚠️  【類似疑い・要確認リスト (${warnings.length}件)】:`);
    warnings.forEach((w, i) => {
      console.log(`  ${i + 1}. "${w.query}" ➔ 類似: [${w.matched}] (${w.id}) - ${w.reason}`);
    });
    console.log("");
  }

  console.log(`✅ 【新規収集GOリスト (${availables.length}件)】:`);
  console.log(availables.map((a, i) => `  ${i + 1}. ${a}`).join("\n"));
  console.log("");
}
