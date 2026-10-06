import { describe, expect, it } from 'vitest';

import { baremetrics, block } from '@/shared/__fixtures__/reader-samples';
import { barRatio, displayFactKind, keyMetrics, splitStory } from './reader-display-model';

describe('displayFactKind（種類と本文の食い違い）', () => {
  it('「調達」なのに仕入先の管理の説明なら、その他に置く', () => {
    expect(displayFactKind({ kind: 'FUNDING', text: '仕入先ごとに納期と品質を管理している。' })).toBe('OTHER');
  });
  it('資金調達の説明は調達のまま', () => {
    expect(displayFactKind({ kind: 'FUNDING', text: '2021年にベンチャーキャピタルから2億円を調達した。' })).toBe('FUNDING');
  });
  it('「売却」なのに売却の話でなければ、その他に置く', () => {
    expect(displayFactKind({ kind: 'EXIT', text: '従業員は全員リモートで働く。' })).toBe('OTHER');
    expect(displayFactKind({ kind: 'EXIT', text: '2023年に別の会社へ売却された。' })).toBe('EXIT');
  });
  it('「料金」なのに金額も料金の語も無ければ、その他に置く', () => {
    expect(displayFactKind({ kind: 'PRICING', text: '導入は数分で終わる。' })).toBe('OTHER');
    expect(displayFactKind({ kind: 'PRICING', text: '月額2,980円のプランがある。' })).toBe('PRICING');
  });
  it('ほかの種類はそのまま', () => {
    expect(displayFactKind({ kind: 'TEAM', text: '創業者1人で運営している。' })).toBe('TEAM');
  });
});

describe('splitStory', () => {
  it('4段に分ける', () => {
    const s = splitStory('前夜：A。隙：B。突破：C。金が回る仕組み：D。');
    expect(s.map((x) => x.stage)).toEqual(['前夜', '隙', '突破', '金が回る仕組み']);
    expect(s.map((x) => x.text)).toEqual(['A。', 'B。', 'C。', 'D。']);
  });
  it('段が見つからなければ空', () => {
    expect(splitStory('ただの文章。')).toEqual([]);
    expect(splitStory('前夜：1つだけ。')).toEqual([]);
  });
});

describe('keyMetrics / barRatio', () => {
  it('帯は最大3件で重複しない', () => {
    const m = keyMetrics(block);
    expect(m.length).toBeLessThanOrEqual(3);
    expect(new Set(m.map((x) => x.id)).size).toBe(m.length);
  });
  it('指標が1件なら棒は100%（1点でも数値と食い違わない）', () => {
    expect(barRatio(baremetrics.metrics[0], baremetrics.metrics)).toBe(1);
  });
  it('金額0だけなら棒は0', () => {
    const zero = { ...baremetrics.metrics[0], amount: 0 };
    expect(barRatio(zero, [zero])).toBe(0);
  });
});
