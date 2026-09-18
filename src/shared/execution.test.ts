import { describe, expect, it } from 'vitest';

import {
  EXECUTION_STEP_IDS,
  executionProgress,
  firstIncompleteStep,
  normalizeExecutionProject,
} from './execution';

const base = {
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

  it.each([
    { ...base, entityId: '' },
    { ...base, sourceName: '' },
    { ...base, completedSteps: ['FIND', 'INVALID'] },
    { ...base, targetPriceJpy: -1 },
    { ...base, revenueJpy: Number.NaN },
    { ...base, buildUrl: 'javascript:alert(1)' },
    { ...base, checkoutUrl: 'data:text/html,bad' },
  ])('rejects invalid or unsafe execution state', (value) => {
    expect(normalizeExecutionProject(value)).toBeNull();
  });
});
