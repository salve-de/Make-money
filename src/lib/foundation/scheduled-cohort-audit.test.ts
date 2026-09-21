import { expect, it } from 'vitest';
import { materializeScheduledR2Handoff, type ScheduledHandoffInput } from './scheduled-r2-handoff';

function fixture(): ScheduledHandoffInput {
  return { queue: { run_id: 'run_cohort', finished_at: '2026-09-21T05:01:46Z',
    recorded_items: [{ record_type: 'R2QueueCandidateBatch' }, { record_type: 'NormalizedCandidateManifest' }],
    throughput: { validated_for_r2_handoff: 2 }, input_snapshot: { selected_bundles: 2 },
    normalized_candidates: [0, 1].map(n => ({ source_entity_id: `source_${n}`, state: 'VALIDATED_FOR_R2_HANDOFF',
      Entity: [{ name: `Company ${n}` }], Source: [{ url: `https://example.com/${n}` }],
      Evidence: [{ id: `ev_${String(n).padStart(24, '0')}`, summary: `Reported fact ${n}` }],
      Claim: [{ text: `Reported fact ${n}` }], quality: { verification_status: 'UNVERIFIED' } })) },
    source_runs: [{ source_attempts: [0, 1].map(n => ({ url: `https://example.com/${n}`, result: 'SUCCESS' })) }] };
}

it('retains search-extract-only provenance without claiming fetched raw content or verified facts', async () => {
  const input = fixture();
  input.source_runs[0].source_attempts = [0, 1].map(n => ({ url: `https://example.com/${n}`,
    result: 'success_search_extract_only', rights_state: 'metadata_only', evidence_ids_if_any: [`ev_${String(n).padStart(24, '0')}`] }));
  const result = await materializeScheduledR2Handoff(input);
  const rows = (key: string) => result.bundle[key] as Record<string, unknown>[];
  expect(rows('claims').every(row => row.verification_status === 'UNVERIFIED')).toBe(true);
  expect(rows('sources').every(row => row.rights_status === 'metadata_only' && String(row.access_notes).includes('Only a search extract'))).toBe(true);
  expect(rows('evidence').every(row => (row.raw_storage as Record<string, unknown>).status === 'metadata_only')).toBe(true);
  for (const status of ['failed', 'success_unknown', 'search_extract_only']) {
    input.source_runs[0].source_attempts = [0, 1].map(n => ({ url: `https://example.com/${n}`, result: status }));
    await expect(materializeScheduledR2Handoff(input)).rejects.toThrow('no successful source locator');
  }
});

it('routes typed cohort audits without changing individual IDs, evidence or deterministic bundle bytes', async () => {
  const input = fixture(); const original = JSON.stringify(input);
  const actual = await materializeScheduledR2Handoff(input);
  const individual = await materializeScheduledR2Handoff({ ...input, queue: { ...input.queue,
    recorded_items: input.queue.normalized_candidates, normalized_candidates: undefined } });
  expect(actual.included_items).toBe(2); expect(actual.evidence_count).toBe(2);
  expect(actual.bundle).toEqual(individual.bundle);
  expect(await materializeScheduledR2Handoff(input)).toEqual(actual);
  expect(JSON.stringify(input)).toBe(original);
});

it.each(['unknown', 'mixed', 'duplicate audit', 'duplicate candidate', 'missing ID', 'invalid row', 'count', 'missing count', 'selected count'])(
  'rejects %s without silently accepting incomplete cohort input', async fault => {
    const input = fixture();
    const audits = input.queue.recorded_items as Record<string, unknown>[];
    const candidates = input.queue.normalized_candidates as Record<string, unknown>[];
    if (fault === 'unknown') audits[1].record_type = 'UnrecognizedManifest';
    if (fault === 'mixed') audits.push({ record_id_if_assigned: 'source_0' });
    if (fault === 'duplicate audit') audits.push({ ...audits[0] });
    if (fault === 'duplicate candidate') candidates[1].source_entity_id = 'source_0';
    if (fault === 'missing ID') delete candidates[1].source_entity_id;
    if (fault === 'invalid row') input.queue.normalized_candidates = [candidates[0], null];
    if (fault === 'count') input.queue.throughput!.validated_for_r2_handoff = 3;
    if (fault === 'missing count') delete input.queue.throughput!.validated_for_r2_handoff;
    if (fault === 'selected count') input.queue.input_snapshot!.selected_bundles = 3;
    await expect(materializeScheduledR2Handoff(input)).rejects.toThrow();
  });
