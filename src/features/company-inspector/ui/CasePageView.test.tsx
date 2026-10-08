import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { baremetrics } from '@/shared/__fixtures__/reader-samples';
import type { CasePage } from '@/shared/case-page';
import type { ReaderCase } from '@/shared/reader-case';
import { ReaderLedger } from './ReaderDetail';

const page: CasePage = {
  listLine: '駄菓子の定期便で累計1.5億円',
  overview: '会社は2011年に始めた。累計の売上は100万ドル（約1.5億円）を超えた。',
  secrets: [{ head: '珍しさを見抜いた', body: '海外では珍しい。' }],
  did: ['掲示板に投稿した。'],
  setbacks: ['会員が4割減った。'],
  pricing: ['月12.95ドル（約1,900円）から。'],
  timeline: [{ when: '2011年7月', what: '始める。' }],
  sources: [{ no: 1, label: '公式サイト（料金）', url: 'https://example.com/' }],
  notes: ['円は1ドル＝150円の目安。', '未確認：照合はまだ。'],
};

describe('章ごとの文（case-page）の詳細画面', () => {
  const html = renderToStaticMarkup(<ReaderLedger reader={{ ...baremetrics, display: { casePage: page } } as ReaderCase} />);
  it('決めた順の章だけを出す', () => {
    const order = ['概要', '成功の秘訣', '実際にやったこと', 'つまずきと立て直し', '料金', '時間順の流れ', '数字と出典'].map((t) => html.indexOf(`>${t}<`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('古い章（誰に売っているか・金はどう回っているか・数値の表）は出さない', () => {
    for (const old of ['誰に売っているか', '金はどう回っているか', 'なぜ他に取られないか', '出典を見る', '数値の内訳']) expect(html).not.toContain(old);
  });
  it('出典は番号つきのリンク、末尾の注記も出す', () => {
    expect(html).toContain('href="https://example.com/"');
    expect(html).toContain('公式サイト（料金）');
    expect(html).toContain('円は1ドル＝150円の目安。');
    expect(html).toContain('未確認：照合はまだ。');
  });
  it('casePage が無い事例は今のまま', () => {
    const old = renderToStaticMarkup(<ReaderLedger reader={baremetrics} />);
    expect(old).not.toContain('数字と出典');
  });
});
