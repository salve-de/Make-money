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
const MONEY = /[$＄¥￥€£]|円|万|億|USD|EUR|JPY|ドル|ユーロ|%|％|パーセント/;
const ILLEGAL_TOPIC = /自作自演|サクラ|なりすま|スパム|規約を(回避|すり抜)|botで大量/;
const ILLEGAL_IMPERATIVE = /しろ|せよ|すればよい|すれば良い|手順/;

export const analysisId = (item: string): string => `a-${item.toLowerCase()}`;

export function checkItem(raw: RawItem, reader: ReaderCase, seen: Set<string>): { ok: true; value: StoredAnalysis } | { ok: false; reason: DropReason } {
  const itemName = typeof raw.item === 'string' ? raw.item : '';
  const cand = {
    id: analysisId(itemName),
    item: raw.item,
    text: raw.text,
    basis: raw.basis,
    ...(typeof raw.formula === 'string' && raw.formula.trim() ? { formula: raw.formula.trim() } : {}),
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
  const analysis = stored.filter((a) => a.basis.every((b) => evidence.has(b)));
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
