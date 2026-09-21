import { describe, expect, it } from 'vitest';
import {
  buildNewArrivalsContribution,
  getNewArrivalsReleaseSlotAtOrAfter,
  getNextNewArrivalsReleaseAt,
  newArrivalsContributionKey,
  parseNewArrivalsContribution,
} from './new-arrivals';

describe('new-arrivals publication windows', () => {
  it('uses 09:00, 15:00, and 21:00 JST as immutable edition boundaries', () => {
    expect(getNewArrivalsReleaseSlotAtOrAfter('2026-09-20T00:00:00.000Z').releaseId).toBe('20260920-09');
    expect(getNewArrivalsReleaseSlotAtOrAfter('2026-09-20T00:00:00.001Z').releaseId).toBe('20260920-15');
    expect(getNewArrivalsReleaseSlotAtOrAfter('2026-09-20T06:00:00.001Z').releaseId).toBe('20260920-21');
    expect(getNewArrivalsReleaseSlotAtOrAfter('2026-09-20T12:00:00.001Z').releaseId).toBe('20260921-09');
  });

  it('returns the next strict future boundary for browser refresh scheduling', () => {
    expect(getNextNewArrivalsReleaseAt('2026-09-20T00:00:00.000Z').toISOString()).toBe('2026-09-20T06:00:00.000Z');
    expect(getNextNewArrivalsReleaseAt('2026-09-20T06:00:00.000Z').toISOString()).toBe('2026-09-20T12:00:00.000Z');
  });

  it('round-trips a contribution and places it under the release date', () => {
    const contribution = buildNewArrivalsContribution({
      queueRunId: 'run_20260920_01',
      entityIds: ['ent_b', 'ent_a', 'ent_a'],
      assignedAt: '2026-09-20T00:00:00.001Z',
      queuePath: 'staging/r2-queue/2026/09/20/run.json',
    });

    expect(contribution.release_id).toBe('20260920-15');
    expect(contribution.entity_ids).toEqual(['ent_a', 'ent_b']);
    expect(newArrivalsContributionKey(contribution)).toBe(
      'views/make-money/new-arrivals/v1/contributions/2026/09/20/contrib_run_20260920_01.json',
    );
    expect(parseNewArrivalsContribution(contribution)).toEqual(contribution);
  });
});
