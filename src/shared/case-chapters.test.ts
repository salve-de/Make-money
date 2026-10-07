import { describe, expect, it } from 'vitest';
import chapters from '../../data/case-chapters.json';
import { caseChaptersFor } from './case-chapters';
import { stripOriginTag } from './origin-tag';

type Entry = { entityId: string; factId: string; factHash: string };

describe('case-chapters', () => {
  it('元の事実の文が変わったら、その事例の章は出さない', () => {
    const entry = (chapters as Entry[])[0];
    expect(caseChaptersFor(entry.entityId, [{ id: entry.factId, text: '別の文' }])).toEqual([]);
    expect(caseChaptersFor(entry.entityId, [])).toEqual([]);
    expect(caseChaptersFor('ent_none', [])).toEqual([]);
  });
  it('全事例が元の事実との紐付けを持つ', () => {
    for (const entry of chapters as Entry[]) {
      expect(entry.factId.length).toBeGreaterThan(0);
      expect(entry.factHash).toMatch(/^[0-9a-f]{8}$/);
    }
  });
  it('画面に出す文の文末から、出どころの印を外す（データは変えない）', () => {
    expect(stripOriginTag('受付サイトにした（本人）')).toBe('受付サイトにした');
    expect(stripOriginTag('紹介者側は無料で使える（公式）')).toBe('紹介者側は無料で使える');
    expect(stripOriginTag('透かしを入れる機能を足した（第三者）')).toBe('透かしを入れる機能を足した');
    expect(stripOriginTag('2018年に開始（本人、2018年5月）')).toBe('2018年に開始');
    expect(stripOriginTag('印のない文。')).toBe('印のない文。');
    expect(stripOriginTag('需要があると考えた（本人申告）。')).toBe('需要があると考えた。');
    expect(stripOriginTag('（公式）の画面が変わった')).toBe('（公式）の画面が変わった');
  });
  it('どの事例の章の文にも、画面に出る時は出どころの印が残らない', () => {
    for (const entry of chapters as Array<Entry & { chapters: Record<string, Array<{ text: string }>> }>) {
      for (const rows of Object.values(entry.chapters)) {
        for (const row of rows) expect(stripOriginTag(row.text)).not.toMatch(/（(?:本人|公式|第三者|記事)[^）]*）$/);
      }
    }
  });
});
