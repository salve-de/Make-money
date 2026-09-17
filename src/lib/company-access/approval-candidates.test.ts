import { describe, expect, it } from 'vitest';
import { collectApprovalCandidateIds } from './approval-candidates';

describe('approval candidate catalog', () => {
  it('admits only current records carrying the editorial review marker', () => {
    const ids = collectApprovalCandidateIds([
      { id: 'ENT-ONE', tags: ['収集事例', 'SaaS'] },
      { id: 'ent-two', tags: ['SaaS'] },
      { id: 'ent-three', tags: ['収集事例'] },
      { id: '', tags: ['収集事例'] },
      null,
    ]);

    expect([...ids].sort()).toEqual(['ent-one', 'ent-three']);
  });

  it('fails closed when the catalog root is malformed', () => {
    expect(() => collectApprovalCandidateIds({ id: 'ent-one' })).toThrow('Invalid entity catalog');
  });
});
