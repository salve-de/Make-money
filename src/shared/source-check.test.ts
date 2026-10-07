import { describe, expect, it } from 'vitest';
import { checkMetric, checkText, claimNumbers, sourceNumbers } from './source-check';
import { metricProblems, metricWhen } from './fact-integrity';
import { pickListMetric } from './display-text';
import type { ReaderCase } from './reader-case';

const body = (s: string) => `${s} ${'filler text '.repeat(30)}`;

describe('原文照合', () => {
  it('英語の単位と日本語の万を同じ値として読む', () => {
    expect(sourceNumbers('grossing over $1.35M and 70K a month')).toEqual(expect.arrayContaining([1350000, 70000]));
    expect(sourceNumbers('$5 to 10 million')).toEqual(expect.arrayContaining([5000000, 10000000]));
    expect(sourceNumbers('1億1,800万')).toContain(118000000);
  });

  it('円換算と日付は照らす数に入れない', () => {
    expect(claimNumbers('2019年4月: 月収益470ドル（約7.1万円）').numbers).toEqual([470]);
    expect(claimNumbers('月9ドル（約750〜1,500円）').numbers).toEqual([]);
  });

  it('売上と呼べない数字（直接の支払い）に売上を付けると落ちる', () => {
    const m = { id: 'm3', measure: 'REVENUE', periodKind: 'YEAR', period: '2016年', amount: 5472, sourceId: 's3' };
    const r = checkMetric(m, 'I collected 489 payments totaling $5472', body('In 2016 I collected 489 payments totaling $5472'));
    expect(r.reasons).toContain('KIND_MISMATCH');
  });

  it('原文に無い価格の行は落ちる', () => {
    const r = checkText('2024年11月: 月175／350ドル（約2.6万／5.3万円）', body('Pricing 2024 Operator $250 per month'));
    expect(r.reasons).toContain('NUMBER_NOT_IN_SOURCE');
  });

  it('原文に無い年の行は落ちる', () => {
    const r = checkText('黒字化は2023年第2四半期。販売開始から217日で黒字', body('ramen profitable 217 days after launch in 2022'));
    expect(r.reasons).toContain('YEAR_NOT_IN_SOURCE');
  });

  it('時点の無い数字は落ちる', () => {
    const m = { id: 'm2', measure: 'REVENUE', periodKind: 'CUMULATIVE', period: '累計（記事に期間の明記なし）', amount: 1350000, sourceId: 's1' };
    expect(checkMetric(m, 'grossing over $1.35M', body('Refactoring UI ended up grossing over $1.35M')).reasons).toContain('WHEN_NOT_CONFIRMED');
  });

  it('原文どおりの行は通る', () => {
    expect(checkText('2019年4月: 月収益470ドル（約7.1万円）', body('April 2019 revenue was $470')).ok).toBe(true);
  });
});

describe('数字の約束', () => {
  it('時点は statedAt、無ければ period の終わりの日付', () => {
    expect(metricWhen({ period: '2018年12月〜2019年1月' })).toBe('2019-01');
    expect(metricWhen({ period: '累計' })).toBeNull();
  });

  it('同じ時点で食い違う調達額は、basis が無ければ問題にする', () => {
    const base = { measure: 'FUNDING', period: '2016-12', currency: 'USD', sourceId: 's1' };
    const reader = { sources: [{ id: 's1', url: 'https://example.com', publishedAt: '2016-12' }], metrics: [{ ...base, id: 'm1', periodKind: 'POINT', amount: 1600000 }, { ...base, id: 'm2', periodKind: 'CUMULATIVE', amount: 1200000 }] };
    expect(metricProblems(reader, undefined).some((p) => p.includes('食い違う'))).toBe(true);
    const withBasis = { ...reader, metrics: reader.metrics.map((m, i) => ({ ...m, basis: i ? 'それ以前の合計' : 'このラウンド' })) };
    expect(metricProblems(withBasis, undefined).some((p) => p.includes('食い違う'))).toBe(false);
  });

  it('一覧の数字は時点の新しい方を選ぶ（文字の並びで選ばない）', () => {
    const m = (id: string, period: string, amount: number) => ({ id, measure: 'REVENUE' as const, periodKind: 'CUMULATIVE' as const, period, amount, currency: 'USD', origin: 'SELF_REPORTED' as const, sourceId: 's1' });
    const reader = { sources: [], facts: [], unknowns: [], analysis: [], metrics: [m('a', '累計（記事に期間の明記なし）', 1350000), m('b', '2022年9月13日の投稿時点の累計', 2500000)] } as unknown as ReaderCase;
    expect(pickListMetric(reader)?.id).toBe('b');
  });
});
