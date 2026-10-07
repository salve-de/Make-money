/**
 * 推論（reader.analysis）の機械の確かめ。Codex が返した item を1件ずつ検査し、通ったものだけを残す。純粋関数。
 * 事実（facts/metrics）とは混ぜない。ここを通っても画面は「推測」と明記して出す。
 */
import { createHash } from 'node:crypto';
import { metricLine } from './verify-lib';
import { evidenceNumbers, numbersIn, numbersMissingFrom, sameNumber } from '../../src/shared/number-evidence';
import { ReaderAnalysisSchema, type ReaderAnalysis, type ReaderCase } from '../../src/shared/reader-case';

export const ANALYSIS_FILE = 'data/reader-analysis.json';
// 監査の鮮度。監査した時点の推論（機械の検査を通った直後、監査の修正前）の指紋と、今の指紋が同じ事例だけを「監査済み」とする
export const RAW_HASHES_FILE = 'data/analysis-raw-hashes.json';
export const AUDIT_BASELINE_FILE = 'data/audit/baseline-hashes.json';
export const AUDIT_FRESH_FILE = 'data/audit-fresh.json';
/** 監査役に渡す「元の材料」: 照合後の事実・数字の行・分析役が読んだ出典の本文。build-audit-input.ts が渡すものと同じ形 */
export interface AuditEvidence {
  facts: { id: string; kind: string; text: string; attribution?: unknown }[];
  metrics: { id: string; line: string }[];
  sources: unknown;
}
export function auditEvidence(reader: Pick<ReaderCase, 'facts' | 'metrics'>, sources: unknown): AuditEvidence {
  return {
    facts: reader.facts.map((f) => ({ id: f.id, kind: f.kind, text: f.text, attribution: f.attribution })),
    metrics: reader.metrics.map((m) => ({ id: m.id, line: metricLine(m) })),
    sources: sources ?? [],
  };
}
// 指紋には監査役に渡す中身をすべて入れる: 推論（文・式・根拠・確度）、その事例の照合結果、そして推論の元になった事実・数字・出典の本文。
// 文が同じでも、根拠や元の出典・事実が変われば監査し直す
export function analysisHash(items: readonly { item: string; text: string; formula?: string; basis?: readonly string[]; confidence?: string; presentation?: string }[], verdict: unknown, evidence: AuditEvidence): string {
  // confidence（確度ラベル）は廃止。付いている旧データだけ従来どおり指紋に入れる（保存済みの全指紋を変えないため）。
  // 付いていない（新しい指示で作った）項目は、確度の有無に左右されない。presentation も付いている時だけ入れる
  const body = items.map((a) => [a.item, a.text, a.formula ?? '', [...(a.basis ?? [])], ...(a.confidence ? [a.confidence] : []), ...(a.presentation ? [a.presentation] : [])]);
  return createHash('sha256').update(JSON.stringify([body, verdict ?? null, evidence])).digest('hex').slice(0, 16);
}
/** 旧形式の指紋（推論と照合結果だけ）。data/ の指紋を新形式へ移す scripts/reader-case/migrate-hashes.ts だけが使う */
export function legacyAnalysisHash(items: readonly { item: string; text: string; formula?: string; basis?: readonly string[]; confidence?: string }[], verdict?: unknown): string {
  const body = items.map((a) => [a.item, a.text, a.formula ?? '', [...(a.basis ?? [])], a.confidence ?? '']);
  return createHash('sha256').update(JSON.stringify([body, verdict ?? null])).digest('hex').slice(0, 16);
}
export const ANALYZE_DIR = 'data/analyze';

export type DropReason =
  | 'schema'
  | 'basis-missing-id'
  | 'basis-empty'
  | 'duplicate-item'
  | 'fabricated-statement'
  | 'work-description'
  | 'fact-exists'
  | 'number-without-formula'
  | 'contradicts-revenue'
  | 'illegal-howto'
  // 数字の出どころ検査（strictNumbers を付けた受け入れ時だけ）
  | 'placeholder-number'
  | 'number-not-in-evidence'
  | 'estimate-without-fact-inputs';

/** 保存する形（id は a-<item小文字>） */
export type StoredAnalysis = Omit<ReaderAnalysis, 'id'> & { id: string };
export type AnalysisFile = Record<string, StoredAnalysis[]>;

export interface RawItem {
  item?: unknown;
  text?: unknown;
  basis?: unknown;
  formula?: unknown;
  confidence?: unknown;
  presentation?: unknown;
}

/** checkItem / checkCase の追加の検査 */
export interface CheckOptions {
  /**
   * 数字の出どころ検査（2026-10-06 仕様反転）。出典の事実・数値の id を持たない数値＝仮置きとして落とす。
   * 取り込み時（merge-analysis.ts）だけ有効にする。公開済みの旧データを評価する経路（evaluatePublication）では付けない。
   */
  strictNumbers?: boolean;
}

const STATEMENT = /語った|述べた|発表した|公表した|明かした|によると|と話す|と語る|インタビューで/;
const WORK = /記載(が)?な|明記(され)?てい?な|確認できな|本文を読|出典に(は)?無/;
const MONEY = /[$＄¥￥€£]|USD|EUR|JPY|[0-9０-９][0-9０-９,.，]*\s*(円|万|億|千|ドル|ユーロ|%|％|パーセント)|[数何幾十百千万億]+(円|ドル|ユーロ)/;
/** 仮置き・想定の言い回し。数字と一緒に出たら、出典に無い数字を作った合図 */
const PLACEHOLDER_WORDS = /仮置|仮の|仮定|相場|業界標準|一般的に|想定|試算/;
/** 決済・販売の場が公開している標準の手数料（式の中で使ってよい数字） */
const STANDARD_FEE_NUMBERS = [2.9, 3.6, 30, 15];
const ILLEGAL_TOPIC = /自作自演|サクラ|なりすま|スパム|規約を(回避|すり抜)|botで大量/;
const ILLEGAL_IMPERATIVE = /しろ|せよ|すればよい|すれば良い|手順/;

export const analysisId = (item: string): string => `a-${item.toLowerCase()}`;

/** 決済・販売の場が公開している標準の手数料。これだけは式の中で「標準」と呼んでよい */
const PLATFORM_FEE = /Stripe|App ?Store|Google ?Play|Apple/;
const NORM_WORDS: [RegExp, string][] = [
  [/相場上の仮定|一般相場の採算仮定|一般相場の仮定|相場仮定/g, '仮定'],
  [/報酬相場の仮置き/g, '報酬の仮置き'],
  [/(一般)?相場からの仮置き/g, '仮置き'],
  [/(一般)?相場からの仮定|一般相場から仮定/g, '仮定'],
  [/相場単価/g, '仮の単価'],
  [/相場推計/g, '仮置きの推計'],
  [/相場例/g, '仮置きの例'],
  [/一般相場|相場/g, '仮の値'],
];
/**
 * 式（formula）の中で、裏付けの無い数字を「相場」「一般的な」と業界の常識のように呼ぶ言い回しを「仮定・仮置き」に揃える。
 * 公開監査（2026-10-01、20社393項目）で残った事実のふり14件のうち13件がこの型だった。決済・販売の場の標準手数料は除く。冪等。
 */
export function normalizeFormula(formula: string): string {
  const base = formula.replace(/Stripe(の)?相場/g, 'Stripe標準').replace(/数字は出典の値（根拠: [^）]*）/g, '数字は出典に載っている値');
  let out = base;
  for (const [re, to] of NORM_WORDS) out = out.replace(re, (m, ...rest) => {
    const at = rest.find((x) => typeof x === 'number') as number;
    return PLATFORM_FEE.test(base.slice(Math.max(0, at - 16), at + m.length + 4)) && !/仮定|仮置き/.test(m) ? m : to;
  });
  out = out.replace(/一般的な/g, (m, at: number) => (PLATFORM_FEE.test(out.slice(Math.max(0, at - 16), at)) ? m : ''));
  if (out !== base && !out.includes('裏付け資料なし')) out = `${out.replace(/[。\s]+$/, '')}（仮の値。裏付け資料なし）`;
  return out;
}

export function checkItem(raw: RawItem, reader: ReaderCase, seen: Set<string>, options: CheckOptions = {}): { ok: true; value: StoredAnalysis } | { ok: false; reason: DropReason } {
  const itemName = typeof raw.item === 'string' ? raw.item : '';
  const cand = {
    id: analysisId(itemName),
    item: raw.item,
    text: raw.text,
    basis: raw.basis,
    ...(typeof raw.formula === 'string' && raw.formula.trim() ? { formula: normalizeFormula(raw.formula.trim()) } : {}),
    ...(raw.confidence !== undefined ? { confidence: raw.confidence } : {}),
    ...(raw.presentation !== undefined ? { presentation: raw.presentation } : {}),
  };
  const parsed = ReaderAnalysisSchema.safeParse(cand);
  if (!parsed.success) return { ok: false, reason: 'schema' };
  const a = parsed.data;
  if (seen.has(a.item)) return { ok: false, reason: 'duplicate-item' };
  const evidence = new Set([...reader.facts.map((f) => f.id), ...reader.metrics.map((m) => m.id)]);
  if (a.basis.some((b) => !evidence.has(b))) return { ok: false, reason: 'basis-missing-id' };
  if (STATEMENT.test(a.text) && a.basis.length === 0) return { ok: false, reason: 'fabricated-statement' };
  // 根拠の無い推論は出さない（根拠の事実・数字のIDが1件も無い）
  if (a.basis.length === 0) return { ok: false, reason: 'basis-empty' };
  if (WORK.test(a.text)) return { ok: false, reason: 'work-description' };
  // 分析の指示は「式は推定（ESTIMATE）の時だけ」。事実の言い換え（FACT_SUMMARY）で、文の数字がすべて basis の事実・数値にある時は、
  // 取り込み経路（import-case-rebuild.ts）と同じく「出典に載っている値」を式欄に入れて通す。出典に無い数字は従来どおり落とす
  // presentation が無い旧形式の項目は、式があると画面で「推定」と出るため対象にしない
  if (options.strictNumbers && !a.formula && a.presentation === 'FACT_SUMMARY' && MONEY.test(a.text)) {
    const evidence = evidenceNumbers(reader.facts, reader.metrics, a.basis);
    // numbersMissingFrom は1桁の整数を数えないので、式を補う時は単位つきの1桁の数字（「月5ドル」）も出典にあることを求める
    const smallMissing = numbersIn(a.text).filter((v) => Number.isInteger(v) && v < 10 && !evidence.some((e) => sameNumber(e, v)));
    if (numbersMissingFrom(a.text, evidence).length === 0 && smallMissing.length === 0) a.formula = '数字は出典に載っている値';
  }
  if (MONEY.test(a.text) && !a.formula) return { ok: false, reason: 'number-without-formula' };
  if (options.strictNumbers) {
    const reason = numberOriginProblem(a, typeof raw.formula === 'string' ? raw.formula : '', reader);
    if (reason) return { ok: false, reason };
  }
  if (a.item === 'REVENUE_ESTIMATE' && reader.metrics.some((m) => m.measure === 'REVENUE')) return { ok: false, reason: 'contradicts-revenue' };
  // 事実がある項目は推論で上書きしない（料金・道具）
  if (a.item === 'PRICING' && (reader.facts.some((f) => f.kind === 'PRICING') || reader.metrics.some((m) => m.measure === 'PRICE'))) return { ok: false, reason: 'fact-exists' };
  if (a.item === 'TOOLS' && reader.facts.some((f) => f.kind === 'TOOL')) return { ok: false, reason: 'fact-exists' };
  if (ILLEGAL_TOPIC.test(a.text) && ILLEGAL_IMPERATIVE.test(a.text)) return { ok: false, reason: 'illegal-howto' };
  seen.add(a.item);
  return { ok: true, value: a };
}

/**
 * 数字の出どころ検査。通すのは、数字が「basis の事実・数値」か「式」か「標準手数料」に出てくる時だけ。
 * 式の中の仮置き・想定の言い回しは、数字と一緒にあれば落とす（式は正規化の前の原文で見る）。
 * 限界: 式の計算結果が正しいか、式の入力の意味が合うかは見ない（審査役が見る）。
 */
export function numberOriginProblem(a: Pick<StoredAnalysis, 'text' | 'basis' | 'formula' | 'presentation'>, rawFormula: string, reader: ReaderCase): DropReason | null {
  const formulaForCheck = rawFormula.replace(/Stripe(の)?相場/g, '');
  if ((PLACEHOLDER_WORDS.test(a.text) && numbersIn(a.text).length > 0) || (PLACEHOLDER_WORDS.test(formulaForCheck) && numbersIn(formulaForCheck).length > 0)) return 'placeholder-number';
  const cited = evidenceNumbers(reader.facts, reader.metrics, a.basis);
  const allowed = [...cited, ...STANDARD_FEE_NUMBERS, ...(a.formula ? numbersIn(a.formula, true) : [])];
  if (numbersMissingFrom(a.text, allowed).length > 0) return 'number-not-in-evidence';
  if (a.presentation === 'ESTIMATE') {
    // 推定は式が要り、式の入力の少なくとも1つが根拠の事実・数値の値であること
    if (!a.formula || a.basis.length === 0) return 'estimate-without-fact-inputs';
    const inputs = numbersIn(a.formula, true).filter((n) => !(Number.isInteger(n) && n < 10));
    if (!inputs.some((n) => cited.some((c) => Math.abs(c - n) <= Math.max(1e-9, Math.abs(c) * 1e-9)))) return 'estimate-without-fact-inputs';
  }
  return null;
}

export interface Dropped {
  entityId: string;
  item: string;
  reason: DropReason;
  text: string;
}

/** 1事例ぶんの item 一覧を検査する。重複は先勝ち。 */
export function checkCase(entityId: string, items: unknown, reader: ReaderCase, options: CheckOptions = {}): { kept: StoredAnalysis[]; dropped: Dropped[] } {
  const kept: StoredAnalysis[] = [];
  const dropped: Dropped[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(items) ? (items as RawItem[]) : []) {
    const r = checkItem(raw ?? {}, reader, seen, options);
    if (r.ok) kept.push(r.value);
    else dropped.push({ entityId, item: String(raw?.item ?? ''), reason: r.reason, text: String(raw?.text ?? '').slice(0, 120) });
  }
  return { kept, dropped };
}

/** 公開版へ入れる: basis が残った事実・数字だけを指す item を残す。指していなければその item を落とす。 */
export function reflectAnalysis(reader: ReaderCase, stored: StoredAnalysis[] | undefined): ReaderCase {
  if (!stored?.length) return { ...reader, analysis: [] };
  const evidence = new Set([...reader.facts.map((f) => f.id), ...reader.metrics.map((m) => m.id)]);
  const analysis = stored
    .filter((a) => a.basis.every((b) => evidence.has(b)))
    .map((a) => (a.formula ? { ...a, formula: normalizeFormula(a.formula) } : a));
  return { ...reader, analysis };
}

/** 画面に出す事例で必ず埋める項目（OWNER_INTENT 2章）。事実で埋まっていれば推論は要らない */
export const REQUIRED_ITEMS = ['HEADLINE', 'STORY', 'BUSINESS_MODEL', 'CUSTOMER_PAIN', 'FIRST_CUSTOMERS', 'CHANNELS', 'TAKE_HOME', 'INCUMBENT_BLINDSPOT', 'VIABILITY', 'LESSON', 'REVENUE_ESTIMATE'] as const;

/** 必須項目のうち、事実でも推論でも埋まっていないもの */
export function missingRequired(reader: ReaderCase): string[] {
  const have = new Set(reader.analysis.map((a) => a.item as string));
  const fact = (k: string) => reader.facts.some((f) => f.kind === k);
  const metric = (...ms: string[]) => reader.metrics.some((m) => ms.includes(m.measure));
  const byFact: Record<string, boolean> = {
    BUSINESS_MODEL: fact('DESCRIPTION'),
    CHANNELS: fact('CHANNEL'),
    TAKE_HOME: metric('NET_INCOME', 'PROFIT'),
    REVENUE_ESTIMATE: metric('REVENUE'),
  };
  return REQUIRED_ITEMS.filter((item) => !have.has(item) && !byFact[item]);
}

export interface AuditFinding { analysisId: string; kind: string; severity: 'BLOCK' | 'FIX' | 'LOW'; why?: string; fix?: string; fixFormula?: string }
export type AuditFile = Record<string, AuditFinding[]>;

/**
 * 公開前の監査（data/audit/out-*.json）の指摘を推論に反映する。BLOCK は外す。FIX は直した文に置き換え、
 * fixFormula があれば式も置き換える（空文字なら式を消す）。置き換えた文も checkItem を通す（通らなければ外す）。
 * LOW はそのまま。純粋関数。
 */
export function applyAudit(entityId: string, stored: StoredAnalysis[], findings: AuditFinding[] | undefined, reader: ReaderCase):
  { kept: StoredAnalysis[]; removed: { id: string; kind: string; why?: string }[]; fixed: number } {
  if (!findings?.length) return { kept: stored, removed: [], fixed: 0 };
  const byId = new Map<string, AuditFinding[]>();
  for (const f of findings) byId.set(f.analysisId, [...(byId.get(f.analysisId) ?? []), f]);
  const kept: StoredAnalysis[] = [];
  const removed: { id: string; kind: string; why?: string }[] = [];
  const seen = new Set<string>();
  let fixed = 0;
  for (const a of stored) {
    const fs = byId.get(a.id) ?? [];
    const block = fs.find((f) => f.severity === 'BLOCK');
    if (block) { removed.push({ id: a.id, kind: block.kind, why: block.why }); continue; }
    const fix = fs.find((f) => f.severity === 'FIX');
    if (!fix) { seen.add(a.item); kept.push(a); continue; }
    if (!fix.fix?.trim()) { removed.push({ id: a.id, kind: fix.kind, why: fix.why }); continue; }
    // 監査役の直した文が出典の数字を引くだけで式が無い時は、根拠の事実がある場合に限り「出典の値」と式欄に書き添える
    const text = fix.fix.trim();
    const base = fix.fixFormula === undefined ? a.formula : fix.fixFormula.trim() || undefined;
    const formula = base ?? (MONEY.test(text) && a.basis.length ? '数字は出典に載っている値' : undefined);
    const r = checkItem({ ...a, text, formula }, reader, seen);
    if (r.ok) { kept.push(r.value); fixed++; } else removed.push({ id: a.id, kind: `${fix.kind}/${r.reason}`, why: fix.why });
  }
  void entityId;
  return { kept, removed, fixed };
}

/** 素材の商用利用・公の表示を利用規約で禁じる出典（2026-09-30 確認: ebizfacts.com/about/terms） */
export const TERMS_RESTRICTED_HOSTS = ['ebizfacts.com', 'ebizfacts.beehiiv.com']; // 後者は同社のニュースレター
const restrictedHost = (u: string): boolean => {
  try { const h = new URL(u).hostname.replace(/^www\./, ''); return TERMS_RESTRICTED_HOSTS.some((r) => h === r || h.endsWith(`.${r}`)); } catch { return false; }
};
/**
 * 規約で表示を禁じる出典を1つでも引いている事例か。eBiz の数字・出来事は一次情報に付け替えるまで出さない（OWNER_INTENT 6章）。
 * 2つ目の出典があっても、それが数字を裏付けるとは限らないため、事例ごと止める。
 */
export const citesRestrictedSource = (reader: Pick<ReaderCase, 'sources'>): boolean => reader.sources.some((s) => restrictedHost(s.url));
