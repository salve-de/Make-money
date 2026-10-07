import { describe, expect, it } from 'vitest';
import { isAbsenceOnly, stripAbsence } from './absence-text';

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
});
