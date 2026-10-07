import { describe, expect, it } from 'vitest';
import { isAbsenceOnly, scrubAbsence, stripAbsence } from './absence-text';

describe('absence-text', () => {
  it('分からない旨だけの文を落とし、役に立つ文は残す', () => {
    expect(stripAbsence('著者は2人。外部資金は未確認。')).toBe('著者は2人。');
    expect(stripAbsence('固定の紹介料率は公開されていない。')).toBe('');
    expect(stripAbsence('費用は執筆と開発。金額は未確認')).toBe('費用は執筆と開発。');
  });
  it('全部が該当する時は空', () => {
    expect(isAbsenceOnly('開始のきっかけは、材料に書かれていない（未確認）。')).toBe(true);
    expect(isAbsenceOnly('年商3億円。')).toBe(false);
  });
  it('読者データから、分からない旨だけの事実を消す（概要の事実は触らない）', () => {
    const reader = {
      summaryFactId: 'f1',
      facts: [{ id: 'f1', text: '概要。未確認。' }, { id: 'f2', text: '費用は未確認。' }, { id: 'f3', text: '年商3億円。外部資金は不明。' }],
      analysis: [{ formula: '売上は非公開。' }, { formula: '1,000×12' }],
    };
    const out = scrubAbsence(reader);
    expect(out.facts.map((f) => f.id)).toEqual(['f1', 'f3']);
    expect(out.facts[0].text).toBe('概要。未確認。');
    expect(out.facts[1].text).toBe('年商3億円。');
    expect(out.analysis.map((a) => a.formula)).toEqual([undefined, '1,000×12']);
  });
});
