/**
 * 仮の見本（テスト用の作り物）。作業者Aの data/fixtures/reader-case.sample.json ができたらそちらに合わせる。
 * 金額・日付は実在の事例の値ではない。
 */
import { ReaderCaseSchema, type ReaderCase } from '@/shared/reader-case';

const src = (id: string, publisher: string, url: string, extra: object = {}) => ({ id, publisher, url, kind: 'OFFICIAL' as const, ...extra });

export const baremetrics: ReaderCase = ReaderCaseSchema.parse({
  sources: [
    src('s1', '公式ブログ', 'https://example.com/exit', { title: '売却のお知らせ', publishedAt: '2023-05-01' }),
    src('s1dup', '公式ブログ', 'https://example.com/exit/'),
  ],
  facts: [
    { id: 'f1', kind: 'DESCRIPTION', text: 'サブスク課金の指標を見せる分析ツール。導入は数分で終わる。', sourceId: 's1', attribution: 'OFFICIAL' },
    { id: 'f2', kind: 'EXIT', text: '2023年に別の会社へ売却された。', sourceId: 's1', attribution: 'OFFICIAL' },
  ],
  metrics: [
    { id: 'm1', measure: 'EXIT_VALUE', periodKind: 'POINT', period: '2023', amount: 4_000_000, currency: 'USD', origin: 'ARTICLE', sourceId: 's1' },
  ],
  unknowns: ['REVENUE', 'PROFIT'],
  summaryFactId: 'f1',
});

export const block: ReaderCase = ReaderCaseSchema.parse({
  sources: [src('s1', 'SEC 10-K', 'https://example.com/10k', { kind: 'FILING', title: 'Form 10-K', publishedAt: '2026-02-20' })],
  facts: [
    { id: 'f1', kind: 'DESCRIPTION', text: '決済端末と送金アプリを提供する会社。', sourceId: 's1', attribution: 'FILING' },
    { id: 'f2', kind: 'FOUNDING', text: '2009年に創業した。', sourceId: 's1', attribution: 'FILING' },
  ],
  metrics: [
    { id: 'm1', measure: 'REVENUE', periodKind: 'FISCAL_YEAR', period: 'FY2025', amount: 24_000_000_000, currency: 'USD', origin: 'FILED', basis: '継続事業ベース', sourceId: 's1' },
    { id: 'm2', measure: 'REVENUE', periodKind: 'MONTH', period: '2026-05', amount: 100, currency: 'USD', origin: 'ARTICLE', sourceId: 's1' },
  ],
  unknowns: [],
  summaryFactId: 'f1',
});

export const hannahMorgan: ReaderCase = ReaderCaseSchema.parse({
  sources: [src('s1', '本人の投稿', 'https://example.com/post', { kind: 'SELF_REPORTED' })],
  facts: [{ id: 'f1', kind: 'DESCRIPTION', text: '個人で運営する求人向けの発信。', sourceId: 's1', attribution: 'SELF_REPORTED' }],
  metrics: [
    { id: 'm1', measure: 'REVENUE', periodKind: 'YEAR', period: '昨年', amount: 3_000_000, currency: 'JPY', origin: 'SELF_REPORTED', sourceId: 's1' },
  ],
  unknowns: ['TEAM'],
  summaryFactId: 'f1',
});

export const emptyReader: ReaderCase = ReaderCaseSchema.parse({ sources: [], facts: [], metrics: [], unknowns: [] });
