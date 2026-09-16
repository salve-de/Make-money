#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const CLAIMED_FILE = path.join(process.cwd(), "data", "CLAIMED_TARGETS.txt");
const REGISTRY_FILE = path.join(process.cwd(), "data", "collected-registry.json");

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
  "cleanmymac": "cleanmymac (macpaw)",
  "macpaw": "cleanmymac (macpaw)",
};

function normalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/[\s\-_・（）()株式会社有限会社llcinc\.corp]/g, "");
}

export function checkDuplicate(query) {
  const trimmed = query.trim();
  if (!trimmed) return { exists: false, status: "EMPTY" };

  const qLower = trimmed.toLowerCase();
  const qNorm = normalize(trimmed);
  let qDomain = "";
  try {
    qDomain = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`).hostname.replace(/^www\./, "");
  } catch {}

  // 1. エイリアス解決
  let targetNorm = qNorm;
  if (KNOWN_ALIASES[qLower]) {
    targetNorm = normalize(KNOWN_ALIASES[qLower]);
  }

  // 2. 収集済み台帳 (collected-registry.json) をチェック
  if (fs.existsSync(REGISTRY_FILE)) {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf-8"));
    for (const r of registry) {
      const rNorm = r.normName || normalize(r.name);
      // 完全一致
      if (rNorm === targetNorm || rNorm === qNorm) {
        return {
          exists: true,
          status: "EXISTS",
          matchType: "EXACT_NAME",
          reason: `【収集済み】既に中央台帳に登録されています: "${r.name}" (ID: ${r.id})`,
          entity: r
        };
      }
      // Ticker一致
      if (r.ticker && (r.ticker.toLowerCase() === qLower || r.ticker.toLowerCase() === qNorm)) {
        return {
          exists: true,
          status: "EXISTS",
          matchType: "TICKER_MATCH",
          reason: `【収集済み】Tickerが一致します: "${r.ticker}" (${r.name})`,
          entity: r
        };
      }
      // ドメイン一致（qDomainが有意な場合のみ）
      if (qDomain && r.domain && (r.domain.toLowerCase() === qDomain || qDomain.endsWith(`.${r.domain.toLowerCase()}`) || r.domain.toLowerCase().endsWith(`.${qDomain}`))) {
        return {
          exists: true,
          status: "EXISTS",
          matchType: "DOMAIN_MATCH",
          reason: `【収集済み】ドメインが一致します: "${r.domain}" (${r.name})`,
          entity: r
        };
      }
      // 有意な部分一致 (5文字以上)
      if (qNorm.length >= 5 && rNorm.length >= 5 && (rNorm === qNorm || (rNorm.length === qNorm.length && rNorm.includes(qNorm)))) {
        return {
          exists: true,
          status: "EXISTS",
          matchType: "PARTIAL_MATCH",
          reason: `【収集済み】類似企業が既に存在します: "${r.name}"`,
          entity: r
        };
      }
    }
  }

  // 3. 予約中台帳 (CLAIMED_TARGETS.txt) をチェック
  if (fs.existsSync(CLAIMED_FILE)) {
    const lines = fs.readFileSync(CLAIMED_FILE, "utf8").split("\n");
    for (const line of lines) {
      const lineTrim = line.trim();
      if (!lineTrim || lineTrim.startsWith("#")) continue;
      // 行から社名部分のみ抽出（括弧内や [CLAIMED:...] を除去）
      const cleanLine = lineTrim.split("[CLAIMED")[0].split("(")[0].trim();
      const lineNorm = normalize(cleanLine);
      if (!lineNorm) continue;

      if (lineNorm === targetNorm || lineNorm === qNorm) {
        return {
          exists: true,
          status: "CLAIMED",
          matchType: "CLAIM_EXACT",
          reason: `【予約中/他AI調査中】既に台帳に掲載されています: "${lineTrim}"`
        };
      }

      // 有意な一致（4文字以上かつ互いに含む場合）
      if (qNorm.length >= 4 && lineNorm.length >= 4) {
        if (lineNorm.includes(qNorm) || qNorm.includes(lineNorm)) {
          // 長さの比率チェック（誤爆防止）
          const minLen = Math.min(lineNorm.length, qNorm.length);
          const maxLen = Math.max(lineNorm.length, qNorm.length);
          if (minLen / maxLen > 0.6) {
            return {
              exists: true,
              status: "CLAIMED",
              matchType: "CLAIM_SIMILAR",
              reason: `【予約中/他AI調査中】類似の企業が既に台帳に掲載されています: "${lineTrim}"`
            };
          }
        }
      }
    }
  }

  return {
    exists: false,
    status: "AVAILABLE",
    reason: `未収集です（重複なし）。新規収集可能です。`,
    query: trimmed
  };
}

export function claimTarget(query, agentId = "CLI", autoSync = true) {
  const check = checkDuplicate(query);
  if (check.exists) {
    console.error(`\n❌ [REJECTED: DUPLICATE FOUND]`);
    console.error(`   ${check.reason}`);
    console.error(`   別の未調査企業を選定してください。\n`);
    process.exit(1);
  }

  // 追記
  const entry = `${query.trim()} [CLAIMED:${agentId} @ ${new Date().toISOString().slice(0, 10)}]`;
  fs.appendFileSync(CLAIMED_FILE, `\n${entry}\n`, "utf8");

  console.log(`\n✓ [CLAIM SUCCESSFUL: LOCKED]`);
  console.log(`   Target: "${query.trim()}"`);
  console.log(`   Claimed By: ${agentId}`);
  console.log(`   File: data/CLAIMED_TARGETS.txt に予約ロックを記録しました。`);

  if (autoSync) {
    try {
      console.log(`   [SYNC] Cloudflare R2台帳へ即時同期中...`);
      execSync("node scripts/with-r2-keychain-secrets.mjs npx tsx scripts/pipeline/sync-claims-r2.ts push", {
        stdio: "ignore"
      });
      console.log(`   ✓ [R2 SYNC] R2の共有台帳へ反映完了。全PC・全AIに予約が共有されました。\n`);
    } catch {
      console.warn(`   ⚠️ [WARN] R2同期はスキップされました（オフラインまたは認証未設定）。ローカル台帳には記録済みです。\n`);
    }
  }
}

// CLI実行時
if (process.argv[1]?.endsWith("claim.mjs")) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`
MAKEMONEY CLAIM & DEDUPLICATION MANAGER (Multi-PC / Multi-Agent)

Usage:
  pnpm claim <企業名またはドメイン>           # 重複照合の上、台帳＆R2に即時予約ロック
  pnpm claim --check <企業名またはドメイン>   # 重複しているか確認のみ（予約しない）
  pnpm claim:sync                           # R2とローカルの台帳を双方向同期

Examples:
  pnpm claim "PostHog"
  pnpm claim --check "Shopify"
  pnpm claim "Cursor"
`);
    process.exit(0);
  }

  if (args[0] === "--check") {
    const query = args.slice(1).join(" ");
    if (!query) {
      console.error("Error: --check に企業名を指定してください。");
      process.exit(1);
    }
    const res = checkDuplicate(query);
    if (res.exists) {
      console.log(`\n❌ [DUPLICATE] ${res.reason}\n`);
      process.exit(1);
    } else {
      console.log(`\n✓ [AVAILABLE] "${query}" は未登録・未予約です。新規調査可能です。\n`);
      process.exit(0);
    }
  } else {
    const query = args.join(" ");
    claimTarget(query, process.env.AGENT_ID || "CLI");
  }
}
