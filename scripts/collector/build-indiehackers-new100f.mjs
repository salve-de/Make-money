#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const SNAPSHOT = "2026-09-16";
const AGENT_ID = "codex-20260916-ih-new100f";
const BATCH_ID = "batch-indie-hackers-new100f-20260916";
const CLAIMS_FILE = path.join(ROOT, "data/CLAIMED_TARGETS.txt");
const OUT_FILE = path.join(ROOT, "data/incoming/batch_indiehackers_new100f_20260916.json");
const SOURCE_FILE = path.join(ROOT, "data/incoming/batch_indiehackers_new100f_sources_20260916.json");
const RECEIPT_FILE = path.join(ROOT, "data/incoming/batch_indiehackers_new100f_official_checks_20260916.json");

const collectorSource = fs.readFileSync(path.join(ROOT, "scripts/collector/collect-indiehackers-1000.mjs"), "utf8");
const APP = collectorSource.match(/const APP = '([^']+)'/)?.[1];
const KEY = collectorSource.match(/const KEY = '([^']+)'/)?.[1];
const ENDPOINT = `https://${APP}-dsn.algolia.net/1/indexes/products/query`;
const TERMS = ["a", "e", "i", "o", "u", "s", "t", "r", "n", "c", "m", "p", "l", "d", "g", "h", "b", "f", "w", "y"];

const forbidden = /(iptv|paypal\s*account|buy\s*(old\s*)?(account|gmail)|account(s)?\s*(market|for\s*sale)|ransomware|crypto|bitcoin|binance|daily\s*profit|investment\s*earn|casino|gambl|escort|porn|xxx|adult|sportsbook|betting|guest\s*post|followers|likes|instagram\s*service|facebook\.com|tiktok\s*views|youtube\s*views|nft\s*mint|forex\s*signal|deepfake|link\s*building|backlink|seo\s*agency|press\s*agency|marketing\s*agency|web\s*development\s*company|smm|airbnb\s*clone\s*script|psychedelic|shroom)/i;
const qualityReject = /(games?\s+in\s+india|mugs|mailing\s+database|weight\s+loss|massive\s+traffic|youtube\.com|\.gumroad\.com|nft|anonymous\s+job|scamsrapid|tinyurl|affiliate\s+videos|bestproxy|proxyshare|proxy provider|printmonkey|kidpofy|yournextsquad|coaching\s+for\s+founders|digital marketing simplified|marketing\s+agency|devops consulting|webflow development|seo growth marketing|rank tracking|facebook interest|facebook ads|blog writing|growmysaas|submit your startup|online courses|personal finance|financial independence|AI Girl|voice clone|cold calling|lead generation|appointment setting)/i;
const social = /(?:^|:\/\/)(?:www\.)?(?:facebook\.com|twitter\.com|x\.com|linkedin\.com|instagram\.com|t\.me|wa\.me)(?:\/|$)/i;

function tidy(value, max = 700) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function slug(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 34) || "case";
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function domain(value) {
  try { return new URL(value).hostname.toLowerCase().replace(/^www\./, ""); } catch { return ""; }
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function listingUrl(productId) {
  return `https://www.indiehackers.com/product/${encodeURIComponent(productId)}`;
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function tagsOf(item) {
  return Array.from(new Set((Array.isArray(item._tags) ? item._tags : []).filter((tag) => typeof tag === "string")));
}

function sectorFor(tags) {
  const has = (prefix) => tags.some((tag) => tag.startsWith(prefix));
  if (has("vertical-ai")) return "AI_AUTOMATION";
  if (has("vertical-finance") || has("vertical-investing") || has("vertical-payments") || has("vertical-banking")) return "FINTECH_INFRA";
  if (has("vertical-hardware") || has("vertical-food") || has("vertical-clothing") || has("vertical-shopping") || has("vertical-manufacturing")) return "PHYSICAL_ASSET";
  if (has("vertical-content") || has("vertical-news") || has("vertical-movies") || has("vertical-music") || has("vertical-podcasting") || has("vertical-advertising") || has("vertical-email-marketing")) return "CONTENT_MEDIA";
  if (has("vertical-local") || has("vertical-home") || has("vertical-travel")) return "LOCAL_SERVICES";
  return "NICHE_SAAS";
}

function scaleFor(tags) {
  if (tags.includes("founders-solo") || tags.includes("employees-0")) return "SOLO";
  if (tags.includes("employees-under-10")) return "SMALL_TEAM";
  if (tags.some((tag) => /^employees-(10|50|200|500|1k)/.test(tag))) return "SCALEUP";
  return "UNKNOWN";
}

function revenueModel(tags) {
  const models = tags.filter((tag) => tag.startsWith("revenue-model-")).map((tag) => tag.slice("revenue-model-".length));
  return models.length ? models.join(", ") : "未確認";
}

function platforms(tags) {
  return tags.filter((tag) => tag.startsWith("platform-")).map((tag) => tag.slice("platform-".length)).slice(0, 4);
}

function painText(item) {
  const description = tidy(item.description, 380);
  const tagline = tidy(item.tagline, 220);
  return `公開説明「${description || tagline}」が示す、${tagline || "特定課題"}への支出意向`;
}

function nameTokens(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/)
    .filter((token) => token.length >= 4 && !["the", "app", "free", "pro", "online", "software", "tool", "product"].includes(token));
}

async function fetchPool() {
  const pool = new Map();
  for (const query of TERMS) {
    const params = new URLSearchParams({ hitsPerPage: "1000", page: "0", query, numericFilters: "revenue>=1000,revenue<=100000" });
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "X-Algolia-Application-Id": APP, "X-Algolia-API-Key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ params: params.toString() }),
    });
    if (!response.ok) throw new Error(`Algolia ${response.status} for ${query}`);
    for (const hit of (await response.json()).hits ?? []) pool.set(hit.productId ?? hit.objectID, hit);
  }
  return [...pool.values()];
}

function claimedTargets() {
  return fs.readFileSync(CLAIMS_FILE, "utf8").split(/\r?\n/)
    .filter((line) => line.includes(`[CLAIMED:${AGENT_ID}`))
    .map((line) => {
      const [name, targetDomain] = line.split(" [CLAIMED:")[0].split(" — ");
      return { name: tidy(name, 220), domain: tidy(targetDomain, 220) };
    });
}

function eligible(item) {
  const name = tidy(item.name, 220);
  const tagline = tidy(item.tagline, 240);
  const description = tidy(item.description, 700);
  const url = tidy(item.websiteUrl, 500);
  const year = Number(String(item.startDateStr ?? "").slice(0, 4));
  const tags = tagsOf(item);
  return name.length >= 3 && tagline.length >= 12 && description.length >= 20 && /^https?:\/\//i.test(url)
    && domain(url) && year >= 2024 && year <= 2026 && tags.some((tag) => ["founders-solo", "employees-0", "employees-under-10"].includes(tag)) && !social.test(url)
    && !forbidden.test(`${name} ${tagline} ${description} ${url}`)
    && !qualityReject.test(`${name} ${tagline} ${description} ${url}`);
}

function selectClaimed(pool) {
  const wanted = claimedTargets();
  const byDomain = new Map(pool.filter(eligible).map((item) => [domain(item.websiteUrl), item]));
  const selected = wanted.map((target) => byDomain.get(target.domain)).filter(Boolean);
  if (selected.length !== wanted.length) {
    const missing = wanted.filter((target) => !byDomain.has(target.domain));
    throw new Error(`claimed source records missing: ${missing.map((target) => `${target.name} <${target.domain}>`).join(", ")}`);
  }
  const keys = new Set(selected.map((item) => `${normalize(item.name)}|${domain(item.websiteUrl)}`));
  if (keys.size !== selected.length || selected.length !== 100) throw new Error(`expected 100 unique claimed records, got ${selected.length}`);
  return selected;
}

async function auditUrl(url, name) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(9000), headers: { "user-agent": "Make-Money-source-audit/1.0" } });
      const body = await response.text();
      const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim().slice(0, 180);
      const page = `${title} ${response.url}`.toLowerCase();
      const matchedTokens = nameTokens(name).filter((token) => page.includes(token));
      return { status: response.status, finalUrl: response.url, title, matchedTokens, checkedAt: SNAPSHOT };
    } catch (error) {
      lastError = error;
    }
  }
  return { status: null, finalUrl: url, title: "", matchedTokens: [], error: lastError?.name ?? "FETCH_ERROR", checkedAt: SNAPSHOT };
}

async function auditSelected(selected) {
  const results = new Array(selected.length);
  let cursor = 0;
  async function worker() {
    while (cursor < selected.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await auditUrl(selected[index].websiteUrl, selected[index].name);
    }
  }
  await Promise.all(Array.from({ length: 8 }, () => worker()));
  return results;
}

function buildEntity(item, audit) {
  const tags = tagsOf(item);
  const official = tidy(item.websiteUrl, 500);
  const listing = listingUrl(item.productId ?? item.objectID ?? item.name);
  const key = `${item.productId ?? item.objectID ?? item.name}|${official}`;
  const hash = digest(key);
  const id = `ent_${slug(item.name)}_${hash}`;
  const revenue = Number(item.revenue) || 0;
  const tagline = tidy(item.tagline, 240);
  const description = tidy(item.description, 700);
  const sector = sectorFor(tags);
  const model = revenueModel(tags);
  const pain = painText(item);
  const revenueLabel = `Indie Hackers表示: US$${formatUsd(revenue)}/month（報告値・利益ではない）`;
  const officialStatus = audit.status == null ? "ERROR" : String(audit.status);
  const officialVerified = audit.status === 200;
  const officialTitle = tidy(audit.title, 180) || "タイトル未取得";
  const platformText = platforms(tags).length ? platforms(tags).join(", ") : "未確認";
  const executionChecklist = sector === "PHYSICAL_ASSET"
    ? ["仕入れ・配送・返品または現場稼働を計測し、売上表示を粗利と混同しない。", "在庫・人員・前金の増加が資金繰りに与える影響を確認する。", `公開説明と公式URL（${official}）の提供実体を照合する。`]
    : sector === "CONTENT_MEDIA"
      ? ["流入元を検索・SNS・紹介・広告に分け、単一媒体への依存を測る。", "制作・配信・紹介料を売上から分離し、継続利用の根拠を取得する。", `掲載値は${revenueLabel}として保存し、利益へ昇格させない。`]
      : sector === "FINTECH_INFRA"
        ? ["金融・契約データの誤判定コストと規制境界を先に確認する。", "取引手数料、審査・サポート工数、損失上限を別帳簿で取得する。", `公式URL（${official}）と掲載説明の対象範囲を照合する。`]
        : ["対象業務を『${tagline}』の当事者に絞り、支払理由を一次情報で確認する。", "API・サポート・導入・広告の費用を分離し、表示売上から手残りを推測しない。", `収益モデルタグ（${model}）と公式URL（${official}）の提供条件を照合する。`];
  const unknowns = [
    "公開月間売上欄は利益ではなく、独立監査済みかどうかも確認できない。",
    "原価、営業経費、営業利益、純利益、成長率、為替換算は未確認。",
    "創業者名、法人名、国、顧客数、継続率、チーム人数、価格、技術スタックは未確認。",
    `公式URL監査はHTTP ${officialStatus}。到達性は売上・利益・継続性の証拠ではない。`,
  ];
  const pnl = {
    monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0,
    isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true,
    isCostsUnconfirmed: true, isNetProfitUnconfirmed: true, financialStatus: "UNAVAILABLE",
    dataSnapshotPeriod: `${SNAPSHOT} Indie Hackers公開レコード`, sourceDoc: listing, sourceClass: "COMMUNITY",
    revenueLabel, estimationLogic: "公開月間売上表示は報告値。利益・原価・経費・税・為替換算の根拠がないため、JPYのP&L数値は確定していない。", confidenceScore: 0,
  };
  return {
    id, ticker: `IH${hash.slice(0, 8).toUpperCase()}`, name: tidy(item.name, 220), legalEntity: "UNKNOWN (公開ディレクトリ情報では法人名未確認)",
    tagline: `「${tagline}」の課題に対し、${revenueLabel}。利益は未確認。`, sector, scale: scaleFor(tags), founder: "UNKNOWN (公開レコードでは実名未確認)", country: "GLOBAL", url: official, verifiedBadge: false,
    pnl,
    operations: { teamSize: 0, initialTeamSize: 0, currentTeamSize: 0, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: ["Indie Hackers product directory", "official website", ...platforms(tags)].slice(0, 5), toolStack: [], isTeamSizeUnconfirmed: true, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true },
    strategy: {
      blindspot: `「${tagline}」という狭い課題への集中。競合の見落とし・大手の自縛は未確認。`, moatType: "UNKNOWN", moatDescription: "継続率・独自データ・供給制約・ブランド優位は未確認。", incumbentDilemma: "大手が既存売上を守るため参入しにくい構造は未確認。", secretInsight: `公開記録から確定できるのは、${tagline}という提供表現と売上表示だけ。`, initialTraction: [`掲載開始値: ${item.startDateStr || "UNKNOWN"}`, `公開レコードに掲載。${revenueLabel}`, "初動獲得経路・顧客数・継続率は未確認。"], actionPlaybook: [`「${tagline}」の当事者に対象を絞り、支払理由を一次情報で確認する。`, `報告売上${revenueLabel}を利益と分離し、原価・経費・税・継続率を取得する。`, `公式URLの提供条件と掲載説明を同一IDで保存する。`], coldOutreachTemplate: `「${tagline}」に関する作業で、最も時間または損失が出る箇所を15分だけ教えてください。公開説明だけで利益を断定せず、実測値と照合します。`,
      isGrowthUnconfirmed: true,
    },
    growthRateYoY: 0, architecturePattern: `公開レコードでは実装方式未確認。対応タグ: ${platformText}。`, pipelineStack: `公開レコードでは技術スタック未確認。対応タグ: ${platformText}。`, targetPainWallet: pain,
    tags: Array.from(new Set([...tags, "SOURCE_COMMUNITY", "INDIE_HACKERS_REPORTED_REVENUE", "FINANCIAL_PROFIT_UNKNOWN", officialVerified ? "OFFICIAL_URL_REACHABLE" : "OFFICIAL_URL_AUDIT_PARTIAL"])),
    evidenceCards: [
      { id: `${id}-loot`, type: "LOOT_BLUEPRINT", title: "公開説明に現れる課題と報告売上", evidenceStatus: "REPORTED", punchline: pain, details: [description || tagline, revenueLabel, "利益・原価・経費は未確認。"], metrics: [{ label: "表示月商", value: `US$${formatUsd(revenue)}/month`, isHighlight: true }, { label: "利益状態", value: "UNAVAILABLE" }], sourceClass: "COMMUNITY", sourceUrl: listing, evidenceLocator: { type: "html" } },
      { id: `${id}-crime`, type: "THE_CRIME", title: "売上表示を利益から分離", evidenceStatus: "REPORTED", punchline: `公開レコードが示すのはUS$${formatUsd(revenue)}/monthの売上表示であり、手残り・粗利・営業利益ではない。`, details: [`収益モデルタグ: ${model}`, "確定P&Lへの昇格条件: 原価・経費・期間・対象の一次根拠。"], sourceClass: "COMMUNITY", sourceUrl: listing, evidenceLocator: { type: "html" } },
      { id: `${id}-audit`, type: "UNKNOWN_AUDIT", title: "公式URL到達性と未確認範囲", evidenceStatus: officialVerified ? "VERIFIED" : "UNKNOWN", punchline: `公式URL監査: HTTP ${officialStatus}。${officialVerified ? "サイト到達性を確認したが、財務の裏付けではない。" : "到達性を確定できず、サイト状態は未確認。"}`, details: [`公式URL: ${official}`, `ページタイトル: ${officialTitle}`, ...unknowns], sourceClass: "PRIMARY", sourceUrl: official, evidenceLocator: { type: "html" } },
    ],
    temporal: { foundedYear: Number(String(item.startDateStr ?? "").slice(0, 4)) || null, initialTractionPeriod: `${item.startDateStr || "UNKNOWN"}公開開始値。初動獲得経路は未確認。`, dataSnapshotPeriod: `${SNAPSHOT}公開レコードおよび公式URL監査`, viabilityStatus: "UNKNOWN", viabilityLabel: "根拠未確認", eraContext: "Indie Hackersの公開ディレクトリで、少人数製品が説明と売上表示を公開できる環境。", currentViabilityAnalysis: `掲載と${revenueLabel}は観測したが、利益・継続性・法令順守・再現性は判断できない。` },
    observations: [`Indie Hackers公開説明: ${description || tagline}`, `Indie Hackers公開レコード: ${revenueLabel}`, `公式URL監査: HTTP ${officialStatus}; title=${officialTitle}`, ...unknowns],
    observationsStream: [
      { id: `${id}-listing`, category: "MARKET_DISTORTION", categoryLabel: "公開ディレクトリの提供表現", originType: "reported", verificationStatus: "SUPPORTED", text: `Indie Hackers listing: ${tagline}`, sourceUrl: listing, observedAt: SNAPSHOT, sourceClass: "COMMUNITY", evidenceLocator: { type: "html" } },
      { id: `${id}-revenue`, category: "RESEARCH_LIMIT", categoryLabel: "報告売上と利益の分離", originType: "reported", verificationStatus: "UNVERIFIED", text: revenueLabel, sourceUrl: listing, observedAt: SNAPSHOT, sourceClass: "COMMUNITY", evidenceLocator: { type: "html" } },
      { id: `${id}-official`, category: "TECH_VERIFICATION", categoryLabel: "公式URL監査", originType: "observed", verificationStatus: officialVerified ? "SUPPORTED" : "UNVERIFIED", text: `公式URL HTTP ${officialStatus}; ${officialTitle}`, sourceUrl: official, observedAt: SNAPSHOT, sourceClass: "PRIMARY", evidenceLocator: { type: "html" } },
    ],
    timelineEvents: [{ eventType: "LAUNCH_REPORTED", occurredAt: item.startDateStr || "UNKNOWN", description: "公開レコードの開始値。" }, { eventType: "OFFICIAL_URL_CHECK", occurredAt: SNAPSHOT, description: `公式URL監査HTTP ${officialStatus}。` }],
    unknownsNotes: unknowns,
    lootBlueprint: { blueprintId: `${id}-loot`, targetPrey: pain, structuralFlaw: `公開説明が示す既存作業「${description || tagline}」を狭く切り出している。競合の死角は未確認。`, stealthEntry: `Indie Hackers product directory（${listing}）で課題仮説を取り、公式URL（${official}）で提供実体を監査する。`, tollGateSetup: `収益モデルタグは「${model}」。料金、解約条件、原価、手残りは未確認。`, reproducibilityScore: 0, moatDurabilityScore: 0, capitalEfficiencyScore: 0, executionChecklist },
    coverageAudit: [{ dimension: "reported_revenue", status: "found", note: revenueLabel, attempts: [listing] }, { dimension: "profit_and_costs", status: "attempted_unavailable", note: "利益・原価・経費の一次根拠を確認できない。", attempts: [listing, official] }, { dimension: "official_presence", status: officialVerified ? "found" : "attempted_unavailable", note: `HTTP ${officialStatus}; ${officialTitle}`, attempts: [official] }, { dimension: "founder_and_legal_entity", status: "attempted_unavailable", note: "実名・法人名は未確認。", attempts: [listing, official] }, { dimension: "pricing_and_retention", status: "attempted_unavailable", note: "価格・解約率・継続率は未確認。", attempts: [listing, official] }, { dimension: "technology_and_tools", status: "attempted_unavailable", note: "技術スタック・ツール費は未確認。", attempts: [listing, official] }, { dimension: "acquisition_and_adjacent_ecosystem", status: "attempted_unavailable", note: "初動獲得、紹介配管、競合被害、周辺生態系は未確認。", attempts: [listing, official] }],
    publishability: "PARTIAL", claimBindings: [], batchId: BATCH_ID,
  };
}

const pool = await fetchPool();
const selected = selectClaimed(pool);
const audits = await auditSelected(selected);
const sourceSnapshot = selected.map((item, index) => ({ ...item, officialAudit: audits[index] }));
const entities = sourceSnapshot.map((item) => buildEntity(item, item.officialAudit));
const idSet = new Set(entities.map((entity) => entity.id));
const tickerSet = new Set(entities.map((entity) => entity.ticker));
if (idSet.size !== 100 || tickerSet.size !== 100) throw new Error("duplicate id or ticker in generated batch");
fs.writeFileSync(SOURCE_FILE, `${JSON.stringify(sourceSnapshot, null, 2)}\n`, "utf8");
fs.writeFileSync(RECEIPT_FILE, `${JSON.stringify(sourceSnapshot.map((item) => ({ name: item.name, productId: item.productId, officialUrl: item.websiteUrl, ...item.officialAudit })), null, 2)}\n`, "utf8");
fs.writeFileSync(OUT_FILE, `${JSON.stringify(entities, null, 2)}\n`, "utf8");
const counts = {};
for (const audit of audits) { const key = String(audit.status ?? "ERROR"); counts[key] = (counts[key] || 0) + 1; }
console.log(JSON.stringify({ batchId: BATCH_ID, pool: pool.length, count: entities.length, officialStatusCounts: counts, output: path.relative(ROOT, OUT_FILE), sourceSnapshot: path.relative(ROOT, SOURCE_FILE), receipt: path.relative(ROOT, RECEIPT_FILE) }, null, 2));
