/**
 * 許可リスト方式への切り替え（2026-09-30）
 *
 * 目的: 元がAI作文だったレコード（reaudit.narrativeStatus = AI_NARRATIVE_DEMOTED_UNVERIFIED_20260930）は、
 * 「悪い欄を見つけて消す」のをやめ、「出典で裏づけられたものだけを出し、それ以外は全部出さない」。
 * 許可リストの定義と判定は scripts/architecture/facts-only-lib.mjs（check-template-prose.mjs と共通）。
 *
 * A. 対象レコードで許可リスト外の値を全部退避し、スキーマが許す「未確認」の形にする（文字列 "未確認"、配列 []、
 *    pnl は各 is*Unconfirmed=true で数値0）。REPLACED / REWRITTEN には A を適用しない。
 * B. 全レコード共通の機械的な誤り
 *    B1 運営指標の型（週20時間・初期資本100000・自動化85・初期人数1 のうち2つ以上）→ 未確認
 *    B2 COGS未確認なのに粗利=売上・粗利率100% → 粗利と粗利率を未確認
 *    B3 月商に幅の上限やピーク値を使っている → 月商を未確認、元の表記を revenueLabel に残す
 *    B4 founder が現職の肩書だけで「創業」の語が無い → 未確認
 *
 * 退避先: reaudit.legacyDisplaySnapshot.priorNarrative.allowlistWithdrawn.<欄>（founder だけは既存の priorNarrative.founder）。
 * 何も削除しない。作文を別の作文で置き換えない。冪等（退避済みの欄は上書きしない。2回目以降は何も変えない）。
 *
 * 使い方: node --import tsx scripts/reaudit/facts-only-allowlist.ts [--dry-run]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';
import {
  PNL_FLAG_KEYS,
  PNL_OPEX_KEYS,
  STRATEGY_TEXT_KEYS,
  TEMPORAL_UNKNOWN,
  TOP_TEXT_KEYS,
  UNCONFIRMED,
  WITHDRAWN_TOP_KEYS,
  businessText,
  isAllowedCard,
  isAllowedDescription,
  isAllowedEstimationLogic,
  isAllowedObservation,
  isAllowedRevenueLabel,
  isAllowedSourceDoc,
  NO_SOURCE_DOC,
  isAllowedStreamItem,
  isAllowedTimelineEvent,
  isAllowedToolEntry,
  isChannelSourced,
  isDemoted,
  isFoundedYearSourced,
  isFounderTitleOnly,
  isGrossMargin100,
  isOperationsTemplate,
  isRevenuePeakOrRange,
  isTeamSizeSourced,
  operationsTemplateHits,
} from '../architecture/facts-only-lib.mjs';

type AnyRecord = Record<string, unknown>;
const rec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});
const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
/** キー順に依存しない比較用の文字列。 */
const canon = (v: unknown): string => JSON.stringify(v, (_k, val) => (val && typeof val === 'object' && !Array.isArray(val)
  ? Object.fromEntries(Object.entries(val as AnyRecord).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
  : val));

const DATE = '2026-09-30';
const METHOD = 'SCRIPTED_FACTS_ONLY_ALLOWLIST_V1';
const dryRun = process.argv.includes('--dry-run');
const indexPath = resolve(process.cwd(), 'data/entities-index.json');

const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };

function snapshotOf(e: AnyRecord): AnyRecord {
  const reaudit = rec(e.reaudit);
  const snap = rec(reaudit.legacyDisplaySnapshot);
  if (!snap.status) Object.assign(snap, { status: 'SUPERSEDED_NOT_PRIMARY_VALIDATED', supersededAt: DATE, method: METHOD });
  reaudit.legacyDisplaySnapshot = snap;
  e.reaudit = reaudit;
  return snap;
}
function priorNarrativeOf(e: AnyRecord): AnyRecord {
  const snap = snapshotOf(e);
  const pn = rec(snap.priorNarrative);
  snap.priorNarrative = pn;
  return pn;
}
/** 退避。退避済みの欄は上書きしない。 */
function stash(e: AnyRecord, key: string, value: unknown) {
  if (value === undefined) return;
  const pn = priorNarrativeOf(e);
  const bucket = rec(pn.allowlistWithdrawn);
  if (bucket.withdrawnAt === undefined) bucket.withdrawnAt = DATE;
  if (bucket[key] === undefined) bucket[key] = clone(value);
  pn.allowlistWithdrawn = bucket;
}
function stashList(e: AnyRecord, key: string, items: unknown[]) {
  if (!items.length) return;
  const pn = priorNarrativeOf(e);
  const bucket = rec(pn.allowlistWithdrawn);
  if (bucket.withdrawnAt === undefined) bucket.withdrawnAt = DATE;
  const list = Array.isArray(bucket[key]) ? (bucket[key] as unknown[]) : [];
  for (const it of items) if (!list.some((x) => canon(x) === canon(it))) list.push(clone(it));
  bucket[key] = list;
  pn.allowlistWithdrawn = bucket;
}

/** 元の表記（幅・ピーク・時点つき）をそのまま残し、出典の記載であることを示す前置きだけ付ける。 */
function cleanLabel(text: string): string {
  return `出典記載（幅・ピーク値。月商としては未確認）: ${text.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()}`;
}

/** B3: 月商の根拠が幅・ピークなら、元の表記（claimBindings の targetText）を revenueLabel 用に取り出す。 */
function revenueBindingLabel(e: AnyRecord): string | null {
  for (const b of Array.isArray(e.claimBindings) ? (e.claimBindings as AnyRecord[]) : []) {
    if (b && b.claimKey === 'pnl.monthlyRevenue' && isStr(rec(b.locator).targetText)) return cleanLabel(rec(b.locator).targetText as string);
  }
  return null;
}

function unknownPnl(p: AnyRecord, e: AnyRecord, revenueLabel: string | null): AnyRecord {
  const next: AnyRecord = {};
  for (const k of ['monthlyRevenue', 'cogs', 'grossProfit', 'grossMargin']) next[k] = 0;
  next.operatingExpenses = Object.fromEntries(PNL_OPEX_KEYS.map((k) => [k, 0]));
  for (const k of ['operatingProfit', 'operatingMargin', 'estimatedAnnualNetProfit']) next[k] = 0;
  for (const k of PNL_FLAG_KEYS) next[k] = true;
  const fs = p.financialStatus === 'VERIFIED' ? 'REPORTED' : p.financialStatus;
  if (fs !== undefined) next.financialStatus = fs;
  if (isStr(p.dataSnapshotPeriod)) next.dataSnapshotPeriod = p.dataSnapshotPeriod;
  if (isStr(p.estimationLogic) && isAllowedEstimationLogic(p.estimationLogic, p)) next.estimationLogic = p.estimationLogic;
  // 数値を全部取り下げ、推計の根拠文も残らないなら、表示できる推計は無い
  if (next.financialStatus === 'ESTIMATED' && !isStr(next.estimationLogic)) next.financialStatus = 'UNAVAILABLE';
  if (isStr(p.sourceDoc)) {
    if (isAllowedSourceDoc(p.sourceDoc)) next.sourceDoc = p.sourceDoc;
    else { stash(e, 'pnl.sourceDoc', p.sourceDoc); next.sourceDoc = NO_SOURCE_DOC; }
  }
  const label = isStr(p.revenueLabel) && isAllowedRevenueLabel(p.revenueLabel, p) ? p.revenueLabel : revenueLabel;
  if (label && isAllowedRevenueLabel(label, next)) next.revenueLabel = label;
  else if (label) stash(e, 'pnl.revenueLabel', label);
  if (isStr(p.sourceClass)) next.sourceClass = p.sourceClass;
  if (p.evidenceLocator !== undefined) next.evidenceLocator = p.evidenceLocator;
  return next;
}


function applyAllowlist(e: AnyRecord): boolean {
  const before = JSON.stringify(e);
  const biz = businessText(e);

  // --- 1. 説明欄 ---
  const put = (key: string, value: unknown) => stash(e, key, value);
  if (!isAllowedDescription(e.tagline, e)) {
    put('tagline', e.tagline);
    e.tagline = biz ?? UNCONFIRMED;
    bump('A.tagline');
  }
  if (e.description !== undefined && !isAllowedDescription(e.description, e)) {
    put('description', e.description);
    e.description = UNCONFIRMED;
    bump('A.description');
  }
  for (const k of TOP_TEXT_KEYS) {
    if (e[k] !== undefined && e[k] !== UNCONFIRMED) { put(k, e[k]); e[k] = UNCONFIRMED; bump(`A.${k}`); }
  }
  const essence = rec(e.essence);
  if (e.essence) {
    if (!isAllowedDescription(essence.whatItDoes, e)) { put('essence.whatItDoes', essence.whatItDoes); essence.whatItDoes = biz ?? UNCONFIRMED; bump('A.essence.whatItDoes'); }
    for (const k of ['targetCustomer', 'painRelief']) {
      if (isStr(essence[k]) && essence[k] !== UNCONFIRMED) { put(`essence.${k}`, essence[k]); essence[k] = UNCONFIRMED; bump(`A.essence.${k}`); }
    }
  }
  const strategy = rec(e.strategy);
  if (e.strategy) {
    if (strategy.moatType !== undefined && strategy.moatType !== 'UNKNOWN') { put('strategy.moatType', strategy.moatType); strategy.moatType = 'UNKNOWN'; bump('A.strategy.moatType'); }
    for (const k of STRATEGY_TEXT_KEYS) {
      if (strategy[k] !== undefined && strategy[k] !== UNCONFIRMED) { put(`strategy.${k}`, strategy[k]); strategy[k] = UNCONFIRMED; bump(`A.strategy.${k}`); }
    }
    for (const k of ['initialTraction', 'actionPlaybook']) {
      if (Array.isArray(strategy[k]) && (strategy[k] as unknown[]).length) { put(`strategy.${k}`, strategy[k]); strategy[k] = []; bump(`A.strategy.${k}`); }
    }
    if (isStr(strategy.coldOutreachTemplate)) { put('strategy.coldOutreachTemplate', strategy.coldOutreachTemplate); strategy.coldOutreachTemplate = ''; bump('A.strategy.coldOutreachTemplate'); }
  }

  // --- 2. 型のある特異点ブロック（料金・集客・大手の自爆・手口カード）---
  for (const k of WITHDRAWN_TOP_KEYS) {
    if (e[k] !== undefined) { put(k, e[k]); delete e[k]; bump(`A.${k}`); }
  }

  // --- 3. 損益 ---
  const pnl = rec(e.pnl);
  const revenueBinding = revenueBindingLabel(e);
  const wasPeak = isRevenuePeakOrRange(e as never);
  const nextPnl = unknownPnl(pnl, e, isStr(pnl.revenueLabel) && isAllowedRevenueLabel(pnl.revenueLabel, pnl) ? null : revenueBinding);
  if (canon(nextPnl) !== canon(pnl)) {
    put('pnl', pnl);
    e.pnl = nextPnl;
    bump('A.pnl');
    if (wasPeak && isStr(nextPnl.revenueLabel)) bump('B3.revenueLabel kept from original wording');
  }
  if (isStr(nextPnl.financialStatus) && e.financialStatus !== nextPnl.financialStatus && (e.financialStatus === 'VERIFIED' || e.financialStatus === 'ESTIMATED')) {
    put('financialStatus', e.financialStatus);
    e.financialStatus = nextPnl.financialStatus;
  }
  const bindings = Array.isArray(e.claimBindings) ? (e.claimBindings as AnyRecord[]) : [];
  const retired = bindings.filter((b) => typeof b?.claimKey === 'string' && (b.claimKey as string).startsWith('pnl.'));
  if (retired.length) {
    stashList(e, 'claimBindings', retired);
    e.claimBindings = bindings.filter((b) => !retired.includes(b));
    bump('A.claimBindings(pnl.*)', retired.length);
  }

  // --- 4. 運営指標 ---
  const ops = rec(e.operations);
  const nextOps: AnyRecord = { ...ops };
  const teamSourced = isTeamSizeSourced(ops.teamSize, e);
  nextOps.teamSize = teamSourced ? ops.teamSize : 0;
  if (ops.currentTeamSize !== undefined) nextOps.currentTeamSize = isTeamSizeSourced(ops.currentTeamSize, e) ? ops.currentTeamSize : 0;
  if (ops.initialTeamSize !== undefined) nextOps.initialTeamSize = 0;
  nextOps.isTeamSizeUnconfirmed = !teamSourced;
  Object.assign(nextOps, { weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true });
  nextOps.primaryChannels = (Array.isArray(ops.primaryChannels) ? ops.primaryChannels : []).filter((c) => isChannelSourced(c, e));
  nextOps.toolStack = (Array.isArray(ops.toolStack) ? (ops.toolStack as AnyRecord[]) : []).filter((t) => isAllowedToolEntry(t));
  if (canon(nextOps) !== canon(ops)) {
    const removedTools = (Array.isArray(ops.toolStack) ? (ops.toolStack as AnyRecord[]) : []).filter((t) => !isAllowedToolEntry(t));
    put('operations', ops);
    e.operations = nextOps;
    bump('A.operations');
    if (removedTools.length) bump('A.operations.toolStack entries', removedTools.length);
  }

  // --- 5. 時系列（temporal / timelineEvents）---
  if (e.temporal) {
    const tp = rec(e.temporal);
    const year = isFoundedYearSourced(tp.foundedYear, e) ? tp.foundedYear : 0;
    const nextTp = { ...TEMPORAL_UNKNOWN, foundedYear: year };
    const differs = (Object.keys(nextTp) as (keyof typeof nextTp)[]).some((k) => tp[k] !== nextTp[k]);
    if (differs) { put('temporal', tp); e.temporal = nextTp; bump('A.temporal'); }
  }
  if (Array.isArray(e.timelineEvents)) {
    const removed = (e.timelineEvents as AnyRecord[]).filter((t) => !isAllowedTimelineEvent(t));
    if (removed.length) {
      stashList(e, 'timelineEvents', removed);
      e.timelineEvents = (e.timelineEvents as AnyRecord[]).filter((t) => isAllowedTimelineEvent(t));
      bump('A.timelineEvents(records)');
    }
  }

  // --- 6. 手口カード・観測 ---
  if (Array.isArray(e.evidenceCards)) {
    const removed = (e.evidenceCards as AnyRecord[]).filter((c) => !isAllowedCard(c));
    if (removed.length) {
      stashList(e, 'evidenceCards', removed);
      e.evidenceCards = (e.evidenceCards as AnyRecord[]).filter((c) => isAllowedCard(c));
      bump('A.evidenceCards(records)');
      bump('A.evidenceCards(cards)', removed.length);
    }
  }
  if (Array.isArray(e.observationsStream)) {
    const removed = (e.observationsStream as AnyRecord[]).filter((o) => !isAllowedStreamItem(o));
    if (removed.length) {
      stashList(e, 'observationsStream', removed);
      e.observationsStream = (e.observationsStream as AnyRecord[]).filter((o) => isAllowedStreamItem(o));
      bump('A.observationsStream(records)');
      bump('A.observationsStream(items)', removed.length);
    }
  }
  if (Array.isArray(e.observations)) {
    const allowedStream = new Set((Array.isArray(e.observationsStream) ? (e.observationsStream as AnyRecord[]) : []).map((o) => o.text as string));
    const removed = (e.observations as unknown[]).filter((o) => !isAllowedObservation(o, e as never, allowedStream));
    if (removed.length) {
      stashList(e, 'observations', removed);
      e.observations = (e.observations as unknown[]).filter((o) => isAllowedObservation(o, e as never, allowedStream));
      bump('A.observations(records)');
      bump('A.observations(items)', removed.length);
    }
  }

  // --- 7. 成長率・審査済みバッジ・審査通過 ---
  if (e.isGrowthUnconfirmed !== true || (typeof e.growthRateYoY === 'number' && e.growthRateYoY !== 0)) {
    put('growth', { growthRateYoY: e.growthRateYoY, isGrowthUnconfirmed: e.isGrowthUnconfirmed });
    e.growthRateYoY = 0;
    e.isGrowthUnconfirmed = true;
    bump('A.growth');
  }
  if (e.verifiedBadge === true) { put('verifiedBadge', true); e.verifiedBadge = false; bump('A.verifiedBadge'); }

  const changed = JSON.stringify(e) !== before;
  if (!changed) return false;

  if (!Array.isArray(e.evidenceCards) || (e.evidenceCards as unknown[]).length === 0) {
    e.evidenceCards = [{
      id: `${String(e.id)}_reaudit_allowlist_withdrawn`,
      type: 'UNKNOWN_AUDIT',
      title: '未確認の項目',
      badge: '未確認',
      evidenceStatus: 'UNKNOWN',
      punchline: '損益・運営指標・料金・手口は出典で確認できていないため未確認。',
      details: [
        '未確認: 事業実態・手口・現金着金・原価構造（出典が見つかっていない）',
      ],
      sourceNote: '調査範囲の開示',
      sourceClass: 'PRIMARY',
    }];
    bump('disclosure card added');
  }
  if (e.publishability === 'PUBLISHABLE') {
    stash(e, 'publishability', 'PUBLISHABLE');
    e.publishability = 'PARTIAL';
    bump('A.publishability PUBLISHABLE->PARTIAL');
  }
  return true;
}

/** B1〜B3: 対象外（DEMOTED 以外）のレコードにも共通の機械的な誤りを直す。DEMOTED は A が既に0にしている。 */
function applyMechanical(e: AnyRecord) {
  const ops = rec(e.operations);
  if (isOperationsTemplate(ops)) {
    stash(e, 'operations(B1)', ops);
    Object.assign(ops, { weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true });
    if (ops.initialTeamSize === 1) ops.initialTeamSize = 0;
    bump('B1.applied(non-A)');
  }
  const pnl = rec(e.pnl);
  if (isGrossMargin100(pnl)) {
    stash(e, 'pnl.gross(B2)', { grossProfit: pnl.grossProfit, grossMargin: pnl.grossMargin });
    Object.assign(pnl, { grossProfit: 0, grossMargin: 0, isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true });
    bump('B2.applied(non-A)');
  }
  if (isRevenuePeakOrRange(e as never)) {
    const label = revenueBindingLabel(e) ?? (isStr(pnl.revenueLabel) ? (pnl.revenueLabel as string) : null);
    stash(e, 'pnl.monthlyRevenue(B3)', { monthlyRevenue: pnl.monthlyRevenue, revenueLabel: pnl.revenueLabel, estimationLogic: pnl.estimationLogic });
    pnl.monthlyRevenue = 0;
    pnl.isRevenueUnconfirmed = true;
    if (label) pnl.revenueLabel = label;
    e.claimBindings = (Array.isArray(e.claimBindings) ? (e.claimBindings as AnyRecord[]) : []).filter((b) => b?.claimKey !== 'pnl.monthlyRevenue');
    bump('B3.applied(non-A)');
  }
}

function main() {
  const entities: AnyRecord[] = JSON.parse(readFileSync(indexPath, 'utf8'));

  // 変更前の該当件数（A/B を適用する前の全件スキャン）
  const pre = { B1: 0, B2: 0, B3: 0, B4: 0, demoted: 0 };
  for (const e of entities) {
    if (isDemoted(e as never)) pre.demoted++;
    if (isOperationsTemplate(e.operations)) pre.B1++;
    if (isGrossMargin100(e.pnl)) pre.B2++;
    if (isRevenuePeakOrRange(e as never)) pre.B3++;
    if (isFounderTitleOnly(e.founder)) pre.B4++;
  }
  const b1Combos: Record<string, number> = {};
  for (const e of entities) {
    const hits = operationsTemplateHits(e.operations);
    if (hits.length >= 2) b1Combos[hits.join('+')] = (b1Combos[hits.join('+')] ?? 0) + 1;
  }

  for (const e of entities) {
    // B4（全レコード）
    if (isFounderTitleOnly(e.founder)) {
      const pn = priorNarrativeOf(e);
      if (pn.founder === undefined) pn.founder = e.founder;
      bump('B4.founder');
      if (isDemoted(e as never)) bump('B4.founder(demoted)');
      e.founder = UNCONFIRMED;
    }
    let touched = false;
    if (isDemoted(e as never)) {
      touched = applyAllowlist(e);
      if (touched) bump('A.records changed');
    } else {
      const b = JSON.stringify(e);
      applyMechanical(e);
      touched = JSON.stringify(e) !== b;
    }
    void touched;
  }
  // 全件を最後にスキーマで検証（founder だけを変えたレコードも含む）
  for (const e of entities) parseFinancialEntity(e);

  console.log(JSON.stringify({ pre, b1Combos, counts }, null, 1));
  if (!dryRun) writeFileSync(indexPath, JSON.stringify(entities, null, 2), 'utf8');
}

main();
