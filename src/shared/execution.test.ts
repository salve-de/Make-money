import { describe, expect, it } from 'vitest';

import {
  EXECUTION_STEP_IDS,
  MAX_EXECUTION_NOTES_LENGTH,
  executionProgress,
  executionStorageKey,
  executionStoragePrefix,
  firstIncompleteStep,
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

  it('scopes browser drafts by authenticated owner', () => {
    expect(executionStoragePrefix(null)).toBe('makemoney.execution.anonymous.');
    expect(executionStorageKey('ent-1', 'user-a')).toBe('makemoney.execution.user.user-a.ent-1');
    expect(executionStorageKey('ent-1', 'user-a')).not.toBe(executionStorageKey('ent-1', 'user-b'));
  });

  it.each([
    { ...base, entityId: '' },
    { ...base, sourceName: '' },
    { ...base, completedSteps: ['FIND', 'INVALID'] },
    { ...base, targetPriceJpy: -1 },
    { ...base, revenueJpy: Number.NaN },
    { ...base, buildUrl: 'javascript:alert(1)' },
    { ...base, checkoutUrl: 'data:text/html,bad' },
    { ...base, notes: 'x'.repeat(MAX_EXECUTION_NOTES_LENGTH + 1) },
  ])('rejects invalid or unsafe execution state', (value) => {
    expect(normalizeExecutionProject(value)).toBeNull();
  });
});
