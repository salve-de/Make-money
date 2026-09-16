#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
const RAW_FILE = path.join(ROOT, "data/incoming/batch_indie_hackers_replacement_candidates_20260916.json");
const CLAIMS_FILE = path.join(ROOT, "data/CLAIMED_TARGETS.txt");
const OUT_FILE = path.join(ROOT, "data/incoming/batch_indie_hackers_new100b_20260916.json");
const OFFICIAL_RECEIPT_FILE = path.join(ROOT, "data/incoming/batch_indie_hackers_new100b_20260916_official_checks.json");
const AGENT_ID = "codex-20260916-ih-new100b";
const SNAPSHOT = "2026-09-16";
const BATCH_ID = "batch-indie-hackers-new100b-20260916";

const raw = JSON.parse(fs.readFileSync(RAW_FILE, "utf8"));
const claimLines = fs.readFileSync(CLAIMS_FILE, "utf8")
  .split("\n")
  .filter((line) => line.includes(`[CLAIMED:${AGENT_ID}`));

function tidy(value, max = 700) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function slug(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 34) || "case";
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex").slice(0, 12);
}

function listingUrl(productId) {
  return `https://www.indiehackers.com/product/${encodeURIComponent(productId)}`;
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(value));
}

function tagsOf(item) {
  return Array.from(new Set((Array.isArray(item._tags) ? item._tags : []).filter((tag) => typeof tag === "string")));
}

function sectorFor(tags) {
  const has = (prefix) => tags.some((tag) => tag.startsWith(prefix));
  if (has("vertical-ai")) return "AI_AUTOMATION";
  if (has("vertical-finance") || has("vertical-investing") || has("vertical-payments") || has("vertical-banking")) return "FINTECH_INFRA";
  if (has("vertical-hardware") || has("vertical-food") || has("vertical-clothing") || has("vertical-shopping") || has("vertical-manufacturing")) return "PHYSICAL_ASSET";
  if (has("vertical-content") || has("vertical-news") || has("vertical-magazines") || has("vertical-movies") || has("vertical-music") || has("vertical-podcasting") || has("vertical-advertising") || has("vertical-email-marketing")) return "CONTENT_MEDIA";
  if (has("vertical-local") || has("vertical-home") || has("vertical-travel")) return "LOCAL_SERVICES";
  return "NICHE_SAAS";
}

function scaleFor(tags) {
  if (tags.includes("employees-0")) return "SOLO";
  if (tags.includes("employees-under-10")) return "SMALL_TEAM";
  if (tags.includes("employees-10-plus")) return "SCALEUP";
  return "UNKNOWN";
}

function platformTags(tags) {
  return tags.filter((tag) => tag.startsWith("platform-"));
}

function revenueModel(tags) {
  const models = tags.filter((tag) => tag.startsWith("revenue-model-")).map((tag) => tag.slice("revenue-model-".length));
  return models.length ? models.join(", ") : "未確認";
}

function painText(item) {
  const description = tidy(item.description, 380);
  const tagline = tidy(item.tagline, 220);
  return `公開説明「${description || tagline}」が示す、${tagline || "特定課題"}への支出意向`;
}

function playbookFor(item, sector, listing, official) {
  const tagline = tidy(item.tagline, 160) || "公開タグラインの課題";
  const revenue = `US$${formatUsd(item.revenue)}/monthの表示値`;
  const model = revenueModel(tagsOf(item));
  const common = [
    `「${tagline}」の利用者を限定し、${revenue}を利益と混同せず料金・継続率を別々に確認する。`,
    `Indie Hackers掲載（${listing}）と公式URL（${official}）を同一IDで保存し、公式側の提供条件を照合する。`,
  ];
  if (sector === "AI_AUTOMATION") return [...common, `AI処理の従量原価と人手代替範囲を測定し、${model}の課金単位ごとの粗利を検証する。`];
  if (sector === "FINTECH_INFRA") return [...common, `金銭・契約データの誤判定コストと規制境界を先に確認し、${model}の手数料配管を監査する。`];
  if (sector === "PHYSICAL_ASSET") return [...common, `仕入れ・配送・返品または現場提供の原価を分離し、${model}で前金が運転資金になるかを確認する。`];
  if (sector === "CONTENT_MEDIA") return [...common, `集客元の依存度と広告・紹介料を切り分け、${model}で読者または利用者の再訪を確認する。`];
  if (sector === "LOCAL_SERVICES") return [...common, `提供地域・予約導線・現場工数を分解し、${model}で一件あたりの手残りを確認する。`];
  return [...common, `対象業務の置換範囲とサポート工数を測定し、${model}が継続利用に結び付くかを確認する。`];
}

function executionChecklistFor(item, sector, listing, official) {
  const tagline = tidy(item.tagline, 120) || "公開タグラインの課題";
  const base = [
    `対象顧客を「${tagline}」の当事者に絞り、公開説明と実際の支払理由を面談で照合する。`,
    `報告売上US$${formatUsd(item.revenue)}/monthを利益とせず、原価・経費・税・解約を別帳簿で取得する。`,
  ];
  if (sector === "AI_AUTOMATION") base.push("モデル/API費用と処理量を一件単位で記録し、手作業の残存箇所を確認する。");
  else if (sector === "FINTECH_INFRA") base.push("誤送金・誤判定・規制対応の損失上限を定義してから決済または金融データに接続する。");
  else if (sector === "PHYSICAL_ASSET") base.push("仕入れ・物流・返品・現場稼働を計測し、在庫または人員が増えた時の損益を確認する。");
  else if (sector === "CONTENT_MEDIA") base.push("検索・SNS・広告・紹介の流入を分離し、単一プラットフォーム変更時の代替導線を用意する。");
  else if (sector === "LOCAL_SERVICES") base.push("地域ごとの供給制約と予約キャンセルを計測し、提供者と顧客の双方の離脱点を確認する。");
  else base.push("サポート・導入・解約時の作業時間を計測し、少人数運営で維持できる範囲を確認する。");
  base.push(`原記録: ${listing} / 公式URL到達確認: ${official}`);
  return base;
}

function buildEntity(item) {
  const tags = tagsOf(item);
  const official = item.websiteUrl;
  const officialAudit = item.officialAudit ?? {};
  const listing = listingUrl(item.productId || item.objectID || slug(item.name));
  const year = Number(String(item.startDateStr || "").slice(0, 4)) || 0;
  const key = `${item.productId || item.objectID || item.name}|${official}`;
  const suffix = digest(key);
  const id = `ent_${slug(item.name)}_${suffix}`;
  const ticker = `IH${suffix.slice(0, 8).toUpperCase()}`;
  const sector = sectorFor(tags);
  const scale = scaleFor(tags);
  const description = tidy(item.description, 700);
  const taglineSource = tidy(item.tagline, 240) || "公開タグライン未確認";
  const revenueLabel = `Indie Hackers表示: US$${formatUsd(item.revenue)}/month（報告値・利益ではない）`;
  const platforms = platformTags(tags);
  const platformNote = platforms.length ? `公開タグの対応プラットフォーム: ${platforms.join(", ")}` : "対応プラットフォームは未確認";
  const pain = painText(item);
  const playbook = playbookFor(item, sector, listing, official);
  const executionChecklist = executionChecklistFor(item, sector, listing, official);
  const title = tidy(officialAudit.title, 180) || "公式URL HTTP 200";
  const rootTags = Array.from(new Set([
    ...tags,
    "SOURCE_COMMUNITY",
    "INDIE_HACKERS_REPORTED_REVENUE",
    "FINANCIAL_PROFIT_UNKNOWN",
    "OFFICIAL_URL_REACHABLE",
  ]));
  const pnl = {
    monthlyRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    grossMargin: 0,
    operatingExpenses: {
      serverAndApi: 0,
      advertising: 0,
      subcontracting: 0,
      toolsAndSaaS: 0,
      other: 0,
    },
    operatingProfit: 0,
    operatingMargin: 0,
    estimatedAnnualNetProfit: 0,
    isRevenueUnconfirmed: true,
    isOperatingProfitUnconfirmed: true,
    isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true,
    isGrossMarginUnconfirmed: true,
    isCogsUnconfirmed: true,
    isCostsUnconfirmed: true,
    isNetProfitUnconfirmed: true,
    financialStatus: "UNAVAILABLE",
    dataSnapshotPeriod: `${SNAPSHOT} Indie Hackers公開レコード`,
    sourceDoc: listing,
    sourceClass: "COMMUNITY",
    revenueLabel,
    estimationLogic: "公開月間売上表示は報告値。利益・原価・経費・税・為替換算の根拠がないため、JPYのP&L数値は確定していない。",
    confidenceScore: 0,
  };
  const operations = {
    teamSize: 0,
    weeklyHours: 0,
    initialCapitalRequired: 0,
    automationLevel: 0,
    primaryChannels: ["Indie Hackers product directory", "official website (availability check)"],
    toolStack: [],
    isTeamSizeUnconfirmed: true,
    isWeeklyHoursUnconfirmed: true,
    isCapitalUnconfirmed: true,
    isAutomationUnconfirmed: true,
  };
  const entity = {
    id,
    ticker,
    name: item.name,
    legalEntity: "UNKNOWN (公開ディレクトリ情報では法人名未確認)",
    tagline: `「${taglineSource}」の課題に対し、公開レコードは${revenueLabel}。利益は未確認。`,
    sector,
    scale,
    founder: "UNKNOWN (公開レコードでは実名未確認)",
    country: "GLOBAL",
    url: official,
    verifiedBadge: false,
    pnl,
    operations,
    strategy: {
      blindspot: `「${taglineSource}」という狭い課題への専門化。大手・競合の見落としは公開資料から未確認。`,
      moatType: "UNKNOWN",
      moatDescription: "継続率・独自データ・供給制約・ブランド優位は未確認。",
      incumbentDilemma: "大手のカニバリゼーション障壁や組織的な模倣不能理由は未確認。",
      secretInsight: "創業者固有の内部情報や非公開の獲得ノウハウは確認できない。",
      initialTraction: [
        `掲載開始値: ${item.startDateStr || "UNKNOWN"}`,
        `Indie Hackers公開レコードに掲載。${revenueLabel}`,
        "初動獲得経路・顧客数・継続率は未確認。",
      ],
      actionPlaybook: playbook,
      coldOutreachTemplate: `「${taglineSource}」に悩む担当者向けに、現行作業・支払上限・導入後の削減時間を3問で確認し、公開説明だけでは利益を断定しない。`,
    },
    isGrowthUnconfirmed: true,
    growthRateYoY: 0,
    architecturePattern: `公開レコードでは実装方式未確認。${platformNote}。`,
    pipelineStack: `公開レコードでは技術スタック未確認。${platformNote}。`,
    targetPainWallet: pain,
    tags: rootTags,
    evidenceCards: [
      {
        id: `${id}-loot`,
        type: "LOOT_BLUEPRINT",
        title: "公開説明に現れる単一課題と報告売上",
        evidenceStatus: "REPORTED",
        punchline: pain,
        details: [description || taglineSource, revenueLabel, "利益・原価・経費は未確認。"],
        metrics: [
          { label: "表示月商", value: `US$${formatUsd(item.revenue)}/month`, isHighlight: true },
          { label: "利益状態", value: "UNAVAILABLE" },
        ],
        sourceClass: "COMMUNITY",
        evidenceLocator: { type: "html" },
      },
      {
        id: `${id}-crime`,
        type: "THE_CRIME",
        title: "報告売上を利益から分離",
        evidenceStatus: "REPORTED",
        punchline: `公開レコードが示すのはUS$${formatUsd(item.revenue)}/monthの売上表示であり、手残り・粗利・営業利益ではない。`,
        details: [`sourceClass=COMMUNITY`, `sourceDoc=${listing}`, "確定P&Lへの昇格条件: 原価・経費・期間・対象の一次根拠。"],
        sourceClass: "COMMUNITY",
        evidenceLocator: { type: "html" },
      },
      {
        id: `${id}-audit`,
        type: "UNKNOWN_AUDIT",
        title: "未確認範囲と公式URL到達性",
        evidenceStatus: "VERIFIED",
        punchline: `公式URLはHTTP ${officialAudit.status ?? "UNKNOWN"}。これはサイト到達性の確認であり、売上・利益の裏付けではない。`,
        details: [`公式ページタイトル: ${title}`, "創業者・価格・顧客数・原価・継続率・技術スタックは未確認。"],
        sourceClass: "PRIMARY",
        evidenceLocator: { type: "html" },
      },
    ],
    temporal: {
      foundedYear: year,
      initialTractionPeriod: `${item.startDateStr || "UNKNOWN"}公開開始値。初動獲得経路は未確認。`,
      dataSnapshotPeriod: `${SNAPSHOT}公開レコードおよび公式URL到達確認`,
      viabilityStatus: "UNKNOWN",
      viabilityLabel: "根拠未確認",
      eraContext: `${year || "2024–2026"}年以降、公開ディレクトリと公式サイトで少人数製品の課題・売上表示を観測できる環境。`,
      currentViabilityAnalysis: `公式URLは観測時点で到達したが、${revenueLabel}から現在の黒字・継続性・再現性は判断できない。`,
    },
    observations: [
      `Indie Hackers公開説明: ${description || taglineSource}`,
      `Indie Hackers公開レコード: ${revenueLabel}`,
      `公式URL監査: HTTP ${officialAudit.status ?? "UNKNOWN"}; title=${title}`,
      "利益、原価、営業経費、創業者実名、顧客数、継続率、技術スタックは未確認。",
    ],
    observationsStream: [
      {
        id: `${id}-listing`,
        category: "MARKET_DISTORTION",
        categoryLabel: "公開ディレクトリに現れる市場シグナル",
        originType: "reported",
        verificationStatus: "SUPPORTED",
        text: `Indie Hackers listing: ${taglineSource}`,
        sourceUrl: listing,
        observedAt: SNAPSHOT,
        sourceClass: "COMMUNITY",
        evidenceLocator: { type: "html" },
      },
      {
        id: `${id}-revenue`,
        category: "RESEARCH_LIMIT",
        categoryLabel: "財務情報の未確認範囲",
        originType: "reported",
        verificationStatus: "UNVERIFIED",
        text: revenueLabel,
        sourceUrl: listing,
        observedAt: SNAPSHOT,
        sourceClass: "COMMUNITY",
        evidenceLocator: { type: "html" },
      },
      {
        id: `${id}-official`,
        category: "TECH_VERIFICATION",
        categoryLabel: "公式URL到達確認",
        originType: "observed",
        verificationStatus: "SUPPORTED",
        text: `公式URL HTTP ${officialAudit.status ?? "UNKNOWN"}; ${title}`,
        sourceUrl: official,
        observedAt: SNAPSHOT,
        sourceClass: "PRIMARY",
        evidenceLocator: { type: "html" },
      },
    ],
    timelineEvents: [
      { eventType: "LAUNCH_REPORTED", occurredAt: item.startDateStr || "UNKNOWN", description: "公開レコードの開始値。" },
      { eventType: "OFFICIAL_URL_CHECK", occurredAt: SNAPSHOT, description: `公式URL HTTP ${officialAudit.status ?? "UNKNOWN"}を確認。` },
    ],
    unknownsNotes: [
      "公開月間売上欄は利益ではなく、独立監査済みかどうかも確定できない。",
      "原価、営業経費、営業利益、純利益、成長率、為替換算は未確認。",
      "創業者名、法人名、国、顧客数、チーム人数、価格、技術スタックは未確認。",
      "公式URLの到達性は確認したが、サイト内容が収益・利益を裏付けるとは扱っていない。",
    ],
    lootBlueprint: {
      blueprintId: `${id}-loot`,
      targetPrey: pain,
      structuralFlaw: `公開説明が示す既存作業の不便「${description || taglineSource}」を狭く切り出している。競合の死角は未確認。`,
      stealthEntry: `Indie Hackers product directory（${listing}）から課題仮説を取り、公式URL（${official}）で提供実体を確認する。`,
      tollGateSetup: `公開タグの収益モデルは「${revenueModel(tags)}」。料金、解約条件、原価、手残りは未確認。`,
      reproducibilityScore: 0,
      moatDurabilityScore: 0,
      capitalEfficiencyScore: 0,
      executionChecklist,
    },
    coverageAudit: [
      { dimension: "reported_revenue", status: "found", note: revenueLabel, attempts: [listing] },
      { dimension: "profit_and_costs", status: "attempted_unavailable", note: "公開レコードと公式URLでは利益・原価の根拠を確認できない。", attempts: [listing, official] },
      { dimension: "founder_and_legal_entity", status: "attempted_unavailable", note: "実名・法人名は未確認。", attempts: [listing, official] },
      { dimension: "official_presence", status: "found", note: `HTTP ${officialAudit.status ?? "UNKNOWN"}; ${title}`, attempts: [official] },
      { dimension: "pricing_and_retention", status: "attempted_unavailable", note: "価格・解約率・継続率は未確認。", attempts: [listing, official] },
      { dimension: "technology_and_tools", status: "attempted_unavailable", note: "技術スタック・ツール費は未確認。", attempts: [listing, official] },
      { dimension: "acquisition_and_adjacent_ecosystem", status: "attempted_unavailable", note: "初動獲得、アフィリエイト、競合の被害、周辺配管は未確認。", attempts: [listing, official] },
    ],
    publishability: "PARTIAL",
    claimBindings: [],
    batchId: BATCH_ID,
  };
  return entity;
}

const selectedNames = claimLines.map((line) => line.split(" [CLAIMED:")[0].split(" — ")[0].trim());
const selected = [];
const usedNames = new Set();
for (const name of selectedNames) {
  const item = raw.find((candidate) => candidate.name === name);
  if (!item) throw new Error(`claimed target not found in candidate source: ${name}`);
  if (usedNames.has(item.name)) continue;
  usedNames.add(item.name);
  selected.push(item);
}
if (selected.length !== 100) throw new Error(`expected 100 claimed candidates, got ${selected.length}`);

const entities = selected.map(buildEntity);
const idSet = new Set();
const tickerSet = new Set();
for (const entity of entities) {
  if (idSet.has(entity.id)) throw new Error(`duplicate id: ${entity.id}`);
  if (tickerSet.has(entity.ticker)) throw new Error(`duplicate ticker: ${entity.ticker}`);
  idSet.add(entity.id);
  tickerSet.add(entity.ticker);
}

fs.writeFileSync(OUT_FILE, `${JSON.stringify(entities, null, 2)}\n`, "utf8");
fs.writeFileSync(OFFICIAL_RECEIPT_FILE, `${JSON.stringify(selected.map((item) => ({
  name: item.name,
  productId: item.productId,
  officialUrl: item.websiteUrl,
  status: item.officialAudit?.status ?? null,
  finalUrl: item.officialAudit?.finalUrl ?? null,
  title: item.officialAudit?.title ?? null,
  checkedAt: item.officialAudit?.checkedAt ?? SNAPSHOT,
})), null, 2)}\n`, "utf8");

console.log(JSON.stringify({
  batchId: BATCH_ID,
  count: entities.length,
  output: path.relative(ROOT, OUT_FILE),
  officialReceipt: path.relative(ROOT, OFFICIAL_RECEIPT_FILE),
  officialStatusCounts: selected.reduce((acc, item) => {
    const key = String(item.officialAudit?.status ?? "UNKNOWN");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {}),
  ids: { first: entities[0].id, last: entities.at(-1).id },
}));
