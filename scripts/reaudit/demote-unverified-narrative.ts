/**
 * 出典に無い説明欄の取り下げ（2026-09-30）
 *
 * 対象: reaudit.narrativeStatus が AI_GENERATED_UNVERIFIED_AMOUNTS_REDACTED のレコード、および
 * narrativeStatus が無いレコード。説明欄（技術構成・手口・強み・顧客の悩みなど）は別事業のテンプレ文や
 * 作文が混じるため、現在値を reaudit.legacyDisplaySnapshot.priorNarrative に退避し、
 * 書き直し済みレコードと同じ「未確認」表現に置き換える。
 * 表示してよいのは reaudit.supported の「事業内容（記事記載）:」行（出典つきの事実）だけ。
 * 書き直し済み（AI_NARRATIVE_REPLACED_BY_SOURCED_FACTS_20260929 / REWRITTEN_FROM_TIER1_TIER2_SOURCES_20260929）は触らない。
 * narrativeStatus が無くても legacyDisplaySnapshot.priorTagline がある（＝手作業で書き直し済み）レコードは触らない。
 * 冪等: 実行済みのレコード（narrativeStatus が DEMOTED）は再処理しない。
 *
 * 使い方: node --import tsx scripts/reaudit/demote-unverified-narrative.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';

type AnyRecord = Record<string, unknown>;

const rec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});

const DEMOTED_STATUS = 'AI_NARRATIVE_DEMOTED_UNVERIFIED_20260930';
const REWRITTEN = new Set([
  'AI_NARRATIVE_REPLACED_BY_SOURCED_FACTS_20260929',
  'REWRITTEN_FROM_TIER1_TIER2_SOURCES_20260929',
]);
const UNCONFIRMED = '未確認';
const BUSINESS_PREFIX = '事業内容（記事記載）:';
const TOP_FIELDS = ['architecturePattern', 'pipelineStack', 'targetPainWallet', 'moatDescription', 'incumbentDilemma', 'blindspot', 'essence', 'lootBlueprint', 'opportunityJudgment'] as const;
const STRATEGY_FIELDS = ['moatType', 'moatDescription', 'blindspot', 'secretInsight', 'initialTraction', 'actionPlaybook', 'coldOutreachTemplate', 'incumbentDilemma'] as const;

const dryRun = process.argv.includes('--dry-run');
const indexPath = resolve(process.cwd(), 'data/entities-index.json');

function isTarget(e: AnyRecord): 'status' | 'null' | null {
  const reaudit = rec(e.reaudit);
  const status = reaudit.narrativeStatus;
  if (status === DEMOTED_STATUS || (typeof status === 'string' && REWRITTEN.has(status))) return null;
  if (status === 'AI_GENERATED_UNVERIFIED_AMOUNTS_REDACTED') return 'status';
  if (status == null) return rec(reaudit.legacyDisplaySnapshot).priorTagline ? null : 'null';
  return null;
}

function businessText(e: AnyRecord): string | null {
  const supported = rec(e.reaudit).supported;
  const line = (Array.isArray(supported) ? supported : []).find((s) => typeof s === 'string' && s.startsWith(BUSINESS_PREFIX));
  const body = line?.slice(BUSINESS_PREFIX.length).trim();
  return body ? body : null;
}

function demote(e: AnyRecord): AnyRecord {
  const business = businessText(e);
  const reaudit: AnyRecord = { ...rec(e.reaudit) };
  const snapshot: AnyRecord = { ...rec(reaudit.legacyDisplaySnapshot) };
  if (!snapshot.status) Object.assign(snapshot, { status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: '2026-09-30', method: 'SCRIPTED_NARRATIVE_DEMOTION_V1' });
  const prior: AnyRecord = {};
  for (const f of TOP_FIELDS) if (e[f] !== undefined) prior[f] = e[f];
  const strategy = rec(e.strategy);
  if (e.strategy) {
    const s: AnyRecord = {};
    for (const f of STRATEGY_FIELDS) if (strategy[f] !== undefined) s[f] = strategy[f];
    prior.strategy = s;
  }
  snapshot.priorNarrative = prior;
  if (!snapshot.priorTagline) {
    snapshot.priorTagline = e.tagline;
    e.tagline = business ?? UNCONFIRMED;
  }
  e.architecturePattern = UNCONFIRMED;
  e.pipelineStack = UNCONFIRMED;
  e.targetPainWallet = UNCONFIRMED;
  e.moatDescription = UNCONFIRMED;
  e.incumbentDilemma = UNCONFIRMED;
  e.blindspot = UNCONFIRMED;
  e.essence = { whatItDoes: business ?? UNCONFIRMED, targetCustomer: UNCONFIRMED, painRelief: UNCONFIRMED };
  delete e.lootBlueprint;
  delete e.opportunityJudgment;
  e.strategy = {
    ...strategy,
    moatType: 'UNKNOWN', moatDescription: UNCONFIRMED, blindspot: UNCONFIRMED, secretInsight: UNCONFIRMED,
    initialTraction: [], actionPlaybook: [], coldOutreachTemplate: '', incumbentDilemma: UNCONFIRMED,
  };
  reaudit.legacyDisplaySnapshot = snapshot;
  reaudit.narrativeStatus = DEMOTED_STATUS;
  e.reaudit = reaudit;
  return e;
}

function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));
  const counts = { fromStatus: 0, fromNull: 0, businessApplied: 0, taglineReplaced: 0 };
  for (const e of entities) {
    const kind = isTarget(e);
    if (!kind) continue;
    const hadPriorTagline = Boolean(rec(rec(e.reaudit).legacyDisplaySnapshot).priorTagline);
    const business = businessText(e);
    demote(e);
    parseFinancialEntity(e);
    if (kind === 'status') counts.fromStatus++; else counts.fromNull++;
    if (business) counts.businessApplied++;
    if (!hadPriorTagline) counts.taglineReplaced++;
  }
  console.log(JSON.stringify(counts));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}

main();
