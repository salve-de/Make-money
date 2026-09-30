/**
 * 画面に出してよいものだけを持つ型（ReaderCase）。2026-09-30、12回目の監査の後に導入。
 *
 * 画面の文字は次の3つからだけ作る:
 *   1. facts[].text（出典つきの事実の文）、analysis（必ず推測の印を付ける推論）
 *   2. metrics と sources を画面のコードが書式化した文字（文言はコードが持つ）
 *   3. src/shared/ui-strings.ts の定数
 * 作業メモ・判定規則・再監査の記録は、この型に欄が無いので画面に届かない。
 * 公開版を作る時（scripts/prepare-catalog-release.ts）に entity.reader へ入れる。
 */
import { z } from 'zod';

export const SOURCE_KINDS = ['OFFICIAL', 'FILING', 'LISTING', 'ARTICLE', 'SELF_REPORTED', 'THIRD_PARTY', 'ARCHIVE'] as const;
export const FACT_KINDS = ['DESCRIPTION', 'PRICING', 'FOUNDING', 'TEAM', 'CHANNEL', 'TOOL', 'EVENT', 'EXIT', 'FUNDING', 'OTHER'] as const;
export const ATTRIBUTIONS = ['OFFICIAL', 'FILING', 'SELF_REPORTED', 'ARTICLE', 'THIRD_PARTY', 'LISTING'] as const;
export const MEASURES = [
  'REVENUE',
  'OPERATING_INCOME',
  'NET_INCOME',
  'PROFIT',
  'PRICE',
  'EXIT_VALUE',
  'FUNDING',
  'VALUATION',
  'USERS',
  'COST',
  'OTHER',
] as const;
export const PERIOD_KINDS = ['MONTH', 'FISCAL_YEAR', 'QUARTER', 'YEAR', 'CUMULATIVE', 'TRAILING_DAYS', 'POINT'] as const;
export const ORIGINS = ['FILED', 'SELF_REPORTED', 'ARTICLE', 'THIRD_PARTY', 'ESTIMATED'] as const;
export const UNKNOWN_ITEMS = ['REVENUE', 'PROFIT', 'COST', 'TEAM', 'CHANNEL', 'TOOLS', 'PRICING', 'FOUNDED', 'STATUS'] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/);

/** 文に入れてはいけないもの: URL、出典の括弧、確認日の注記。出典は sourceId で結ぶ。 */
const factText = z
  .string()
  .min(1)
  .max(400)
  .refine((t) => !/https?:\/\//.test(t), 'URL は文に入れない（sourceId で結ぶ）')
  .refine((t) => !/[（(]\s*出典\s*[:：]/.test(t), '出典の括弧は文に入れない')
  .refine((t) => !/\d{4}-\d{2}-\d{2}\s*(?:確認|取得)/.test(t), '確認日・取得日の注記は文に入れない');

export const ReaderSourceSchema = z.object({
  id: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url(),
  title: z.string().min(1).optional(),
  publishedAt: isoDate.optional(),
  checkedAt: isoDate.optional(),
  kind: z.enum(SOURCE_KINDS),
});

export const ReaderFactSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(FACT_KINDS),
  text: factText,
  sourceId: z.string().min(1),
  statedAt: isoDate.optional(),
  attribution: z.enum(ATTRIBUTIONS),
});

export const ReaderMetricSchema = z.object({
  id: z.string().min(1),
  measure: z.enum(MEASURES),
  periodKind: z.enum(PERIOD_KINDS),
  /** 原文どおりの期間（例: "FY2025"、"2026-05"、"2025-07-01〜2026-06-30"、"昨年"）。相対の日付を絶対の年に直さない。 */
  period: z.string().min(1),
  amount: z.number(),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
  /** measure=USERS などの数量の単位（例: "人"、"社"）。金額なら currency を使う。 */
  unit: z.string().min(1).optional(),
  origin: z.enum(ORIGINS),
  /** 基準の注記（例: "継続事業ベース"、"非支配持分を含む"）。同じ事例で基準が混ざる時は必須。 */
  basis: z.string().min(1).optional(),
  /** measure=OTHER の時の中身の名前（例: "有料会員数"）。 */
  label: z.string().min(1).optional(),
  sourceId: z.string().min(1),
  statedAt: isoDate.optional(),
});

export const ANALYSIS_ITEMS = [
  'HEADLINE',
  /** 4段の物語（前夜→隙→突破→金が回る仕組み）。Universal Foundation の MAKE_MONEY_RESEARCH_REQUIREMENTS §5 */
  'STORY',
  'BUSINESS_MODEL',
  /** 料金の事実が無い時の推定（何にいくら、いつ払わせるか） */
  'PRICING',
  'CUSTOMER',
  'CUSTOMER_PAIN',
  'FIRST_CUSTOMERS',
  'CHANNELS',
  'REVENUE_ESTIMATE',
  'COST_STRUCTURE',
  'TAKE_HOME',
  'CAPITAL_AND_TEAM',
  /** 道具・技術の事実が無い時の推定構成 */
  'TOOLS',
  'DEPENDENCIES',
  'LOCK_IN',
  /** 前金（年払い・買い切り・予約金）で客の金が先に入る構造 */
  'UPFRONT_CASH',
  /** 紹介報酬・代理店・提携の配管 */
  'REFERRAL',
  'INCUMBENT_BLINDSPOT',
  'COMPETITION',
  /** 創業・初動・観測の時期と、いま営業中かの推定（事実が無い時だけ） */
  'TIMELINE',
  'WHY_IT_WORKED',
  'VIABILITY',
  /** 当たる前に死んだ製品・ピボットと、何を変えて当たったか */
  'PIVOTS',
  'FAILURE_CAUSE',
  'LESSON',
] as const;

/** アナリストの推論。事実（facts/metrics）とは別の欄で、画面は必ず「推測」と明記して出す。 */
export const ReaderAnalysisSchema = z.object({
  id: z.string().min(1),
  item: z.enum(ANALYSIS_ITEMS),
  text: factText,
  /** 推論が拠って立つ facts / metrics の id。一般的な相場だけの推論は空で、confidence は LOW。 */
  basis: z.array(z.string().min(1)),
  /** 数字を出す時の式と前提 */
  formula: z.string().min(1).max(400).optional(),
  confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

export const ReaderCaseSchema = z
  .object({
    sources: z.array(ReaderSourceSchema),
    facts: z.array(ReaderFactSchema),
    metrics: z.array(ReaderMetricSchema),
    unknowns: z.array(z.enum(UNKNOWN_ITEMS)),
    /** 概要は DESCRIPTION の事実を指すだけ。自由文の概要は持たない。 */
    summaryFactId: z.string().min(1).optional(),
    analysis: z.array(ReaderAnalysisSchema).default([]),
  })
  .superRefine((c, ctx) => {
    const sourceIds = new Set(c.sources.map((s) => s.id));
    for (const f of c.facts) {
      if (!sourceIds.has(f.sourceId)) ctx.addIssue({ code: 'custom', message: `fact ${f.id}: 出典 ${f.sourceId} が無い` });
    }
    for (const m of c.metrics) {
      if (!sourceIds.has(m.sourceId)) ctx.addIssue({ code: 'custom', message: `metric ${m.id}: 出典 ${m.sourceId} が無い` });
      if (m.measure === 'OTHER' && !m.label) ctx.addIssue({ code: 'custom', message: `metric ${m.id}: OTHER には label が要る` });
    }
    if (c.summaryFactId) {
      const f = c.facts.find((x) => x.id === c.summaryFactId);
      if (!f || f.kind !== 'DESCRIPTION') {
        ctx.addIssue({ code: 'custom', message: 'summaryFactId は DESCRIPTION の事実を指す' });
      }
    }
    const factIds = c.facts.map((f) => f.id);
    if (new Set(factIds).size !== factIds.length) ctx.addIssue({ code: 'custom', message: 'fact の id が重複' });
    const evidenceIds = new Set([...factIds, ...c.metrics.map((m) => m.id)]);
    const seenItems = new Set<string>();
    for (const a of c.analysis) {
      for (const b of a.basis) {
        if (!evidenceIds.has(b)) ctx.addIssue({ code: 'custom', message: `analysis ${a.id}: basis ${b} が facts/metrics に無い` });
      }
      if (seenItems.has(a.item)) ctx.addIssue({ code: 'custom', message: `analysis: item ${a.item} が重複` });
      seenItems.add(a.item);
    }
  });

export type ReaderSource = z.infer<typeof ReaderSourceSchema>;
export type ReaderFact = z.infer<typeof ReaderFactSchema>;
export type ReaderMetric = z.infer<typeof ReaderMetricSchema>;
export type ReaderAnalysis = z.infer<typeof ReaderAnalysisSchema>;
export type AnalysisItem = (typeof ANALYSIS_ITEMS)[number];
export type ReaderCase = z.infer<typeof ReaderCaseSchema>;
export type Measure = (typeof MEASURES)[number];
export type MetricOrigin = (typeof ORIGINS)[number];
export type UnknownItem = (typeof UNKNOWN_ITEMS)[number];
