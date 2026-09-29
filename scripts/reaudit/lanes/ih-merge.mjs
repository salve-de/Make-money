// ih-merge.mjs — usage: node scripts/reaudit/lanes/ih-merge.mjs <skeletonBatch.json> <findings.mjs> [--out <file>]
// スケルトン(候補雛形)に、個別に書いた調査結果(findings)を合成して候補を完成させる。
// 叙述はすべて findings 側で1件ずつ書く。ここでは構造の組み立てだけを行う。
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const batchFile = args[0];
const findingsFile = path.resolve(args[1]);
const outIdx = args.indexOf('--out');
const outFile = outIdx >= 0 ? args[outIdx + 1] : batchFile;
const D = '2026-09-29';
const OWNER = process.env.LANE_OWNER || process.env.SWARM_OWNER || 'lane:C ih-research agent';

const recs = JSON.parse(fs.readFileSync(batchFile, 'utf8'));
const mod = await import(pathToFileURL(findingsFile).href);
const findings = mod.default;
const byId = new Map(findings.map((f) => [f.id, f]));
const missing = recs.filter((r) => !byId.has(r.id)).map((r) => r.id);
const extra = findings.filter((f) => !recs.some((r) => r.id === f.id)).map((f) => f.id);
if (missing.length || extra.length) { console.error('findings mismatch', { missing, extra }); process.exit(1); }

const FOOT = `確認日: ${D} / 権利: 事実のみ表示（原文・画像は転載しない）`;
const IH_REV_NOTE = '入力者と検証の有無はページ上で確認できず、公式サイトなど他の出典でも裏付けは得られていない';
const DEFAULT_UNRESEARCHED = [
  '公開アーカイブ（Wayback 等）での旧ページ・旧価格の確認',
  '顧客レビュー・Reddit/HN などでの利用者の声や解約理由の確認',
  '検索流入・技術構成・求人などの公開シグナルの確認',
];
const j = (a) => a.filter(Boolean).map((s) => String(s).replace(/。+$/u, '')).join('。') + (a.filter(Boolean).length ? '。' : '');

function build(rec, f) {
  const e = JSON.parse(JSON.stringify(rec));
  const id = e.id;
  const oldSources = Array.isArray(e.reaudit.sources) ? e.reaudit.sources : [];
  const ihOld = oldSources.find((s) => /indiehackers\.com/.test(s.url || ''));
  const ihUrl = f.ih?.url || (ihOld ? ihOld.url : null);
  const offUrl = f.official?.url || e.officialUrl || e.url;
  const off = f.official || { ok: false, facts: [] };
  const ih = f.ih || { ok: false, facts: [] };
  const extras = f.extras || [];

  // ---- reaudit.sources ----
  const sources = [];
  sources.push({
    url: offUrl, publisher: '公式サイト', sourceType: 'official_website', publicationDate: null, checkedAt: D,
    periodCovered: off.ok ? `${D} 時点の公開ページ` : `${D} の取得試行（内容は確認できず）`,
    claimStatus: off.ok ? (off.claimStatus || 'PRODUCT_DESCRIPTION_CONFIRMED') : 'UNREACHABLE',
    accessResult: off.access || (off.ok ? '取得成功' : '取得失敗'), rightsTier: 'TIER1_OFFICIAL', rawStoredPrivately: false,
  });
  for (const sp of (off.subpages || [])) sources.push({
    url: sp.url, publisher: `公式サイト（${sp.label}）`, sourceType: 'official_website_subpage', publicationDate: null, checkedAt: D,
    periodCovered: `${D} 時点の公開ページ`, claimStatus: 'PAGE_FACTS_CONFIRMED', accessResult: sp.access || '取得成功', rightsTier: 'TIER1_OFFICIAL', rawStoredPrivately: false,
  });
  if (ihUrl) sources.push({
    url: ihUrl, publisher: 'Indie Hackers', sourceType: 'community_product_listing', publicationDate: ih.firstPost || null, checkedAt: D,
    periodCovered: `${D} 時点の掲載ページ`, claimStatus: ih.ok ? 'LISTING_FACTS_CONFIRMED' : 'UNREACHABLE',
    accessResult: ih.access || (ih.ok ? '取得成功' : '取得失敗'), rightsTier: 'TIER2_FACTS_ONLY', rawStoredPrivately: false,
  });
  for (const x of extras) sources.push({
    url: x.url, publisher: x.publisher, sourceType: x.sourceType, publicationDate: x.date || null, checkedAt: D,
    periodCovered: x.period || (x.date ? `${x.date} 時点` : `${D} 時点`), claimStatus: x.claimStatus,
    accessResult: x.access || '取得成功', rightsTier: x.tier, rawStoredPrivately: false,
  });

  // ---- evidence cards ----
  const cards = [];
  const cardIds = new Set([`${id}_reaudit_source_indiehackers`, `${id}_reaudit_source_official`, `${id}_reaudit_limits`]);
  cards.push({
    id: `${id}_reaudit_source_official`, type: 'UNKNOWN_AUDIT', title: '出典: 公式サイト', badge: '出典',
    evidenceStatus: off.ok ? 'REPORTED' : 'UNKNOWN', punchline: off.punchline,
    details: [...(off.facts || []), `URL: ${offUrl}`, ...(off.subpages || []).map((sp) => `URL: ${sp.url}（${sp.label}）`), `取得結果: ${off.access || (off.ok ? '取得成功' : '取得失敗')}`, FOOT],
    url: offUrl, sourceNote: `official website ${offUrl} / rights: Tier 1`, sourceClass: 'PRIMARY',
  });
  if (ihUrl) cards.push({
    id: `${id}_reaudit_source_indiehackers`, type: 'UNKNOWN_AUDIT', title: '出典: Indie Hackers 掲載ページ', badge: '出典',
    evidenceStatus: ih.ok ? 'REPORTED' : 'UNKNOWN', punchline: ih.punchline,
    details: [...(ih.facts || []), ...(ih.listed ? [`収益欄: ${ih.listed}と表示（${IH_REV_NOTE}）`] : []), FOOT],
    url: ihUrl, sourceNote: `Indie Hackers ${ihUrl} / community listing / rights: Tier 2 facts-only`, sourceClass: 'COMMUNITY',
  });
  extras.forEach((x, i) => cards.push({
    id: `${id}_reaudit_src_${i + 1}_20260929`, type: 'UNKNOWN_AUDIT', title: `出典: ${x.title}`, badge: '出典',
    evidenceStatus: x.evidenceStatus || 'REPORTED', punchline: x.punchline, details: [...x.facts, `URL: ${x.url}`, FOOT],
    url: x.url, sourceNote: `${x.publisher} ${x.url} / ${x.sourceType} / rights: ${x.tier === 'TIER1_PUBLIC_RECORD' ? 'Tier 1 public record' : x.tier === 'TIER1_OFFICIAL' ? 'Tier 1' : x.tier === 'TIER1_PLATFORM' ? 'Tier 1 platform/press wire' : 'Tier 2 facts-only'}`,
    sourceClass: x.sourceClass,
  }));
  cards.push({
    id: `${id}_reaudit_limits`, type: 'UNKNOWN_AUDIT', title: '調査限界: この再調査で確認できなかったこと', badge: '未確認', evidenceStatus: 'UNKNOWN',
    punchline: f.limitsPunchline,
    details: [...f.unknown.slice(0, 6).map((u) => `未確認: ${u}`), f.searched === false ? `調べた範囲: 公式サイト、Indie Hackers 掲載ページ${extras.length ? '、追加出典（直接取得したページ）' : ''}（${D}）。Web検索は未実施（この事例では検索を行わず、公式サイト・掲載ページ・収益ページの取得に絞った）` : `調べた範囲: 公式サイト、Indie Hackers 掲載ページ、Web検索（${D}）${extras.length ? '、追加出典' : ''}`],
    sourceNote: 'manual re-audit lane C / research limits disclosure', sourceClass: 'PRIMARY',
  });
  // 旧来の叙述カード(ev_*_01/_02: AI生成の「手口」「死角」カード。公式URLが付いているだけで内容の裏付けはない)は引き継がない。
  // それ以外(reaudit 以外で出典URLと内容が対応するカード)は残す。
  for (const c of e.evidenceCards || []) {
    const cid = String(c.id);
    if (cardIds.has(cid) || cid.startsWith(`${id}_reaudit_src_`)) continue;
    if (/^ev_.*_0[12]$/.test(cid) && c.type === 'DIRTY_GENESIS') continue;
    cards.push(c);
  }
  e.evidenceCards = cards;

  // ---- observationsStream / observations ----
  const demotion = (e.observationsStream || []).filter((o) => /-reaudit-\d+-demotion$/.test(o.id));
  const stream = [];
  if (off.ok && off.facts.length) stream.push({ id: `${id}-official-20260929`, category: 'TECH_VERIFICATION', originType: 'reported', verificationStatus: 'SUPPORTED', text: j(off.facts.slice(0, 4)), sourceUrl: offUrl, observedAt: D, sourceClass: 'PRIMARY', evidenceLocator: { type: 'html' } });
  if (ih.ok && ih.facts.length) stream.push({ id: `${id}-ih-listing-20260929`, category: 'MARKET_DISTORTION', originType: 'reported', verificationStatus: 'SUPPORTED', text: j(ih.facts.slice(0, 4)), sourceUrl: ihUrl, observedAt: D, sourceClass: 'COMMUNITY', evidenceLocator: { type: 'html' } });
  if (ih.ok && ih.listed) stream.push({ id: `${id}-ih-revenue-field-20260929`, category: 'RESEARCH_LIMIT', originType: 'reported', verificationStatus: 'UNVERIFIED', text: `Indie Hackers 掲載ページの収益欄は${ih.listed}と表示（${D} 確認）。${IH_REV_NOTE}。`, sourceUrl: ihUrl, observedAt: D, sourceClass: 'COMMUNITY', evidenceLocator: { type: 'html' } });
  extras.forEach((x, i) => stream.push({ id: `${id}-src${i + 1}-20260929`, category: x.streamCategory || 'TECH_VERIFICATION', originType: 'reported', verificationStatus: 'SUPPORTED', text: j(x.facts.slice(0, 4)), sourceUrl: x.url, observedAt: x.date || D, sourceClass: x.sourceClass, evidenceLocator: { type: 'html' } }));
  stream.push(...demotion);
  e.observationsStream = stream;
  e.observations = [
    ...(off.ok ? off.facts.map((s) => `公式サイト: ${s}`) : []),
    ...(ih.ok ? ih.facts.map((s) => `Indie Hackers 掲載ページ: ${s}`) : []),
    ...extras.flatMap((x) => x.facts.map((s) => `${x.publisher}: ${s}`)),
  ];

  // ---- reaudit ----
  const supported = [
    ...(off.ok ? off.facts.map((s) => `公式サイト（${D}）: ${s}`) : []),
    ...(ih.ok ? ih.facts.map((s) => `Indie Hackers 掲載ページ（${D}）: ${s}`) : []),
    ...extras.flatMap((x) => x.facts.map((s) => `${x.publisher}（${x.date || D}）: ${s}`)),
  ];
  const conflicts = [...(Array.isArray(e.reaudit.conflicts) ? e.reaudit.conflicts : []), ...(f.conflicts || [])];
  const hasPublicRecord = extras.some((x) => x.tier === 'TIER1_PUBLIC_RECORD');
  const reaudit = {
    ...e.reaudit,
    status: 'PARTIAL', auditDate: D, timezone: 'Asia/Tokyo', method: 'MANUAL_REAUDIT', lane: 'ih', auditOwner: OWNER, family: 'indiehackers',
    sources, supported, unknown: f.unknown, unresearched: [...DEFAULT_UNRESEARCHED, ...(f.searched === false ? ['創業者・運営者の公開発言（インタビュー・自身の投稿・登記）のWeb検索（この事例では未実施）'] : []), ...(f.unresearchedAdd || [])], conflicts,
    narrativeStatus: 'AI_NARRATIVE_REPLACED_BY_SOURCED_FACTS_20260929',
    replacedNarrativeFields: ['strategy.initialTraction/actionPlaybook/coldOutreachTemplate/secretInsight', 'lootBlueprint(scores/checklist)', 'opportunityJudgment', 'pipelineStack', 'incumbentDilemma/blindspot/moatDescription', 'evidenceCards ev_*_01/_02（AI生成の叙述カード）'],
    rights: { status: 'REVIEWED', permission: 'FACTS_ONLY_WITH_ATTRIBUTION', basis: hasPublicRecord ? 'Tier 1 official site + Tier 1 public record + Tier 2 community/self-report' : (extras.some((x) => x.tier === 'TIER1_PLATFORM') ? 'Tier 1 official site + Tier 1 platform listing/press wire + Tier 2 community/self-report' : 'Tier 1 official site + Tier 2 community/self-report') },
  };
  delete reaudit.skeletonNote;
  e.reaudit = reaudit;

  // ---- facts-only fields ----
  e.tagline = f.tagline;
  e.description = f.description;
  e.essence = { whatItDoes: f.whatItDoes, targetCustomer: f.targetCustomer, painRelief: f.painRelief };
  e.targetPainWallet = f.targetCustomer;
  e.architecturePattern = f.pattern || '未確認';
  e.pipelineStack = f.stack || '未確認（公式サイトから技術構成・運営費用は確認できず）';
  e.tags = [...new Set([...(f.tags || []), '再監査中', '財務未確認'])];
  if (f.founder) e.founder = f.founder;
  if (f.legalEntity) e.legalEntity = f.legalEntity;
  if (f.country) e.country = f.country;
  if (f.sector) e.sector = f.sector;
  e.scale = f.scale || 'UNKNOWN';
  e.unknownsNotes = f.unknown;
  e.incumbentDilemma = '未確認';
  e.blindspot = '未確認';
  e.moatDescription = '未確認';
  e.strategy = { moatType: 'UNKNOWN', blindspot: '未確認', moatDescription: '未確認', secretInsight: '未確認', initialTraction: f.traction || [], actionPlaybook: [], coldOutreachTemplate: '', incumbentDilemma: '未確認' };
  e.lootBlueprint = {
    blueprintId: e.lootBlueprint?.blueprintId || `${id}_loot`,
    targetPrey: f.targetCustomer, structuralFlaw: '未確認', stealthEntry: f.stealthEntry || '未確認', tollGateSetup: f.pattern || '未確認',
    reproducibilityScore: 0, moatDurabilityScore: 0, capitalEfficiencyScore: 0, executionChecklist: [],
    architecturePattern: e.architecturePattern, pipelineStack: e.pipelineStack,
  };
  delete e.opportunityJudgment;

  // ---- financials (numbers stay unconfirmed; only labelled reported figures go to revenueLabel/reportedMetrics) ----
  const hasReport = Boolean(f.revenueLabel);
  e.pnl = {
    ...e.pnl,
    revenueLabel: f.revenueLabel || '売上未確認',
    financialStatus: hasReport ? 'REPORTED' : 'UNAVAILABLE',
    dataSnapshotPeriod: f.pnlPeriod || `${D} 個別再調査（財務数値は未確認）`,
    sourceDoc: f.sourceDoc || e.pnl.sourceDoc,
    sourceClass: f.sourceClass || e.pnl.sourceClass,
    estimationLogic: hasReport
      ? '推計は挿入していない。出典付きの報告値だけを revenueLabel と reportedMetrics に記載し、月次換算・利益推計・為替換算は行っていない。金額欄の0は不明の互換値。'
      : '推計は挿入していない。財務数値は根拠が見つかっていないため未確認（内部の0は不明の互換値）。旧表示は reaudit.legacyDisplaySnapshot に退避。',
  };
  e.financialStatus = e.pnl.financialStatus;
  if (f.reported && f.reported.length) e.reportedMetrics = f.reported; else delete e.reportedMetrics;
  e.isGrowthUnconfirmed = true;

  // ---- temporal / operations ----
  e.temporal = {
    ...e.temporal,
    foundedYear: f.foundedYear || 0,
    initialTractionPeriod: f.initialTractionPeriod || '未確認',
    dataSnapshotPeriod: `${D} 個別再調査（公式サイト・Indie Hackers 掲載ページ${extras.length ? '・追加出典' : ''}）`,
    viabilityStatus: 'UNKNOWN', viabilityLabel: f.viabLabel || '現在の収益性・再現性は未確認',
    eraContext: f.eraContext || '未確認', currentViabilityAnalysis: f.viab,
  };
  if (f.operations) e.operations = { ...e.operations, ...f.operations };
  return e;
}

const out = recs.map((r) => build(r, byId.get(r.id)));
fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
console.log(`merged ${out.length} record(s) -> ${outFile}`);