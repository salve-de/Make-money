import { describe, expect, it } from 'vitest';

import {
  EXECUTION_STEP_IDS,
  MAX_EXECUTION_NOTES_LENGTH,
  executionContentEqual,
  executionProgress,
  executionStorageKey,
  executionStoragePrefix,
  firstIncompleteStep,
  isExecutionGenerationCurrent,
  mergeExecutionProjectCopies,
  normalizeExecutionProject,
  type ExecutionProject,
} from './execution';

const base: ExecutionProject = {
  entityId: 'ent-1',
  sourceName: 'Example',
  offerName: 'Offer',
  targetCustomer: 'Customer',
  targetPriceJpy: 3000,
  firstDollarTargetJpy: 1000,
  completedSteps: ['FIND', 'BUILD'],
  buildUrl: 'https://example.com/build',
  launchUrl: '',
  checkoutUrl: '',
  revenueJpy: 0,
  notes: '',
  dirty: false,
  revision: 0,
  generation: 0,
};

describe('first dollar execution model', () => {
  it('calculates progress across the six canonical stages', () => {
    expect(executionProgress(base)).toBe(33);
    expect(executionProgress({ completedSteps: [...EXECUTION_STEP_IDS] })).toBe(100);
  });

  it('returns the first incomplete stage in canonical order', () => {
    expect(firstIncompleteStep(base)).toBe('LIST');
    expect(firstIncompleteStep({ completedSteps: [...EXECUTION_STEP_IDS] })).toBeNull();
  });

  it('normalizes a valid project and removes duplicate completed stages', () => {
    const project = normalizeExecutionProject({ ...base, completedSteps: ['FIND', 'FIND', 'BUILD'] });
    expect(project?.completedSteps).toEqual(['FIND', 'BUILD']);
  });

  it('keeps partial URL input as a valid local draft', () => {
    expect(normalizeExecutionProject({ ...base, buildUrl: 'https://' })?.buildUrl).toBe('https://');
    expect(normalizeExecutionProject({ ...base, launchUrl: 'h' })?.launchUrl).toBe('h');
  });

  it('scopes browser drafts by authenticated owner', () => {
    expect(executionStoragePrefix(null)).toBe('makemoney.execution.anonymous.');
    expect(executionStorageKey('ent-1', 'user-a')).toBe('makemoney.execution.user.user-a.ent-1');
    expect(executionStorageKey('ent-1', 'user-a')).not.toBe(executionStorageKey('ent-1', 'user-b'));
  });

  it('compares editable content independently of server revision metadata', () => {
    const saved = { ...base, revision: 3, generation: 2, updatedAt: '2026-09-18T12:00:00.000Z' };
    const sameContent = { ...saved, revision: 4, updatedAt: '2026-09-18T12:00:01.000Z' };
    const edited = { ...sameContent, offerName: 'Changed offer' };
    expect(executionContentEqual(saved, sameContent)).toBe(true);
    expect(executionContentEqual(saved, edited)).toBe(false);
    expect(isExecutionGenerationCurrent(saved, 2)).toBe(true);
    expect(isExecutionGenerationCurrent(saved, 3)).toBe(false);
  });

  it('merges hub copies by revision and only flags genuine stale-local conflicts', () => {
    const remote2 = { ...base, revision: 2, generation: 0, offerName: 'remote' };
    const staleSame = { ...remote2, revision: 1, dirty: false };
    const staleEdited = { ...remote2, revision: 1, dirty: true, offerName: 'local unsaved' };
    const staleCleanDifferent = { ...remote2, revision: 1, dirty: false, offerName: 'old saved offer' };
    const sameRevisionEdited = { ...remote2, dirty: true, offerName: 'local unsaved' };

    expect(mergeExecutionProjectCopies(staleSame, remote2)).toEqual({ project: remote2, conflict: false });
    expect(mergeExecutionProjectCopies(staleCleanDifferent, remote2)).toEqual({ project: remote2, conflict: false });
    expect(mergeExecutionProjectCopies(staleEdited, remote2)).toEqual({ project: remote2, conflict: true });
    expect(mergeExecutionProjectCopies(sameRevisionEdited, remote2)).toEqual({ project: sameRevisionEdited, conflict: false });
  });

  it.each([
    { ...base, entityId: '' },
    { ...base, sourceName: '' },
    { ...base, completedSteps: ['FIND', 'INVALID'] },
    { ...base, targetPriceJpy: -1 },
    { ...base, revenueJpy: Number.NaN },
    { ...base, buildUrl: 'javascript:alert(1)' },
    { ...base, buildUrl: 'x'.repeat(2049) },
    { ...base, notes: 'x'.repeat(MAX_EXECUTION_NOTES_LENGTH + 1) },
    { ...base, updatedAt: 'not-a-date' },
    { ...base, revision: -1 },
    { ...base, generation: -1 },
  ])('rejects invalid or unsafe execution state', (value) => {
    expect(normalizeExecutionProject(value)).toBeNull();
  });
});
