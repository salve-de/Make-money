/**
 * 章ごとの文（data/case-pages/<事例ID>.md）が先にあって、目録にまだ無い事例の記録（第4世代）を data/entity-additions/gen4-case-pages.json に作る。
 * 記録に入れるのは身元（名前・創業者・公式サイト）と、出典の所在（根拠カード）だけ。事実・推論・損益は入れない（画面の文は md が持つ）。
 * 作った後は、他の追加と同じく add-entity-records.ts --apply で目録（entities-index.json）へ合流する。
 * 使い方: node --import tsx scripts/case-pages/add-records.ts
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseCasePage } from './lib';

interface Meta { slug: string; /** 目録の url。入口でなく公式サイトの中のページにする（同じ公式サイトの旧い紹介記録＝利用条件で出せない eBiz Facts 由来と、同じ事例として落とされないため）。officialUrl は入口 */ entryUrl: string; name: string; ticker: string; founder: string; url: string; sector: string; scale: string; tags: string[] }

// 身元は、各 md の概要・出典に書かれていること（創業者の名前・公式サイト）だけ
const NEW_CASES: Meta[] = [
  { slug: 'pinboard', name: 'Pinboard', ticker: 'PINBOARD', founder: 'Maciej Ceglowski', entryUrl: 'https://pinboard.in/about/', url: 'https://pinboard.in/', sector: 'NICHE_SAAS', scale: 'SOLO', tags: ['ブックマーク保存', '有料サービス', '1人運営'] },
  { slug: 'ship_30_for_30', name: 'Ship 30 for 30', ticker: 'SHIP30', founder: 'Dickie Bush, Nicolas Cole', entryUrl: 'https://www.ship30for30.com/cohort', url: 'https://www.ship30for30.com/', sector: 'CONTENT_MEDIA', scale: 'SMALL_TEAM', tags: ['オンライン講座', '書く習慣'] },
  { slug: 'interior_ai', name: 'Interior AI', ticker: 'INTERIORAI', founder: 'Pieter Levels', entryUrl: 'https://interiorai.com/', url: 'https://interiorai.com/', sector: 'AI_AUTOMATION', scale: 'SOLO', tags: ['内装のAI', '1人運営'] },
];

export const caseIdOf = (m: Meta) => `ent_${m.slug}_${createHash('sha256').update(m.name).digest('hex').slice(0, 12)}`;
const NOW = '2026-10-08';

function record(m: Meta, id: string) {
  const page = parseCasePage(readFileSync(`data/case-pages/${id}.md`, 'utf8'));
  const cards = page.sources.map((s) => ({
    id: `${m.slug}-S${s.no}`,
    type: 'UNKNOWN_AUDIT',
    title: `出典${s.no}：${s.label.slice(0, 40)}`,
    badge: '出典',
    evidenceStatus: 'REPORTED',
    punchline: '出典の所在。数字の読み方は事例の画面の注記に従う',
    details: [`URL：${s.url}`, `確認日：${NOW}`],
    url: s.url,
    sourceNote: '公開部分を読み、事実を自分の言葉で書いた。本文・画像は転載しない',
    sourceClass: 'INDEPENDENT_SECONDARY',
  }));
  const sourceDoc = page.sources[0].url;
  const zero = { monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 }, operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0, isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true, financialStatus: 'UNAVAILABLE', dataSnapshotPeriod: '各事実の対象期間を参照。現在の完全な損益は未確認', revenueLabel: '', sourceDoc };
  return {
    id, ticker: m.ticker, name: m.name, tagline: page.listLine, description: page.overview.slice(0, 300), sector: m.sector, scale: m.scale, founder: m.founder,
    country: '未確認', url: m.entryUrl, officialUrl: m.url, verifiedBadge: false, growthRateYoY: 0, architecturePattern: '', pipelineStack: '', targetPainWallet: '',
    tags: [...m.tags, '収集事例'], pnl: zero,
    operations: { teamSize: 0, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: [], toolStack: [], isTeamSizeUnconfirmed: true, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true },
    strategy: { moatType: 'UNKNOWN', blindspot: '', moatDescription: '', secretInsight: '', initialTraction: [], actionPlaybook: [], coldOutreachTemplate: '', incumbentDilemma: '' },
    evidenceCards: cards, observationsStream: [], observations: [], claimBindings: [], publishability: 'PARTIAL', batchId: 'gen4_case_pages_20261008',
    financialStatus: 'UNAVAILABLE', incumbentDilemma: '', blindspot: '', moatDescription: '', unknownsNotes: [], isGrowthUnconfirmed: true,
  };
}

function main() {
  const records = NEW_CASES.map((m) => {
    const id = caseIdOf(m);
    const rec = record(m, id);
    return { id, provenance: { detailsHash: createHash('sha256').update(JSON.stringify(rec)).digest('hex'), artifactSha256: createHash('sha256').update(readFileSync(`data/case-pages/${id}.md`)).digest('hex') }, record: rec };
  });
  const file = { version: 1, source: { manifest: 'data/case-pages/*.md', manifestSha256: createHash('sha256').update(records.map((r) => r.provenance.artifactSha256).join('')).digest('hex'), artifactsDir: '', collectedAt: `${NOW}T00:00:00.000Z`, generation: 4 }, records };
  writeFileSync('data/entity-additions/gen4-case-pages.json', `${JSON.stringify(file, null, 1)}\n`);
  console.log(records.map((r) => r.id).join('\n'));
}
if (process.argv[1]?.endsWith('add-records.ts')) main();
