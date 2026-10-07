import { describe, expect, it } from 'vitest';
import chapters from '../../data/case-chapters.json';
import { caseChaptersFor } from './case-chapters';

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
});
