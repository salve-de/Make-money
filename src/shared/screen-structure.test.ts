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
  it('タグの言葉だけを出す。運営側の印や自由な言葉は出さない', () => {
    const tags = { field: '教育・学び', form: '講座・教材', buyer: '個人向け', features: [] };
    expect(caseLabels({ reader: { display: { tags } } })).toEqual(['教育・学び', '講座・教材', '個人向け']);
    expect(caseLabels({ reader: { display: {} } })).toEqual([]);
  });
});
