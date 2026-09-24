import { describe, expect, it } from 'vitest';
import {
  filterBundleForPublication,
  makeFailClosedPublicationGate,
  parsePublicationGate,
  verifyPublicationGateSignature,
  canonicalPublicationJson,
} from './publication-gate';
import { createHmac } from 'node:crypto';

describe('commercial publication gate', () => {
  it('fails closed when the signed gate is missing', () => {
    expect(makeFailClosedPublicationGate('run_x').decision).toBe('HOLD_PUBLIC');
  });

  it('verifies a deterministic publisher HMAC', () => {
    const gate = {
      schema_version: 'foundation-publication-gate.v1' as const,
      bundle_run_id: 'run_x',
      policy_index_version: 'v1',
      evaluated_at: '2026-09-24T13:00:00.000Z',
      decision: 'ALLOW_FULL' as const,
      allowed_evidence_ids: ['ev_a'],
      held_evidence: [],
      policy_ids: ['rp.a'],
    };
    const signature = createHmac('sha256', 'secret').update(canonicalPublicationJson(gate)).digest('hex');
    expect(verifyPublicationGateSignature(gate, signature, 'secret', 'run_x')).toEqual(gate);
  });

  it('removes rights-held evidence and transport sidecars from public projection', () => {
    const gate = parsePublicationGate({
      schema_version: 'foundation-publication-gate.v1',
      bundle_run_id: 'run_x',
      policy_index_version: 'v1',
      evaluated_at: '2026-09-24T13:00:00.000Z',
      decision: 'ALLOW_PARTIAL',
      allowed_evidence_ids: ['ev_ok'],
      held_evidence: [{ evidence_id: 'ev_hold', source_id: 'src_hold', policy_id: null, reason_code: 'PUBLIC_FACT_DISPLAY_NOT_ALLOWED' }],
      policy_ids: ['rp.ok'],
    }, 'run_x')!;
    const projected = filterBundleForPublication({
      run_id: 'run_x',
      sources: [
        { source_id: 'src_ok' },
        { source_id: 'src_hold' },
      ],
      evidence: [
        { evidence_id: 'ev_ok', source_id: 'src_ok' },
        { evidence_id: 'ev_hold', source_id: 'src_hold' },
      ],
      entities: [{ entity_id: 'ent_org_0123456789abcdef0123', evidence_ids: ['ev_ok', 'ev_hold'] }],
      claims: [
        { claim_id: 'clm_ok', entity_ids: ['ent_org_0123456789abcdef0123'], evidence_ids: ['ev_ok'] },
        { claim_id: 'clm_hold', entity_ids: ['ent_org_0123456789abcdef0123'], evidence_ids: ['ev_hold'] },
      ],
      metrics: [], money_signals: [], events: [], relationships: [],
      observations: [{ observation_id: 'obs_ok', entity_ids: ['ent_org_0123456789abcdef0123'], evidence_ids: ['ev_ok'], text: 'fact', transport_typed_record_set_v1: { secret: 'private' } }],
      derived: [],
    }, gate)!;
    expect((projected.evidence as unknown[])).toHaveLength(1);
    expect((projected.claims as unknown[])).toHaveLength(1);
    expect((projected.observations as Array<Record<string, unknown>>)[0].transport_typed_record_set_v1).toBeUndefined();
  });
});
