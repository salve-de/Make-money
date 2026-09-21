import { describe, expect, it } from 'vitest';
import { buildNewArrivalsContribution } from './new-arrivals';
import { mergeNewArrivalsIndexContributions } from './new-arrivals-index';

describe('new-arrivals release index', () => {
  it('unions contributions within an edition without duplicating IDs', () => {
    const first = buildNewArrivalsContribution({
      queueRunId: 'run_first',
      entityIds: ['ent_a', 'ent_shared'],
      assignedAt: '2026-09-19T23:00:00.000Z',
    });
    const second = buildNewArrivalsContribution({
      queueRunId: 'run_second',
      entityIds: ['ent_b', 'ent_shared'],
      assignedAt: '2026-09-19T23:30:00.000Z',
    });

    const index = mergeNewArrivalsIndexContributions([first, second], new Date('2026-09-20T07:00:00.000Z'));

    expect(index.editions).toHaveLength(1);
    expect(index.editions[0]).toMatchObject({
      release_id: '20260920-09',
      entity_ids: ['ent_a', 'ent_b', 'ent_shared'],
      contribution_ids: ['contrib_run_first', 'contrib_run_second'],
    });
  });
});
