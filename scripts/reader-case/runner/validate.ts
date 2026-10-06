/**
 * サブエージェントが書いた結果 JSON の機械検査（受理/拒否）。副作用なし。
 * 拒否理由は code（機械が読む）と message（日本語・人が読む）で返す。サブエージェントへの再試行指示にもそのまま使う。
 */
import { ANALYSIS_ITEMS } from '../../../src/shared/reader-case';

export type StageName = 'analyze' | 'audit' | 'verify';

export type RejectCode =
  | 'NOT_JSON'
  | 'WRONG_SHAPE'
  | 'COUNT_SHORT'
  | 'DUPLICATE_CASE'
  | 'UNKNOWN_ENTITY'
  | 'BAD_ITEM'
  | 'UNKNOWN_EVIDENCE_ID'
  | 'UNKNOWN_ANALYSIS_ID'
  | 'UNKNOWN_CLAIM'
  | 'QUOTE_NOT_IN_SOURCE'
  | 'BAD_BUNDLE';

export interface Rejection {
  code: RejectCode;
  message: string;
}

export type Validation = { ok: true; value: unknown } | { ok: false; reasons: Rejection[] };

/** 表示する理由は最大この件数（大量に出して再試行指示を埋めない） */
const MAX_REASONS = 20;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

/** コードフェンスや前置きが付いていても、最初の { から最後の } までを JSON として読む。読めなければ null。 */
export function parseResultText(raw: string): unknown | null {
  const t = raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b < a) return null;
  try {
    return JSON.parse(t.slice(a, b + 1));
  } catch {
    return null;
  }
}

const finish = (reasons: Rejection[], value: unknown): Validation => (reasons.length ? { ok: false, reasons: reasons.slice(0, MAX_REASONS) } : { ok: true, value });

/** 入力の事例 id と、結果の事例 id を突き合わせる（過不足・重複） */
function coverage(expected: string[], got: string[], reasons: Rejection[], label: string): void {
  const exp = new Set(expected);
  const seen = new Set<string>();
  for (const id of got) {
    if (!exp.has(id)) reasons.push({ code: 'UNKNOWN_ENTITY', message: `${label}: 入力に無い事例 id「${id}」がある` });
    else if (seen.has(id)) reasons.push({ code: 'DUPLICATE_CASE', message: `${label}: 事例 id「${id}」が重複している` });
    seen.add(id);
  }
  const missing = expected.filter((id) => !seen.has(id));
  if (missing.length) reasons.push({ code: 'COUNT_SHORT', message: `${label}: 入力 ${expected.length} 件のうち ${missing.length} 件の結果が無い（${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ' ほか' : ''}）` });
}

interface AnalyzeBundle { cases: { entityId: string; facts?: { id: string }[]; metrics?: { id: string }[] }[] }
interface AuditBundle { cases: { entityId: string; analysis?: { id: string }[] }[] }
interface VerifyBundle { cases: { entityId: string; sources?: { sourceId: string; text: string }[]; claims?: { claimId: string; sourceId: string }[] }[] }

const casesOf = (bundle: unknown): { entityId: string }[] | null => (isObj(bundle) && Array.isArray(bundle.cases) && bundle.cases.every((c) => isObj(c) && str(c.entityId)) ? (bundle.cases as { entityId: string }[]) : null);

const PRESENTATIONS = ['FACT_SUMMARY', 'ESTIMATE'];

export function validateAnalyze(bundle: unknown, result: unknown): Validation {
  const cases = casesOf(bundle) as AnalyzeBundle['cases'] | null;
  if (!cases) return { ok: false, reasons: [{ code: 'BAD_BUNDLE', message: '束ファイルが {cases:[{entityId,…}]} の形でない' }] };
  if (!isObj(result) || !Array.isArray(result.analysis)) return { ok: false, reasons: [{ code: 'WRONG_SHAPE', message: '{"analysis":[…]} の形でない' }] };
  const reasons: Rejection[] = [];
  const byId = new Map(cases.map((c) => [c.entityId, c]));
  const entries = result.analysis as unknown[];
  const ids: string[] = [];
  for (const e of entries) {
    if (!isObj(e) || !str(e.entityId) || !Array.isArray(e.items)) {
      reasons.push({ code: 'WRONG_SHAPE', message: 'analysis の要素が {entityId, items:[…]} の形でない' });
      continue;
    }
    ids.push(e.entityId);
    const c = byId.get(e.entityId);
    if (!c) continue;
    // items が空は正当（出典に事実が無く、書ける項目が無い事例。空欄は創作で埋めず「未調査」として残す）
    const evidence = new Set([...(c.facts ?? []).map((f) => f.id), ...(c.metrics ?? []).map((m) => m.id)]);
    for (const it of e.items as unknown[]) {
      if (!isObj(it) || !str(it.item) || !(ANALYSIS_ITEMS as readonly string[]).includes(it.item)) {
        reasons.push({ code: 'BAD_ITEM', message: `${e.entityId}: item の名前が定義に無い（${isObj(it) ? String(it.item) : typeof it}）` });
        continue;
      }
      const where = `${e.entityId}/${it.item}`;
      if (!str(it.text)) reasons.push({ code: 'BAD_ITEM', message: `${where}: text が空` });
      // confidence（確度ラベル）は廃止。要求も検査もしない（付いていても無視する）。presentation は付いていれば列挙値を検査する
      if (it.presentation !== undefined && !PRESENTATIONS.includes(String(it.presentation))) reasons.push({ code: 'BAD_ITEM', message: `${where}: presentation は FACT_SUMMARY|ESTIMATE` });
      if (it.presentation === 'ESTIMATE' && !str(it.formula)) reasons.push({ code: 'BAD_ITEM', message: `${where}: ESTIMATE には式 formula が必要（式から導けないなら項目ごと省く）` });
      if (it.formula !== undefined && !str(it.formula)) reasons.push({ code: 'BAD_ITEM', message: `${where}: formula は空でない文字列（無ければ項目ごと省く）` });
      if (!Array.isArray(it.basis) || !it.basis.every(str)) {
        reasons.push({ code: 'BAD_ITEM', message: `${where}: basis は id 文字列の配列（根拠が無ければ空配列）` });
        continue;
      }
      for (const b of it.basis as string[]) if (!evidence.has(b)) reasons.push({ code: 'UNKNOWN_EVIDENCE_ID', message: `${where}: 根拠 id「${b}」は入力の facts/metrics に存在しない` });
    }
  }
  coverage(cases.map((c) => c.entityId), ids, reasons, '分析');
  return finish(reasons, result);
}

// HEADLINE はリードの書き直し（headline-prompt.md の出力: FIX=直した文、BLOCK=保留）
const AUDIT_KINDS = ['FACT_DISGUISED', 'CONTRADICTS_FACT', 'UNSUPPORTED_NUMBER', 'ILLEGAL_HOWTO', 'PERSONAL_INFO', 'DEFAMATION', 'WORK_WORDS', 'WEAK', 'HEADLINE'];
/** ケース単位の指摘（事実・事業説明・権利）の analysisId。publication-audit.ts の `__case__` と同じ */
const CASE_LEVEL_ID = '__case__';

export function validateAudit(bundle: unknown, result: unknown): Validation {
  const cases = casesOf(bundle) as AuditBundle['cases'] | null;
  if (!cases) return { ok: false, reasons: [{ code: 'BAD_BUNDLE', message: '束ファイルが {cases:[{entityId,…}]} の形でない' }] };
  if (!isObj(result) || !Array.isArray(result.cases)) return { ok: false, reasons: [{ code: 'WRONG_SHAPE', message: '{"cases":[…]} の形でない' }] };
  const reasons: Rejection[] = [];
  const byId = new Map(cases.map((c) => [c.entityId, c]));
  const ids: string[] = [];
  for (const e of result.cases as unknown[]) {
    if (!isObj(e) || !str(e.entityId) || !Array.isArray(e.items)) {
      reasons.push({ code: 'WRONG_SHAPE', message: 'cases の要素が {entityId, items:[…]} の形でない' });
      continue;
    }
    ids.push(e.entityId);
    const c = byId.get(e.entityId);
    if (!c) continue;
    const analysisIds = new Set((c.analysis ?? []).map((a) => a.id));
    for (const it of e.items as unknown[]) {
      if (!isObj(it)) {
        reasons.push({ code: 'BAD_ITEM', message: `${e.entityId}: items の要素がオブジェクトでない` });
        continue;
      }
      const where = `${e.entityId}/${String(it.analysisId)}`;
      const caseLevel = it.analysisId === CASE_LEVEL_ID;
      if (caseLevel && it.severity === 'FIX') reasons.push({ code: 'BAD_ITEM', message: `${where}: ケース単位（__case__）の指摘は BLOCK か LOW（直す文の置き換え先が無い）` });
      if (!caseLevel && (!str(it.analysisId) || !analysisIds.has(it.analysisId))) reasons.push({ code: 'UNKNOWN_ANALYSIS_ID', message: `${where}: analysisId が入力の analysis に存在しない` });
      if (!AUDIT_KINDS.includes(String(it.kind))) reasons.push({ code: 'BAD_ITEM', message: `${where}: kind が定義に無い（${String(it.kind)}）` });
      if (!['BLOCK', 'FIX', 'LOW'].includes(String(it.severity))) reasons.push({ code: 'BAD_ITEM', message: `${where}: severity は BLOCK|FIX|LOW` });
      if (!str(it.why)) reasons.push({ code: 'BAD_ITEM', message: `${where}: why が空` });
      if (it.severity === 'FIX' && !str(it.fix)) reasons.push({ code: 'BAD_ITEM', message: `${where}: FIX には直した文 fix が必要` });
    }
  }
  coverage(cases.map((c) => c.entityId), ids, reasons, '監査');
  return finish(reasons, result);
}

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
const quoteIn = (texts: readonly string[], quote: string): boolean => texts.some((t) => t.includes(norm(quote)));

export function validateVerify(bundle: unknown, result: unknown): Validation {
  const cases = casesOf(bundle) as VerifyBundle['cases'] | null;
  if (!cases) return { ok: false, reasons: [{ code: 'BAD_BUNDLE', message: '束ファイルが {cases:[{entityId,…}]} の形でない' }] };
  if (!isObj(result) || !Array.isArray(result.verdicts)) return { ok: false, reasons: [{ code: 'WRONG_SHAPE', message: '{"verdicts":[…]} の形でない' }] };
  const reasons: Rejection[] = [];
  const claims = new Map<string, { sourceTexts: string[] }>();
  for (const c of cases) {
    // 長い出典は同じ sourceId の複数チャンク（part/parts）になっている。全チャンクを保持し、引用はどのチャンクにあっても通す
    const texts = new Map<string, string[]>();
    for (const s of c.sources ?? []) texts.set(s.sourceId, [...(texts.get(s.sourceId) ?? []), norm(s.text ?? '')]);
    for (const cl of c.claims ?? []) claims.set(`${c.entityId}\u0000${cl.claimId}`, { sourceTexts: texts.get(cl.sourceId) ?? [] });
  }
  const seen = new Set<string>();
  for (const v of result.verdicts as unknown[]) {
    if (!isObj(v) || !str(v.entityId) || !str(v.claimId)) {
      reasons.push({ code: 'WRONG_SHAPE', message: 'verdicts の要素に entityId / claimId が無い' });
      continue;
    }
    const key = `${v.entityId}\u0000${v.claimId}`;
    const where = `${v.entityId}/${v.claimId}`;
    const claim = claims.get(key);
    if (!claim) {
      reasons.push({ code: 'UNKNOWN_CLAIM', message: `${where}: 入力に無い claim` });
      continue;
    }
    if (seen.has(key)) reasons.push({ code: 'DUPLICATE_CASE', message: `${where}: 判定が重複している` });
    seen.add(key);
    if (!['SUPPORTED', 'PARTIAL', 'NOT_SUPPORTED'].includes(String(v.verdict))) {
      reasons.push({ code: 'BAD_ITEM', message: `${where}: verdict は SUPPORTED|PARTIAL|NOT_SUPPORTED` });
      continue;
    }
    if (v.verdict !== 'NOT_SUPPORTED') {
      if (!str(v.quote)) reasons.push({ code: 'BAD_ITEM', message: `${where}: ${String(v.verdict)} には本文からの quote が必要` });
      else if (!quoteIn(claim.sourceTexts, v.quote)) reasons.push({ code: 'QUOTE_NOT_IN_SOURCE', message: `${where}: quote が出典本文の文字どおりの抜き出しでない` });
    }
    if (v.verdict === 'PARTIAL' && !isObj(v.fix)) reasons.push({ code: 'BAD_ITEM', message: `${where}: PARTIAL には直し fix が必要` });
  }
  const missing = [...claims.keys()].filter((k) => !seen.has(k));
  if (missing.length) reasons.push({ code: 'COUNT_SHORT', message: `照合: claim ${claims.size} 件のうち ${missing.length} 件の判定が無い（${missing.slice(0, 3).map((k) => k.replace('\u0000', '/')).join(', ')}${missing.length > 3 ? ' ほか' : ''}）` });
  return finish(reasons, result);
}

export const VALIDATORS: Record<StageName, (bundle: unknown, result: unknown) => Validation> = {
  analyze: validateAnalyze,
  audit: validateAudit,
  verify: validateVerify,
};

/** 生テキストから受理検査まで通す（JSON として読めなければ NOT_JSON で拒否） */
export function validateRaw(stage: StageName, bundle: unknown, rawText: string): Validation {
  const parsed = parseResultText(rawText);
  if (parsed === null) return { ok: false, reasons: [{ code: 'NOT_JSON', message: 'JSON として読めない（途中で切れている／文章が混ざっている）' }] };
  return VALIDATORS[stage](bundle, parsed);
}
