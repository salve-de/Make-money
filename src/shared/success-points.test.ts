import { describe, expect, it } from 'vitest';
import points from '../../data/success-points.json';
import { isAbsenceOnly } from './absence-text';
import { successPointsFor } from './success-points';
import { textFingerprint } from './list-lines';

describe('success-points', () => {
  it('根拠の事実の文が変わったら、その1組は出さない', () => {
    const entry = (points as Array<{ entityId: string; points: Array<{ factId: string; factHash: string; head: string }> }>)[0];
    const first = entry.points[0];
    expect(successPointsFor(entry.entityId, [{ id: first.factId, text: '別の文' }])).toEqual([]);
    expect(successPointsFor('ent_none', [])).toEqual([]);
  });
  it('見出しは1行、根拠の文があり、「分からない」だけの文は無い', () => {
    for (const entry of points as Array<{ points: Array<{ head: string; body: string; factHash: string }> }>) {
      for (const p of entry.points) {
        expect(p.head.length).toBeLessThanOrEqual(40);
        expect(p.body.length).toBeLessThanOrEqual(140);
        expect(isAbsenceOnly(p.head) || isAbsenceOnly(p.body)).toBe(false);
        expect(p.factHash).toMatch(/^[0-9a-f]{8}$/);
      }
    }
    expect(textFingerprint('x')).toHaveLength(8);
  });
});
