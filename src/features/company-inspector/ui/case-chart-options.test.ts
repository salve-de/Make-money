import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import type { CasePage } from '@/shared/case-page';
import { seriesFor } from '@/shared/case-page-series';
import { earningsOption, flowDepths, labelPlacement, proportionalValues, sankeyOption, shortFlowLabel, wrapText, type ChartTheme } from './case-chart-options';

const pages = JSON.parse(readFileSync('data/case-pages.json', 'utf8')) as { entityId: string; page: CasePage }[];
const pageOf = (key: string) => pages.find((p) => p.entityId.includes(key))!.page;
const theme: ChartTheme = { bg: 'bg', line: 'line', lineSoft: 'soft', strong: 'strong', fg: 'fg', sub: 'sub', label: 'label', muted: 'muted', accent: 'accent', sans: 'sans', mono: 'mono' };
const FIVE = ['codementor', 'button_shy', 'data_fetcher', 'snipcart', 'pinboard'];

describe('お金の流れの文', () => {
  it('ドルを落として円だけ、文の切れ目で行を分ける', () => {
    expect(shortFlowLabel('新作の先払い。例：134,553ドル（約2,018万円）')).toBe('新作の先払い\n例：約2,018万円');
    expect(shortFlowLabel('サーバー代。月約2,500ドル（約37.5万円）')).toBe('サーバー代\n月約37.5万円');
    expect(shortFlowLabel('月1ドル（約150円）〜20ドル（約3,000円）の会費')).toBe('月約150円〜約3,000円の会費');
  });
  it('金額の途中で折らない', () => {
    for (const line of wrapText('月の売上が約15万円に満たない店は月約3,000円', 100)) expect(line).not.toMatch(/^[0-9,万円]/);
  });
});

describe('帯の太さ', () => {
  it('5件はどれも額を比べられないので、太さは一定', () => {
    for (const key of FIVE) expect(proportionalValues(pageOf(key).flows!)).toBeNull();
  });
  it('同じ期間の合計額がそろい、入る額と出る額が合う時だけ額で太さを決める', () => {
    const flows = [
      { from: '客', to: '会社', label: '月の売上。月1万ドル（約150万円）' },
      { from: '会社', to: 'サーバー', label: 'サーバー代。月2,000ドル（約30万円）' },
      { from: '会社', to: '手残り', label: '残り。月8,000ドル（約120万円）' },
    ];
    expect(proportionalValues(flows)).toEqual([1_500_000, 300_000, 1_200_000]);
    expect(proportionalValues([...flows.slice(0, 2), { from: '会社', to: '手残り', label: '月約3,000円から' }])).toBeNull();
  });
});

describe('並びと文の置き場所', () => {
  it('払うだけの客は左端の段にそろえる（Button Shy の展示会の客）', () => {
    const d = flowDepths(pageOf('button_shy').flows!);
    expect(d.get('展示会の客')).toBe(0);
    expect(d.get('支援者')).toBe(0);
    expect(d.get('Button Shy')).toBe(2);
  });
  it('帯の上に文を載せるのは、どの端にも寄せられない時だけ', () => {
    for (const key of FIVE) expect(labelPlacement(pageOf(key).flows!)).not.toContain('edge');
  });
  it('流れの文は全部どこかの名前の下に出て、ドルの額は出ない', () => {
    for (const key of FIVE) {
      for (const width of [360, 900]) {
        const { option, height } = sankeyOption(pageOf(key).flows!, theme, width);
        const s = (option.series as Array<{ data: Array<{ label: { formatter: string } }> }>)[0];
        const text = s.data.map((n) => n.label.formatter).join('\n');
        expect(text).not.toMatch(/ドル/);
        expect(height).toBeGreaterThan(80);
      }
    }
  });
});

describe('稼ぎの推移', () => {
  it('推定の点は「推定」と書き、推定に触れる区間だけ点線', () => {
    const s = seriesFor(pageOf('data_fetcher').timeline)[0];
    const o = earningsOption(s, theme, 640) as { series: Array<{ type: string; lineStyle?: { type?: unknown }; data: unknown[] }> };
    const dashed = o.series.filter((x) => x.lineStyle?.type);
    expect(dashed).toHaveLength(1);
    const scatter = o.series.find((x) => x.type === 'scatter')!.data as Array<{ label: { formatter: string } }>;
    expect(scatter.map((d) => d.label.formatter)).toEqual(['約98万円', '約150万円', '約345万円 推定']);
  });
});
