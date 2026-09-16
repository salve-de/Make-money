#!/usr/bin/env node

import fs from 'node:fs';
import crypto from 'node:crypto';

const file = 'data/incoming/batch_indie_hackers_verified_1000_20260916.json';
const app = 'N86T1R3OWZ';
const key = '5140dac5e87f47346abbda1a34ee70c3';
const endpoint = `https://${app}-dsn.algolia.net/1/indexes/products/query`;
const snapshot = '2026-09-16';

const norm = (v) => String(v ?? '').normalize('NFKC').toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]/g, '');
const domain = (v) => { try { return new URL(v).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const clean = (v, n = 220) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : `${s.slice(0, n - 1)}…`; };

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'X-Algolia-Application-Id': app, 'X-Algolia-API-Key': key, 'Content-Type': 'application/json' },
  body: JSON.stringify({ params: new URLSearchParams({ query: 'aitrainer.work', hitsPerPage: '20', page: '0' }).toString() }),
});
if (!response.ok) throw new Error(`Algolia request failed: ${response.status}`);
const product = (await response.json()).hits?.find((x) => x.productId === 'aitrainer-work' || x.objectID === 'aitrainer-work');
if (!product) throw new Error('aitrainer.work product was not found in the directory');

const tags = Array.isArray(product._tags) ? product._tags : [];
const name = String(product.name).trim();
const officialUrl = String(product.websiteUrl).trim();
const ihUrl = `https://www.indiehackers.com/product/${encodeURIComponent(product.productId ?? product.objectID)}`;
const h = hash(`${product.productId ?? product.objectID}|${officialUrl}`);
const ticker = `IH${h.slice(0, 8).toUpperCase()}`;
const id = `ent_${norm(name).slice(0, 48)}_${h.slice(0, 12)}`;
const tagline = clean(product.tagline);
const description = clean(product.description);
const usd = Number(product.revenue) || 0;
const target = `「${tagline}」を必要とする利用者の支出意向`;
const reported = `Indie Hackersの公開レコードは月間売上をUS$${usd.toLocaleString('en-US')}と表示している（自己申告または同サイトの表示値。利益ではない）。`;
const source = `Indie Hackers Products directory, ${snapshot} snapshot: ${ihUrl}`;
const startYear = Number.parseInt(String(product.startDateStr ?? '').slice(0, 4), 10) || 0;

const replacement = {
  id,
  ticker,
  name,
  legalEntity: 'UNKNOWN (公開ディレクトリ情報のみ)',
  tagline: `「${target}」に対し「${tagline}」を提供。掲載月間売上は報告値で、利益は未確認。`,
  sector: 'AI_AUTOMATION',
  scale: tags.includes('employees-0') || tags.includes('founders-solo') ? 'SOLO' : 'UNKNOWN',
  founder: 'UNKNOWN (公開ディレクトリでは個人名未確認)',
  country: 'GLOBAL',
  url: officialUrl,
  verifiedBadge: false,
  growthRateYoY: 0,
  isGrowthUnconfirmed: true,
  architecturePattern: 'UNKNOWN (実装方式は公開ディレクトリから未確認)',
  pipelineStack: 'UNKNOWN (技術構成は公開ディレクトリから未確認)',
  targetPainWallet: target,
  tags: [...tags.filter((x) => !x.startsWith('founders-') && !x.startsWith('employees-')).slice(0, 16), 'INDIE_HACKERS_REPORTED_REVENUE', 'FINANCIAL_PROFIT_UNKNOWN'],
  pnl: {
    monthlyRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0,
    operatingMargin: 0,
    estimatedAnnualNetProfit: 0,
    financialStatus: 'UNAVAILABLE',
    dataSnapshotPeriod: `${snapshot} Indie Hackers公開レコード`,
    sourceDoc: ihUrl,
    sourceClass: 'INDEPENDENT_SECONDARY',
    estimationLogic: `${reported} 原価・経費・利益の根拠がないためP&L数値は内部互換のゼロ値。`,
    revenueLabel: `Indie Hackers表示: US$${usd.toLocaleString('en-US')}/month（報告値・利益ではない）`,
    isRevenueUnconfirmed: true,
    isOperatingProfitUnconfirmed: true,
    isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true,
    isGrossMarginUnconfirmed: true,
    isCogsUnconfirmed: true,
    isCostsUnconfirmed: true,
    isNetProfitUnconfirmed: true,
  },
  evidenceCards: [
    {
      id: `${h.slice(0, 12)}-loot`,
      type: 'LOOT_BLUEPRINT',
      title: `公開タグライン「${tagline}」が示す単一課題への集中`,
      badge: '公開レコードの転用仮説',
      evidenceStatus: 'REPORTED',
      punchline: target,
      details: [`掲載説明: 「${description}」`, reported, '利益・原価・継続率は公開レコードから確認できない。'],
      codeSnippet: 'N/A — 実装詳細は公開レコードで未確認。',
      sourceNote: source,
      sourceUrl: ihUrl,
      sourceClass: 'INDEPENDENT_SECONDARY',
      metrics: [{ label: '掲載月間売上（報告値）', value: `US$${usd.toLocaleString('en-US')}`, isHighlight: true }, { label: '利益・原価', value: '未確認' }],
      evidenceLocator: { type: 'html' },
    },
    {
      id: `${h.slice(12, 24)}-signal`,
      type: 'THE_CRIME',
      title: '売上表示と未開示範囲を分離して記録',
      badge: '報告値',
      evidenceStatus: 'REPORTED',
      punchline: reported,
      details: [`公式URLとして登録された掲載先: ${officialUrl}`, `開始時期: ${product.startDateStr || '未確認'}。創業者名・利益は未確認。`],
      sourceNote: source,
      sourceUrl: ihUrl,
      sourceClass: 'INDEPENDENT_SECONDARY',
      metrics: [{ label: '公開月間売上欄', value: `US$${usd.toLocaleString('en-US')}` }, { label: '利益', value: '未確認' }],
    },
  ],
  operations: {
    teamSize: 0,
    isTeamSizeUnconfirmed: true,
    initialTeamSize: 0,
    currentTeamSize: 0,
    weeklyHours: 0,
    isWeeklyHoursUnconfirmed: true,
    initialCapitalRequired: 0,
    isCapitalUnconfirmed: true,
    automationLevel: 0,
    isAutomationUnconfirmed: true,
    primaryChannels: ['Indie Hackers product directory', ...tags.filter((x) => x.startsWith('platform-')).map((x) => x.slice(9)).slice(0, 3)],
    toolStack: [],
  },
  strategy: {
    blindspot: `公開説明が示す「${tagline}」という狭い課題への専門化。競合比較は未確認。`,
    moatType: 'UNKNOWN',
    moatDescription: '継続率、独自データ、供給制約などの防御要因は未確認。',
    incumbentDilemma: '大手との価格・機能・流通の比較は未確認。',
    secretInsight: `公開レコードから確定できるのは、${tagline}という提供表現と売上表示だけ。顧客獲得手法は未確認。`,
    initialTraction: [`掲載開始値: ${product.startDateStr || '未確認'}`, 'Indie Hackersの商品ディレクトリに掲載', '顧客獲得の初動手段は未確認'],
    actionPlaybook: [`課題を「${tagline}」の1つに限定し、有償性を検証する。`, '売上表示と利益を分離し、原価・経費・継続率の一次根拠を照合する。'],
    coldOutreachTemplate: `「${tagline}」に関する作業で、現場が最も時間を失う箇所を15分だけ教えてください。`,
  },
  temporal: {
    foundedYear: startYear,
    initialTractionPeriod: startYear ? `${startYear}年の掲載開始情報。初動獲得経路は未確認。` : '掲載開始時期・初動獲得経路は未確認。',
    dataSnapshotPeriod: `${snapshot}公開レコード`,
    viabilityStatus: startYear >= 2024 ? 'RISING_WAVE' : 'ACTIVE_PLAYBOOK',
    viabilityLabel: startYear >= 2024 ? '新しい掲載・収益表示あり' : '現行掲載で継続観測',
    eraContext: 'Indie Hackersの公開ディレクトリで、個人開発者が製品説明と収益表示を公開できる環境。',
    currentViabilityAnalysis: '掲載と売上表示は確認できるが、利益・継続性・法令順守・現在の稼働状況は別途一次情報で確認が必要。',
  },
  observations: [`Indie Hackersの掲載説明は「${description}」。`, reported, `公式URL: ${officialUrl}`, '利益、原価、創業者、チーム人数は未確認。'],
  observationsStream: [
    { id: `${h.slice(24, 36)}-listing`, category: 'MARKET_DISTORTION', originType: 'reported', verificationStatus: 'SUPPORTED', text: `Indie Hackers listing: ${tagline}`, sourceUrl: ihUrl, observedAt: snapshot, sourceClass: 'INDEPENDENT_SECONDARY' },
    { id: `${h.slice(36, 48)}-revenue`, category: 'RESEARCH_LIMIT', originType: 'reported', verificationStatus: 'UNVERIFIED', text: reported, sourceUrl: ihUrl, observedAt: snapshot, sourceClass: 'INDEPENDENT_SECONDARY' },
  ],
  essence: { whatItDoes: tagline, targetCustomer: '公開ディレクトリでは顧客属性の詳細未確認。', painRelief: description },
  lootBlueprint: {
    blueprintId: `${id}-loot`,
    targetPrey: target,
    structuralFlaw: `公開説明が示す未充足作業: ${description}`,
    stealthEntry: `Indie Hackers product directoryと公式URL（${officialUrl}）の組み合わせ。実際の獲得手法は未確認。`,
    tollGateSetup: `収益モデルの公開タグは「${tags.filter((x) => x.startsWith('revenue-model-')).map((x) => x.slice(13)).join(', ') || '未確認'}」。料金・継続条件・原価は未確認。`,
    reproducibilityScore: 0,
    moatDurabilityScore: 0,
    capitalEfficiencyScore: 0,
    executionChecklist: [`課題を「${tagline}」の1つに限定し、有償性を確認する。`, '売上表示と利益を分離し、原価・経費・継続率の一次根拠が取れるまでP&Lを確定しない。', '公式URLの提供条件とディレクトリ記録を同一IDで保存する。'],
  },
  unknownsNotes: ['公開月間売上欄は利益ではなく、独立監査済みかどうかも確定できない。', '原価、営業経費、営業利益、純利益、成長率は未確認。', '創業者名、法人名、国、チーム人数、技術スタックは未確認。'],
  publishability: 'PARTIAL',
  claimBindings: [],
  batchId: 'batch-indie-hackers-reported-20260916',
};

const batch = JSON.parse(fs.readFileSync(file, 'utf8'));
const duplicate = batch.filter((x) => norm(x.name) === norm('Re:Form'));
if (duplicate.length !== 1) throw new Error(`Expected exactly one Re:Form duplicate, found ${duplicate.length}`);
const withoutDuplicate = batch.filter((x) => norm(x.name) !== norm('Re:Form'));
if (withoutDuplicate.some((x) => norm(x.name) === norm(name) || domain(x.url) === domain(officialUrl))) throw new Error('Replacement collides with the existing batch');
const next = [...withoutDuplicate, replacement];
if (next.length !== 1000) throw new Error(`Expected 1000 records after replacement, found ${next.length}`);
fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
console.log(`replaced Re:Form with ${name}; wrote ${next.length} records`);
