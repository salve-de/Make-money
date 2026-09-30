import { describe, expect, it } from 'vitest';
import { ReaderCaseSchema, type ReaderCase } from '@/shared/reader-case';
import { checkCase, reflectAnalysis, type StoredAnalysis } from '../../../scripts/reader-case/analysis-lib';

const base = (): ReaderCase => ({
  sources: [{ id: 's1', publisher: 'A', url: 'https://a.example/', kind: 'ARTICLE' }],
  facts: [
    { id: 'f1', kind: 'DESCRIPTION', text: 'テンプレートを売る事業。', sourceId: 's1', attribution: 'ARTICLE' },
    { id: 'f2', kind: 'CHANNEL', text: '集客は検索が中心。', sourceId: 's1', attribution: 'ARTICLE' },
  ],
  metrics: [{ id: 'm1', measure: 'PRICE', periodKind: 'MONTH', period: '月', amount: 15, currency: 'USD', origin: 'ARTICLE', sourceId: 's1' }],
  unknowns: [],
  analysis: [],
  summaryFactId: 'f1',
});
const item = (extra: Record<string, unknown> = {}) => ({ item: 'CUSTOMER', text: '個人で店を持つ小規模事業者が客と見られる。', basis: ['f1'], confidence: 'MEDIUM', ...extra });

describe('ReaderCaseSchema.analysis', () => {
  const a = (item: string, basis: string[]) => ({ id: `a-${item.toLowerCase()}`, item, text: '推論の文。', basis, confidence: 'LOW' });
  it('analysis 無しは空配列になる', () => {
    const rest: Record<string, unknown> = { ...base() };
    delete rest.analysis;
    const r = ReaderCaseSchema.safeParse(rest);
    expect(r.success && r.data.analysis).toEqual([]);
  });
  it('basis が facts/metrics に無い id なら失敗', () => {
    expect(ReaderCaseSchema.safeParse({ ...base(), analysis: [a('CUSTOMER', ['f9'])] }).success).toBe(false);
    expect(ReaderCaseSchema.safeParse({ ...base(), analysis: [a('CUSTOMER', ['f1', 'm1'])] }).success).toBe(true);
  });
  it('item の重複で失敗', () => {
    expect(ReaderCaseSchema.safeParse({ ...base(), analysis: [a('CUSTOMER', []), { ...a('CUSTOMER', []), id: 'a-x' }] }).success).toBe(false);
  });
});

describe('merge-analysis の落とし条件', () => {
  const run = (items: unknown[], r = base()) => checkCase('e1', items, r);
  it('通常の推論は残る', () => {
    expect(run([item()]).kept).toHaveLength(1);
    expect(run([item()]).kept[0]!.id).toBe('a-customer');
  });
  it('スキーマ違反・basis の不在 id・item の重複（先勝ち）', () => {
    expect(run([item({ item: 'NOPE' })]).dropped[0]!.reason).toBe('schema');
    expect(run([item({ basis: ['f9'] })]).dropped[0]!.reason).toBe('basis-missing-id');
    const r = run([item({ text: '一つ目の推論。' }), item({ text: '二つ目の推論。' })]);
    expect(r.kept.map((k) => k.text)).toEqual(['一つ目の推論。']);
    expect(r.dropped[0]!.reason).toBe('duplicate-item');
  });
  it('発言の捏造の形: 「語った」等で basis が空なら落とす', () => {
    expect(run([item({ text: '創業者は最初の客は知人だったと語った。', basis: [], confidence: 'LOW' })]).dropped[0]!.reason).toBe('fabricated-statement');
    expect(run([item({ text: '創業者は最初の客は知人だったと語った。' })]).kept).toHaveLength(1);
  });
  it('作業の説明は落とす', () => {
    expect(run([item({ text: '客層は本文に記載がないが個人と見られる。' })]).dropped[0]!.reason).toBe('work-description');
    expect(run([item({ text: '出典には無いが小規模と見られる。' })]).dropped[0]!.reason).toBe('work-description');
  });
  it('金額・%があるのに formula が無ければ落とす。あれば残る', () => {
    expect(run([item({ item: 'COST_STRUCTURE', text: '決済手数料が売上の約3%かかると見られる。' })]).dropped[0]!.reason).toBe('number-without-formula');
    expect(run([item({ item: 'COST_STRUCTURE', text: '決済手数料が売上の約3%かかると見られる。', formula: 'Stripe 2.9% + 30セント' })]).kept).toHaveLength(1);
  });
  it('売上の事実があるのに REVENUE_ESTIMATE が出たら落とす', () => {
    const r = base();
    r.metrics.push({ id: 'm2', measure: 'REVENUE', periodKind: 'YEAR', period: '2025', amount: 100, currency: 'USD', origin: 'ARTICLE', sourceId: 's1' });
    const res = checkCase('e1', [item({ item: 'REVENUE_ESTIMATE', text: '売上は年に数千万円規模と見られる。', formula: '月額15ドル × 客数' })], r);
    expect(res.dropped[0]!.reason).toBe('contradicts-revenue');
    expect(run([item({ item: 'REVENUE_ESTIMATE', text: '売上は年に数千万円規模と見られる。', formula: '月額15ドル × 客数' })]).kept).toHaveLength(1);
  });
  it('違法指南の形は落とす', () => {
    expect(run([item({ text: 'サクラの口コミを投稿すればよい。' })]).dropped[0]!.reason).toBe('illegal-howto');
    expect(run([item({ text: '創業者は初期にサクラの口コミを使ったとされる。' })]).kept).toHaveLength(1);
  });
});

describe('prepare-catalog-release への反映（reflectAnalysis）', () => {
  const stored = (item: string, basis: string[]): StoredAnalysis => ({ id: `a-${item.toLowerCase()}`, item: item as StoredAnalysis['item'], text: '推論の文。', basis, confidence: 'LOW' });
  it('残った事実を指す item は入り、落ちた事実を指す item は消える', () => {
    const r = base();
    r.facts = r.facts.filter((f) => f.id !== 'f2'); // f2 は照合で落ちた
    const out = reflectAnalysis(r, [stored('CUSTOMER', ['f1']), stored('CHANNELS', ['f2']), stored('LESSON', [])]);
    expect(out.analysis.map((a) => a.item)).toEqual(['CUSTOMER', 'LESSON']);
    expect(ReaderCaseSchema.safeParse(out).success).toBe(true);
  });
  it('reader-analysis.json に無い事例は空配列', () => {
    expect(reflectAnalysis(base(), undefined).analysis).toEqual([]);
  });
});
