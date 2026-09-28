import { describe, expect, it } from 'vitest';
import { FoundationBundleValidationError, validateResearchBundle } from './ingest';

const entityId = 'ent_demo_0123456789abcdef0123';
const metricId = 'mt_0123456789abcdef01234567';

function bundle(metric: Record<string, unknown>) {
  return {
    schema_version: 'research-bundle.v1',
    run_id: 'run_semantic_metric_test',
    purpose: 'general_research',
    subject: { query: 'semantic metric validation' },
    agent: { name: 'test-collector' },
    retrieved_at: '2026-09-22T00:00:00Z',
    sources: [],
    evidence: [],
    entities: [],
    claims: [],
    metrics: [{
      metric_id: metricId,
      entity_id: entityId,
      metric_type: 'owner_tenure',
      value: 25,
      unit: 'years',
      currency: null,
      period_start: null,
      period_end: null,
      point_in_time: null,
      basis: null,
      scope: null,
      origin_type: 'reported',
      confidence: 0.9,
      evidence_ids: [],
      ...metric,
    }],
    events: [],
    relationships: [],
    derived: [],
    quality: { schema_validation: 'PASS', unknowns: [], conflicts: [], warnings: [] },
  };
}

describe('collection metric semantic validation', () => {
  it('accepts an observed duration with unknown currency preserved as null', () => {
    expect(validateResearchBundle(bundle({})).metrics[0]).toMatchObject({
      metric_type: 'owner_tenure',
      value: 25,
      unit: 'years',
      currency: null,
    });
  });

  it('rejects a duration that was incorrectly assigned a currency', () => {
    expect(() => validateResearchBundle(bundle({ currency: 'USD' }))).toThrow(FoundationBundleValidationError);
    try {
      validateResearchBundle(bundle({ currency: 'USD' }));
    } catch (error) {
      expect(error).toBeInstanceOf(FoundationBundleValidationError);
      expect((error as FoundationBundleValidationError).issues.join(' ')).toContain('currency must be null');
    }
  });

  it('does not reject an ordinary money metric merely because currency is unknown', () => {
    const validated = validateResearchBundle(bundle({
      metric_type: 'annual_revenue',
      unit: 'annual',
      currency: null,
    }));
    expect(validated.metrics[0]).toMatchObject({ metric_type: 'annual_revenue', currency: null });
  });
});
