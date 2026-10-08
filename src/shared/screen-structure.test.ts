import { describe, expect, it } from 'vitest';

import { MAKER_HEADINGS } from '../../scripts/reader-view/structure-rules.mjs';
import { caseLabels } from './display-text';
import { ANALYSIS_LABELS, FACT_SECTIONS, UI } from './ui-strings';

describe('画面の章の見出しは作る側の言葉でない', () => {
  it('見出し・列名の定数に、作る側の言葉を使わない', () => {
    const titles = [...Object.values(UI), ...Object.values(ANALYSIS_LABELS), ...FACT_SECTIONS.map((s) => s.title)];
    expect(titles.filter((t) => MAKER_HEADINGS.has(t))).toEqual([]);
  });
});

describe('caseLabels（一覧の行と詳細の見出しが同じ札を出す）', () => {
  it('事例が持つ事業の札を先頭から3つ。運営側の印は出さない', () => {
    expect(caseLabels({ tags: ['収集事例', '教材', 'デザイン', '電子書籍', '買い切り'], tagline: '' })).toEqual(['教材', 'デザイン', '電子書籍']);
    expect(caseLabels({ tags: ['収集事例'], tagline: '' })).toEqual([]);
  });
  it('札が無い時だけ、事業の説明の語尾から決まる分野を1つ。決まらなければ出さない', () => {
    expect(caseLabels({ tags: [], tagline: 'チームで使うプロジェクト管理ツール' })).toEqual(['SaaS・ツール']);
    expect(caseLabels({ tags: [], tagline: 'APIの設計・テストを提供し、利用者単位で課金する' })).toEqual([]);
  });
});
