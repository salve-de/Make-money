import { describe, expect, it } from 'vitest';

import { caseYearFrom, caseYearOf } from './case-year';

const tl = (...rows: Array<[string, string]>) => rows.map(([when, what]) => ({ when, what }));

describe('caseYearFrom（事業が作られた年）', () => {
  it('記録の創業年があればそれを使う', () => {
    expect(caseYearFrom(2011, tl(['2011年7月', 'Hacker News に投稿して始める。']))).toBe(2011);
    expect(caseYearFrom(2013, tl(['2011年6月', '前身を創業。'], ['2013年3月', 'クラウド電話へ転換。']))).toBe(2013);
  });
  it('記録の年が時間順の流れの確かな出来事より後なら、記録の誤りとして使わない', () => {
    expect(caseYearFrom(2025, tl(['2022年', '創業（推測）。'], ['2023年12月29日', 'Product Hunt に登録。'], ['2025年8月', '別のツールを出す。']))).toBeNull();
  });
  it('記録が無い時は、最初の出来事が創業・公開を指す時だけ、その年を使う', () => {
    expect(caseYearFrom(0, tl(['2009年7月', '公開。']))).toBe(2009);
    expect(caseYearFrom(null, tl(['2021年11月', '作った物を X で公開し始める。']))).toBe(2021);
    expect(caseYearFrom(0, tl(['2019年11月', '売り切れた旧作の復刻キャンペーンを開いた。']))).toBeNull();
    expect(caseYearFrom(0, tl(['初年度の5月', '39ドルの講座を始める。']))).toBeNull();
  });
  it('推測・推定の印がある行は年にしない', () => {
    expect(caseYearFrom(0, tl(['2022年', '創業（推測）。']))).toBeNull();
    expect(caseYearFrom(0, tl(['2019年（推測）', 'サービスを始める。']))).toBeNull();
  });
  it('caseYearOf は公開版の display.year を先に使い、無ければ章ごとの文から決める', () => {
    expect(caseYearOf({ reader: { display: { year: 2014 } } })).toBe(2014);
    expect(caseYearOf({})).toBeNull();
  });
});
