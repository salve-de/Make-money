/**
 * 推論（reader.analysis）の機械の確かめ。Codex が返した item を1件ずつ検査し、通ったものだけを残す。純粋関数。
 * 事実（facts/metrics）とは混ぜない。ここを通っても画面は「推測」と明記して出す。
 */
import { ReaderAnalysisSchema, type ReaderAnalysis, type ReaderCase } from '../../src/shared/reader-case';

export const ANALYSIS_FILE = 'data/reader-analysis.json';
export const ANALYZE_DIR = 'data/analyze';

export type DropReason =
  | 'schema'
  | 'basis-missing-id'
  | 'duplicate-item'
  | 'fabricated-statement'
  | 'work-description'
  | 'fact-exists'
  | 'number-without-formula'
  | 'contradicts-revenue'
  | 'illegal-howto';

/** 保存する形（id は a-<item小文字>） */
export type StoredAnalysis = Omit<ReaderAnalysis, 'id'> & { id: string };
export type AnalysisFile = Record<string, StoredAnalysis[]>;

export interface RawItem {
  item?: unknown;
  text?: unknown;
  basis?: unknown;
  formula?: unknown;
  confidence?: unknown;
}

const STATEMENT = /語った|述べた|発表した|公表した|明かした|によると|と話す|と語る|インタビューで/;
const WORK = /記載(が)?な|明記(され)?てい?な|確認できな|本文を読|出典に(は)?無/;
const MONEY = /[$＄¥￥€£]|USD|EUR|JPY|[0-9０-９][0-9０-９,.，]*\s*(円|万|億|千|ドル|ユーロ|%|％|パーセント)|[数何幾十百千万億]+(円|ドル|ユーロ)/;
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

export function checkItem(raw: RawItem, reader: ReaderCase, seen: Set<string>): { ok: true; value: StoredAnalysis } | { ok: false; reason: DropReason } {
  const itemName = typeof raw.item === 'string' ? raw.item : '';
  const cand = {
    id: analysisId(itemName),
    item: raw.item,
    text: raw.text,
    basis: raw.basis,
    ...(typeof raw.formula === 'string' && raw.formula.trim() ? { formula: normalizeFormula(raw.formula.trim()) } : {}),
    confidence: raw.confidence,
  };
  const parsed = ReaderAnalysisSchema.safeParse(cand);
  if (!parsed.success) return { ok: false, reason: 'schema' };
  const a = parsed.data;
  if (seen.has(a.item)) return { ok: false, reason: 'duplicate-item' };
  const evidence = new Set([...reader.facts.map((f) => f.id), ...reader.metrics.map((m) => m.id)]);
  if (a.basis.some((b) => !evidence.has(b))) return { ok: false, reason: 'basis-missing-id' };
  if (STATEMENT.test(a.text) && a.basis.length === 0) return { ok: false, reason: 'fabricated-statement' };
  if (WORK.test(a.text)) return { ok: false, reason: 'work-description' };
  if (MONEY.test(a.text) && !a.formula) return { ok: false, reason: 'number-without-formula' };
  if (a.item === 'REVENUE_ESTIMATE' && reader.metrics.some((m) => m.measure === 'REVENUE')) return { ok: false, reason: 'contradicts-revenue' };
  // 事実がある項目は推論で上書きしない（料金・道具）
  if (a.item === 'PRICING' && (reader.facts.some((f) => f.kind === 'PRICING') || reader.metrics.some((m) => m.measure === 'PRICE'))) return { ok: false, reason: 'fact-exists' };
  if (a.item === 'TOOLS' && reader.facts.some((f) => f.kind === 'TOOL')) return { ok: false, reason: 'fact-exists' };
  if (ILLEGAL_TOPIC.test(a.text) && ILLEGAL_IMPERATIVE.test(a.text)) return { ok: false, reason: 'illegal-howto' };
  seen.add(a.item);
  return { ok: true, value: a };
}

export interface Dropped {
  entityId: string;
  item: string;
  reason: DropReason;
  text: string;
}

/** 1事例ぶんの item 一覧を検査する。重複は先勝ち。 */
export function checkCase(entityId: string, items: unknown, reader: ReaderCase): { kept: StoredAnalysis[]; dropped: Dropped[] } {
  const kept: StoredAnalysis[] = [];
  const dropped: Dropped[] = [];
  const seen = new Set<string>();
  for (const raw of Array.isArray(items) ? (items as RawItem[]) : []) {
    const r = checkItem(raw ?? {}, reader, seen);
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

export interface AuditFinding { analysisId: string; kind: string; severity: 'BLOCK' | 'FIX' | 'LOW'; why?: string; fix?: string }
export type AuditFile = Record<string, AuditFinding[]>;

/**
 * 公開前の監査（data/audit/out-*.json）の指摘を推論に反映する。BLOCK は外す。FIX は直した文に置き換え、
 * 置き換えた文も checkItem を通す（通らなければ外す）。LOW はそのまま。純粋関数。
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
    const formula = a.formula ?? (MONEY.test(text) && a.basis.length ? '数字は出典に載っている値' : undefined);
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
