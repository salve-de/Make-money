/**
 * 事例の記事（data/case-articles/<事例ID>/article.json）が先にあって、目録（entities-index.json）にまだ無い事例の身元の記録（第5世代）を
 * data/entity-additions/gen5-case-articles.json に作る。
 * 記録に入れるのは身元（事例ID・名前・公式サイト）と、出典の所在（根拠カード）だけ。事実・推論・損益は入れない（画面の文は記事が持つ）。
 * 目録（entities-index.json）は書き換えない。手元確認用の版（prepare-catalog-release.ts --preview-articles）が、この記録をメモリ上だけで足す。
 * 使い方: node --import tsx scripts/case-articles/add-records.ts [--dir <原稿の置き場>] [--out <書き出し先>]
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CaseArticleSourceSchema } from '../../src/shared/case-article';
import { CASE_ARTICLES_DIR, listArticleIds } from './lib';

const NOW = '2026-10-12';
const OUT = 'data/entity-additions/gen5-case-articles.json';
const flagValue = (name: string) => (process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined);

interface Research { primary_entity_key?: string; entities?: Array<{ key: string; name?: string; official_url?: string | null; country?: string | null }> }

const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

/** 事例ID（ent_<名前>_<12桁>）から、記録の ticker に使う英数字の綴りを作る */
export const tickerOf = (entityId: string) => entityId.replace(/^ent_/, '').replace(/_[0-9a-f]{12}$/, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 16) || 'CASE';

export function recordFor(dir: string, entityId: string) {
  const source = CaseArticleSourceSchema.parse(JSON.parse(readFileSync(`${dir}/${entityId}/article.json`, 'utf8')));
  const researchPath = `${dir}/${entityId}/research.json`;
  const research: Research = existsSync(researchPath) ? (JSON.parse(readFileSync(researchPath, 'utf8')) as Research) : {};
  const primary = research.entities?.find((e) => e.key === research.primary_entity_key);
  const officialUrl = primary?.official_url ?? source.sources[0].url;
  // 目録の url は、公式サイトの中の出典ページにする（同じ公式サイトの旧い紹介記録と、同じ事例として落とされないため）。無ければ公式サイトの入口
  const entryUrl = source.sources.find((s) => hostOf(s.url) === hostOf(officialUrl))?.url ?? officialUrl;
  const cards = source.sources.map((s) => ({
    id: `${entityId}-S${s.no}`,
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
  const zero = { monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 }, operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0, isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true, financialStatus: 'UNAVAILABLE', dataSnapshotPeriod: '各事実の対象期間を参照。現在の完全な損益は未確認', revenueLabel: '', sourceDoc: source.sources[0].url };
  return {
    id: entityId, ticker: tickerOf(entityId), name: source.name, tagline: source.listLine, description: source.lead.slice(0, 300), sector: 'UNKNOWN', scale: 'UNKNOWN', founder: '未確認',
    country: primary?.country ?? '未確認', url: entryUrl, officialUrl, verifiedBadge: false, growthRateYoY: 0, architecturePattern: '', pipelineStack: '', targetPainWallet: '',
    tags: ['収集事例'], pnl: zero,
    operations: { teamSize: 0, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: [], toolStack: [], isTeamSizeUnconfirmed: true, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true },
    strategy: { moatType: 'UNKNOWN', blindspot: '', moatDescription: '', secretInsight: '', initialTraction: [], actionPlaybook: [], coldOutreachTemplate: '', incumbentDilemma: '' },
    evidenceCards: cards, observationsStream: [], observations: [], claimBindings: [], publishability: 'PARTIAL', batchId: 'gen5_case_articles_20261012',
    financialStatus: 'UNAVAILABLE', incumbentDilemma: '', blindspot: '', moatDescription: '', unknownsNotes: [], isGrowthUnconfirmed: true,
  };
}

function main() {
  const dir = flagValue('--dir') ?? CASE_ARTICLES_DIR;
  const out = flagValue('--out') ?? OUT;
  const index = JSON.parse(readFileSync('data/entities-index.json', 'utf8')) as Array<{ id?: string }>;
  const have = new Set(index.map((r) => r.id));
  const ids = listArticleIds(dir).filter((id) => !have.has(id));
  const records = ids.map((id) => {
    const rec = recordFor(dir, id);
    const artifact = readFileSync(`${dir}/${id}/article.json`);
    return { id, provenance: { detailsHash: createHash('sha256').update(JSON.stringify(rec)).digest('hex'), artifactSha256: createHash('sha256').update(artifact).digest('hex') }, record: rec };
  });
  const file = { version: 1, source: { manifest: 'data/case-articles/*/article.json', manifestSha256: createHash('sha256').update(records.map((r) => r.provenance.artifactSha256).join('')).digest('hex'), artifactsDir: '', collectedAt: `${NOW}T00:00:00.000Z`, generation: 5 }, records };
  writeFileSync(out, `${JSON.stringify(file, null, 1)}\n`);
  console.log(records.length === 0 ? '目録に無い記事の事例は無い（空の記録を書いた）' : records.map((r) => r.id).join('\n'));
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
