import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { CasePage } from './case-page';
import { kindOf, parseWhen, parseYenAmount, seriesFor } from './case-page-series';

const pages = JSON.parse(readFileSync('data/case-pages.json', 'utf8')) as { entityId: string; page: CasePage }[];
const seriesOf = (key: string) => {
  const hit = pages.find((p) => p.entityId.includes(key));
  if (!hit) throw new Error(`事例が無い: ${key}`);
  return seriesFor(hit.page.timeline);
};

describe('円の額と日付の取り出し', () => {
  it('万・億・円と小数、カンマを読む', () => {
    expect(parseYenAmount('売上17.8万ドル（約2,700万円）')).toBe(27_000_000);
    expect(parseYenAmount('100万ドル（約1.5億円）')).toBe(150_000_000);
    expect(parseYenAmount('31ドル（約4,650円）')).toBe(4650);
  });
  it('円の額が範囲や無い時は読まない', () => {
    expect(parseYenAmount('年40〜150ドル（約6,000〜2.3万円）')).toBeNull();
    expect(parseYenAmount('登録者約1,200人')).toBeNull();
  });
  it('年と月を読む', () => {
    expect(parseWhen('2020年6月')).toEqual({ x: 2020 + 5 / 12, hasMonth: true });
    expect(parseWhen('2011年')).toEqual({ x: 2011, hasMonth: false });
    expect(parseWhen('2026年4〜5月')?.x).toBeCloseTo(2026 + 3 / 12);
    expect(parseWhen('その後')).toBeNull();
  });
  it('種類を決める', () => {
    expect(kindOf('2011年', '売上17.8万ドル（約2,700万円）。')).toBe('annual');
    expect(kindOf('2016年12月', '有料22人、月の売上330ドル（約5万円）。')).toBe('monthly');
    expect(kindOf('2018年', '累計の売上が100万ドル（約1.5億円）超。')).toBe('cumulative');
    expect(kindOf('2024年', '営業利益は推定で年22.8万ドル（約3,400万円）。')).toBe('profit');
    expect(kindOf('2019年7月', '約50人に試験版。')).toBeNull();
  });
});

describe('5件の稼ぎの推移', () => {
  it('Pinboard: 年の売上が2点（2011・2017）、利益は1点なので出さない', () => {
    const s = seriesOf('pinboard');
    expect(s.map((x) => x.kind)).toEqual(['annual']);
    expect(s[0].points.map((p) => [p.x, p.yen])).toEqual([[2011, 27_000_000], [2017, 39_000_000]]);
  });
  it('Lunch Money: 年の定期売上が2点（525万→1,500万円）', () => {
    const s = seriesOf('lunch_money');
    expect(s.map((x) => x.kind)).toEqual(['annual']);
    expect(s[0].points.map((p) => p.yen)).toEqual([5_250_000, 15_000_000]);
  });
  it('Button Shy: 1回の募集額が4点（棒）', () => {
    const s = seriesOf('button_shy');
    expect(s.map((x) => [x.kind, x.shape])).toEqual([['campaign', 'bar']]);
    expect(s[0].points.map((p) => p.yen)).toEqual([7_560_000, 20_180_000, 17_850_000, 13_030_000]);
  });
  it('Geocodio: 月の売上も累計も1点だけなので図は出ない', () => {
    expect(seriesOf('geocodio')).toEqual([]);
  });
  it('StatusGator: 月の売上が5点、年間の継続収入は1点なので月の売上だけ', () => {
    const s = seriesOf('statusgator');
    expect(s.map((x) => x.kind)).toEqual(['monthly']);
    expect(s[0].points.map((p) => p.yen)).toEqual([50_000, 165_000, 330_000, 1_050_000, 3_750_000]);
  });
});
