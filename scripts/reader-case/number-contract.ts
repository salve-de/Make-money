/**
 * 数字の契約（収集の入口）。調査記録の数字に「何の数字か」「いつ時点か」「原文の短い引用・出典URL・取得日」が揃っているかを見る。
 * 揃っていない数字・種類と欄名が合わない数字・同じ種類で食い違う数字・画面に出せる日本語になっていない事実の文は、
 * その項目だけを unconfirmedFacts に分けて残す（取り込まずに収集役へ差し戻す）。
 * 事例全体は止めない。0円や仮の数字で埋めない（OWNER_INTENT 3章）。推定は事実の欄から estimatesFromResearch へ移す。
 *
 * 2026-10-07: 公開10件中7件の数字の誤りは、集める側が数字に種類・時点・引用を付けずに保存していたことが原因だった。
 * 決まりの説明は docs/research-record/README.md「数字の決まり」、照合は原文照合（scripts/reader-case/source-check.ts、申請 #175）。
 */
import { claimNumbers, hasNumber, PARTIAL_SCOPE, sourceNumbers } from './number-parse';
import { MEASURES } from '../../src/shared/reader-case';

/** 数字の種類（調査記録の numberKind） */
export const NUMBER_KINDS = ['REVENUE', 'GMV', 'DIRECT_PAYMENT', 'SURVEY_TIER', 'FUNDING', 'VALUATION', 'EXIT', 'PROFIT', 'PRICE', 'USERS', 'COST', 'OTHER', 'ESTIMATE'] as const;
export type NumberKind = (typeof NUMBER_KINDS)[number];
type Measure = (typeof MEASURES)[number];

/** 種類ごとに使ってよい measure（先頭が省略時の既定）。売上と呼べない種類は OTHER と名前（label）で持つ */
const KIND_MEASURES: Record<Exclude<NumberKind, 'ESTIMATE'>, Measure[]> = {
  REVENUE: ['REVENUE'], GMV: ['OTHER'], DIRECT_PAYMENT: ['OTHER'], SURVEY_TIER: ['OTHER'], FUNDING: ['FUNDING'], VALUATION: ['VALUATION'],
  EXIT: ['EXIT_VALUE'], PROFIT: ['PROFIT', 'OPERATING_INCOME', 'NET_INCOME'], PRICE: ['PRICE'], USERS: ['USERS'], COST: ['COST'], OTHER: ['OTHER'],
};
const KIND_LABEL: Partial<Record<NumberKind, string>> = { GMV: '取扱高', DIRECT_PAYMENT: '直接の支払い', SURVEY_TIER: 'アンケートの区分' };
/** 時点の数字（期間を持たない）。periodKind を省略したら POINT にする */
const POINT_KINDS = new Set<NumberKind>(['FUNDING', 'VALUATION', 'EXIT', 'PRICE', 'USERS', 'SURVEY_TIER']);
/** 売上を名乗る語。売上でない種類の数字の欄名・文に付いていたら、種類と欄名が合わない */
const REVENUE_WORDS = /(年商|月商|売上高?|年間収益|\bARR\b|\bMRR\b|revenue)/i;

export type NumberReason =
  | 'NO_KIND' | 'KIND_MISMATCH' | 'NO_AS_OF' | 'NO_PERIOD_KIND' | 'NO_QUOTE' | 'QUOTE_TOO_LONG' | 'AMOUNT_NOT_IN_QUOTE'
  | 'NO_SOURCE_URL' | 'NO_CHECKED_AT' | 'NO_AMOUNT' | 'CONFLICT' | 'QUOTE_TOO_SHORT' | 'TEXT_UNCLEAR';

export const NUMBER_REASON_LABELS: Record<NumberReason, string> = {
  NO_KIND: '何の数字か（numberKind）が無い',
  KIND_MISMATCH: '種類と欄名が合わない（例: 直接の支払いを「年商」にしている）',
  NO_AS_OF: 'いつ時点か（asOf: 出来事の年・月）が無い',
  NO_PERIOD_KIND: '期間の数字なのに periodKind（月・年・累計など）が無い',
  NO_QUOTE: '原文の短い引用（quote）が無い',
  QUOTE_TOO_LONG: '引用が長すぎる（英語15語・日本語40字まで）',
  AMOUNT_NOT_IN_QUOTE: '数字が引用に無い',
  NO_SOURCE_URL: '出典URL（sourceUrl）が無い',
  NO_CHECKED_AT: '取得日（checkedAt: YYYY-MM-DD）が無い',
  NO_AMOUNT: '金額・数（amount）が数でない',
  CONFLICT: '同じ種類・同じ時点の数字が食い違い、何の分かの区別（basis か label）が無い',
  QUOTE_TOO_SHORT: '引用が短すぎる（数字だけ・2語以下。原文の文の一部を写す）',
  TEXT_UNCLEAR: '事実の文がそのまま画面に出せる日本語になっていない（detail に理由）',
};

/**
 * 事実の文の検査（差し込み式）。文を受け取り、問題の説明を返す（空なら合格）。
 * 取り込み（add-entity-records.ts）が既定の検査と scripts/architecture/fact-text-checks/*.mjs の既定の出力（同じ形の関数）を掛ける。
 */
export type FactTextCheck = (text: string, fact: Record<string, unknown>) => string[];

/** 程度の語（割合・金額・件数で書く。OWNER_INTENT 19章） */
const VAGUE = /(よく|ほぼ|かなり|非常に|とても|大幅に|大きく|わずかに|ある程度)/;
/** 既定の検査: 日本語であること、程度の語を使わないこと */
export const basicFactTextCheck: FactTextCheck = (text) => {
  const out: string[] = [];
  if (!JA.test(text)) out.push('日本語の文になっていない（英語のまま）');
  const v = text.match(VAGUE);
  if (v) out.push(`程度の語「${v[0]}」（割合・金額・件数で書く。数が出典に無ければ「人数は出典に無い」と書く）`);
  return out;
};

export interface UnconfirmedNumber { where: 'metrics' | 'facts'; index: number; reasons: NumberReason[]; detail?: string[]; item: Record<string, unknown> }

type Rec = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const AS_OF = /^(?:19|20)\d{2}(?:-(?:0[1-9]|1[0-2])(?:-(?:0[1-9]|[12]\d|3[01]))?)?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const JA = /[぀-ヿ㐀-鿿]/;

/** 引用の長さの上限（英語は15語、日本語は40字） */
export function quoteTooLong(q: string): boolean {
  return JA.test(q) ? q.replace(/\s+/g, '').length > 40 : q.split(/\s+/).filter(Boolean).length > 15;
}

/** 引用の長さの下限（数字だけ・2語以下では原文のどこか分からない） */
export function quoteTooShort(q: string): boolean {
  return JA.test(q) ? q.replace(/\s+/g, '').length < 6 : q.split(/\s+/).filter(Boolean).length < 3;
}

/** 出典・取得日・引用の共通の確かめ */
function provenance(item: Rec, reasons: NumberReason[]) {
  if (!str(item.sourceUrl) || !/^https?:\/\//.test(String(item.sourceUrl))) reasons.push('NO_SOURCE_URL');
  if (!str(item.checkedAt) || !DAY.test(String(item.checkedAt))) reasons.push('NO_CHECKED_AT');
  if (!str(item.asOf) || !AS_OF.test(String(item.asOf))) reasons.push('NO_AS_OF');
  const q = str(item.quote);
  if (!q) reasons.push('NO_QUOTE');
  else if (quoteTooLong(q)) reasons.push('QUOTE_TOO_LONG');
  else if (quoteTooShort(q)) reasons.push('QUOTE_TOO_SHORT');
  return q;
}

/** 数字1件（metrics の1件）を確かめ、目録の形（measure・label・statedAt・period）にそろえる */
export function checkMetricEntry(raw: Rec): { reasons: NumberReason[]; metric: Rec; estimate: boolean } {
  const m = { ...raw };
  const reasons: NumberReason[] = [];
  const kind = str(m.numberKind) as NumberKind | undefined;
  if (!kind || !(NUMBER_KINDS as readonly string[]).includes(kind)) reasons.push('NO_KIND');
  if (kind === 'ESTIMATE') return { reasons: [], metric: { ...m, origin: 'ESTIMATED' }, estimate: true };
  const k = kind as Exclude<NumberKind, 'ESTIMATE'> | undefined;
  if (typeof m.amount !== 'number' || !Number.isFinite(m.amount)) reasons.push('NO_AMOUNT');
  const q = provenance(m, reasons);
  if (q && typeof m.amount === 'number' && !hasNumber(sourceNumbers(q), m.amount)) reasons.push('AMOUNT_NOT_IN_QUOTE');
  if (k && KIND_MEASURES[k]) {
    const kind = k;
    const allowed = KIND_MEASURES[kind];
    if (!str(m.measure)) m.measure = allowed[0];
    if (!allowed.includes(m.measure as Measure)) reasons.push('KIND_MISMATCH');
    if (!str(m.label) && KIND_LABEL[kind]) m.label = KIND_LABEL[kind];
    const names = `${str(m.label) ?? ''} ${str(m.basis) ?? ''} ${str(m.period) ?? ''}`;
    // 売上でない種類に売上の名前（年商・月商・売上）が付いている。利益の欄名の「売上総利益」は売上の名乗りではない
    if (kind !== 'REVENUE' && REVENUE_WORDS.test(names.replace(/売上総利益|gross profit/gi, '')) && !(kind === 'PROFIT' && /利益|profit|income/i.test(names))) reasons.push('KIND_MISMATCH');
    if (kind === 'REVENUE' && PARTIAL_SCOPE.test(names)) reasons.push('KIND_MISMATCH');
    if (!str(m.periodKind)) {
      if (POINT_KINDS.has(kind)) m.periodKind = 'POINT';
      else reasons.push('NO_PERIOD_KIND');
    }
  }
  // 時点は出来事の日付（asOf）。投稿日ではない。目録の数字は statedAt を時点として読む（src/shared/metric-when.ts）
  if (str(m.asOf) && AS_OF.test(String(m.asOf))) {
    m.statedAt = m.asOf;
    if (!str(m.period)) m.period = String(m.asOf);
  }
  return { reasons: [...new Set(reasons)], metric: m, estimate: false };
}

/**
 * 事実1件を確かめる。どの事実も原文の引用・出典・取得日が要る（原文照合に使う）。
 * 数（年・小さい数・円換算を除く）を含む事実は、種類（numberKind）と出来事の時点（asOf）も要る。
 */
export function checkFactEntry(f: Rec, textChecks: readonly FactTextCheck[] = []): { reasons: NumberReason[]; detail: string[] } {
  const text = str(f.text) ?? '';
  const { numbers } = claimNumbers(text);
  const reasons: NumberReason[] = [];
  const kind = str(f.numberKind) as NumberKind | undefined;
  if (!str(f.sourceUrl) || !/^https?:\/\//.test(String(f.sourceUrl))) reasons.push('NO_SOURCE_URL');
  if (!str(f.checkedAt) || !DAY.test(String(f.checkedAt))) reasons.push('NO_CHECKED_AT');
  const q = str(f.quote);
  if (!q) reasons.push('NO_QUOTE');
  else if (quoteTooLong(q)) reasons.push('QUOTE_TOO_LONG');
  else if (quoteTooShort(q)) reasons.push('QUOTE_TOO_SHORT');
  if (numbers.length) {
    if (!kind || !(NUMBER_KINDS as readonly string[]).includes(kind)) reasons.push('NO_KIND');
    if (!str(f.asOf) || !AS_OF.test(String(f.asOf))) reasons.push('NO_AS_OF');
    if (q && !numbers.some((n) => hasNumber(sourceNumbers(q), n))) reasons.push('AMOUNT_NOT_IN_QUOTE');
    // 売上でない種類（直接の支払い・取扱高・アンケートの区分）の数字を「年商・月商・売上」と書いている
    if (kind && ['GMV', 'DIRECT_PAYMENT', 'SURVEY_TIER'].includes(kind) && REVENUE_WORDS.test(text) && !PARTIAL_SCOPE.test(text)) reasons.push('KIND_MISMATCH');
    if (kind === 'ESTIMATE') reasons.push('KIND_MISMATCH'); // 推定は事実の欄に書かない（分析の段で印を付けて書く）
  }
  const detail = textChecks.flatMap((c) => c(text, f));
  if (detail.length) reasons.push('TEXT_UNCLEAR');
  return { reasons: [...new Set(reasons)], detail };
}

/** 同じ種類・同じ時点・同じ通貨で金額が違い、区別（basis・label）が無い数字の組 */
function conflicts(list: Rec[]): Set<number> {
  const out = new Set<number>();
  const key = (m: Rec) => [m.numberKind, m.measure, m.periodKind, m.asOf, m.currency ?? '', m.unit ?? ''].join('|');
  const tag = (m: Rec) => `${str(m.basis) ?? ''}|${str(m.label) ?? ''}`;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i]; const b = list[j];
      if (key(a) !== key(b) || typeof a.amount !== 'number' || typeof b.amount !== 'number') continue;
      if (hasNumber([a.amount], b.amount)) continue;
      if (tag(a) !== tag(b) && (str(a.basis) || str(b.basis))) continue;
      out.add(i); out.add(j);
    }
  }
  return out;
}

/**
 * 調査記録の数字（metrics と、数を含む facts）を確かめる。通らない物だけを外して unconfirmedFacts に残す。
 * 返り値の changes は normalizedFromResearch に足す説明。
 */
export function applyNumberContract(r: Rec, textChecks: readonly FactTextCheck[] = [basicFactTextCheck]): { changes: string[]; unconfirmed: UnconfirmedNumber[] } {
  const changes: string[] = [];
  const unconfirmed: UnconfirmedNumber[] = [];
  const estimates: Rec[] = [];
  // 取得日が無い事実・数字は、同じ出典の取得日（reaudit.sources[].checkedAt）で補う。出典を開いた日なので作り話ではない
  const fetched = new Map((((r.reaudit as { sources?: Rec[] } | undefined)?.sources) ?? []).map((s) => [str(s.url), str(s.checkedAt)] as const));
  for (const it of [...(Array.isArray(r.metrics) ? r.metrics : []), ...(Array.isArray(r.facts) ? r.facts : [])] as Rec[]) {
    const day = fetched.get(str(it?.sourceUrl));
    if (it && !str(it.checkedAt) && day && DAY.test(day)) { it.checkedAt = day; changes.push(`checkedAt: 空→出典の取得日 ${day}`); }
  }
  if (Array.isArray(r.metrics)) {
    const kept: { i: number; m: Rec }[] = [];
    (r.metrics as unknown[]).forEach((raw, i) => {
      if (!raw || typeof raw !== 'object') return;
      const { reasons, metric, estimate } = checkMetricEntry(raw as Rec);
      if (estimate) { estimates.push(metric); return; }
      if (reasons.length) unconfirmed.push({ where: 'metrics', index: i, reasons, item: raw as Rec });
      else kept.push({ i, m: metric });
    });
    const bad = conflicts(kept.map((k) => k.m));
    r.metrics = kept.filter((k, n) => {
      if (!bad.has(n)) return true;
      unconfirmed.push({ where: 'metrics', index: k.i, reasons: ['CONFLICT'], item: k.m });
      return false;
    }).map((k) => k.m);
  }
  if (Array.isArray(r.facts)) {
    r.facts = (r.facts as unknown[]).filter((f, i) => {
      if (!f || typeof f !== 'object') return true;
      const { reasons, detail } = checkFactEntry(f as Rec, textChecks);
      if (!reasons.length) return true;
      unconfirmed.push({ where: 'facts', index: i, reasons, ...(detail.length ? { detail } : {}), item: f as Rec });
      return false;
    });
  }
  if (estimates.length) { r.estimatesFromResearch = estimates; changes.push(`metrics: 推定${estimates.length}件→estimatesFromResearch（事実の欄に入れない）`); }
  if (unconfirmed.length) {
    r.unconfirmedFacts = unconfirmed.map((u) => ({ ...u, reasonLabels: u.reasons.map((x) => NUMBER_REASON_LABELS[x]) }));
    for (const u of unconfirmed) changes.push(`${u.where}.${u.index}: 数字の決まりを満たさない（${u.reasons.join(',')}）→unconfirmedFacts`);
  }
  // 数字・事実の出典が reaudit.sources に無いと、目録の組み立てで出典に結べず捨てられる。所在だけを足す（中身は作らない）
  const audit = (r.reaudit && typeof r.reaudit === 'object' ? r.reaudit : (r.reaudit = {})) as { sources?: Rec[] };
  const sources = Array.isArray(audit.sources) ? audit.sources : (audit.sources = []);
  const known = new Set(sources.map((s) => str(s.url)));
  for (const it of [...(Array.isArray(r.metrics) ? r.metrics : []), ...(Array.isArray(r.facts) ? r.facts : [])] as Rec[]) {
    const u = str(it?.sourceUrl);
    if (!u || known.has(u) || !/^https?:\/\//.test(u)) continue;
    // 利用条件（rightsTier）は書かない。出典の利用条件は組み立て側の規則（source-policy）が決める
    sources.push({ url: u, sourceType: 'unknown', publicationDate: null, checkedAt: str(it.checkedAt) ?? null });
    known.add(u); changes.push(`reaudit.sources: 事実・数字の出典 ${u} を足す`);
  }
  return { changes, unconfirmed };
}
