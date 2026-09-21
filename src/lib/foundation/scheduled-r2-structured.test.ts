import { expect, it } from 'vitest';
import { materializeScheduledR2Handoff } from './scheduled-r2-handoff';

it('accepts a single unnamed-ID entity and preserves search-result provenance', async()=>{
 const result=await materializeScheduledR2Handoff({queue:{schema_version:'r2-queue-run.v1',run_id:'run_single_entity',finished_at:'2026-09-21T00:00:00Z',recorded_items:[{source_entity_id:'queue_example',state:'VALIDATED_FOR_R2_HANDOFF',Entity:[{name:'Example'}],Source:[{url:'https://example.com/report'}],Evidence:[{summary:'Reported transaction'}],quality:{verification_status:'SUPPORTED'}}]},source_runs:[{source_attempts:[{url:'https://example.com/report',result:'success_via_search_result_after_direct_open_error'}]}]});
 expect(result.entity_count).toBe(1);
 expect(result.bundle.sources).toEqual([expect.objectContaining({access_notes:expect.stringContaining('direct open failed')})]);
 expect(result.bundle.entities).toEqual([expect.objectContaining({canonical_name:'Example'})]);
});

it('reads normalized wrappers while retaining their outer readiness state', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: { schema_version: 'r2-queue-run.v2', run_id: 'run_wrapped', finished_at: '2026-09-21T00:00:00Z',
      recorded_items: [{ state: 'VALIDATED_FOR_R2_HANDOFF', source_run_ref: { entity_id: 'ent_example' }, normalized: {
        Entity: { entity_id: 'ent_example', name: 'Example' }, Source: 'https://example.com/report', Evidence: 'Reported evidence',
      } }] },
    source_runs: [{ source_attempts: [{ result: 'success_metadata_extract', url: 'https://example.com/report' }] }],
  });
  expect(result.included_items).toBe(1);
  expect(result.bundle.entities).toEqual([expect.objectContaining({ canonical_name: 'Example' })]);
});

it.each([
  [9, [{ result: 'success', url: 'https://example.com/report' }]],
  [0, [null, { result: 'success', url: 'https://example.com/report' }]],
  [0, [{ result: 'attempted_unavailable', url: 'https://example.com/report' }]],
])('rejects an invalid or unsuccessful indexed reference %s', async (index, attempts) => {
  await expect(materializeScheduledR2Handoff({
    queue: { schema_version: 'r2-queue-run.v2', run_id: 'run_invalid_index', finished_at: '2026-09-21T00:00:00Z',
      recorded_items: [{ name: 'Example', state: 'VALIDATED_FOR_R2_HANDOFF', Source: `src_example|source_attempts[${index}]|metadata_only`, Evidence: 'Reported evidence' }] },
    source_runs: [{ source_attempts: attempts }],
  })).rejects.toThrow('no successful source locator');
});

it('resolves an explicit source attempt index without taking other attempts', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: { schema_version: 'r2-queue-run.v2', run_id: 'run_indexed', finished_at: '2026-09-21T00:00:00Z',
      recorded_items: [{ name: 'Example', state: 'VALIDATED_FOR_R2_HANDOFF', Source: 'src_example|source_attempts[1]|metadata_only', Evidence: 'Reported evidence' }] },
    source_runs: [{ source_attempts: [
      { result: 'success', url: 'https://unrelated.example/report' },
      { result: 'success', url: 'https://example.com/report' },
    ] }],
  });
  expect(result.bundle.evidence).toEqual([expect.objectContaining({ source_url: 'https://example.com/report' })]);
});

it('rejects an unlinked row even when unrelated source attempts succeeded', async () => {
  await expect(materializeScheduledR2Handoff({
    queue: { schema_version: 'r2-queue-run.v1', run_id: 'run_unlinked', finished_at: '2026-09-21T00:00:00Z',
      recorded_items: [{ subject: 'Unlinked Company', state: 'VALIDATED_FOR_R2_HANDOFF', Source: [{ preserved_by_reference: true }], Evidence: ['An observation with no established source link'] }] },
    source_runs: [{ recorded_items: [], source_attempts: [
      { result: 'success', url_or_source_id: 'https://unrelated.example/report' },
    ] }],
  })).rejects.toThrow('no successful source locator');
});

it('does not choose the first company when multiple unnamed subjects are ambiguous', async () => {
  await expect(materializeScheduledR2Handoff({
    queue: { schema_version: 'r2-queue-run.v1', run_id: 'run_ambiguous', finished_at: '2026-09-21T00:00:00Z',
      recorded_items: [{ Entity: [{ name: 'First Company' }, { name: 'Second Company' }], state: 'VALIDATED_FOR_R2_HANDOFF', Evidence: ['An observation'] }] },
    source_runs: [],
  })).rejects.toThrow('has no name');
});

it('resolves preserved references without attaching unrelated successful attempts', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: { schema_version: 'r2-queue-run.v1', run_id: 'run_preserved_refs', finished_at: '2026-09-21T00:00:00Z',
      recorded_items: [{ subject: 'Old Example', state: 'VALIDATED_FOR_R2_HANDOFF', Source: [{ preserved_by_reference: true }], Evidence: ['Reported transaction evidence'] }] },
    source_runs: [{ recorded_items: [{ canonical_name: 'Example Company', aliases: ['Old Example'], evidence_ids: ['evidence-human-readable-id'], source_refs: ['source-reference-one'] }],
      source_attempts: [
        { result: 'success', source_ref: 'source-reference-one', evidence_ids_if_any: ['evidence-human-readable-id'], url_or_source_id: 'https://example.com/report' },
        { result: 'success', source_ref: 'unrelated-ref', evidence_ids_if_any: ['unrelated-id'], url_or_source_id: 'https://unrelated.example/report' },
      ] }],
  });
  expect(result.evidence_count).toBe(1);
  expect(result.bundle.evidence).toEqual([expect.objectContaining({ source_url: 'https://example.com/report' })]);
});

it('preserves the named subject and evidence in structured collector rows', async () => {
  const result = await materializeScheduledR2Handoff({
    queue: {
      schema_version: 'r2-queue-run.v1',
      run_id: 'run_structured_test',
      finished_at: '2026-09-21T00:00:00Z',
      recorded_items: [{
        source_entity_id: 'ent_example',
        state: 'VALIDATED_FOR_R2_HANDOFF',
        Entity: [{ name: 'Related Company' }, { name: 'Example Company' }],
        Source: [{ url: 'https://example.com/report', strength: 'A', rights_status: 'metadata_only' }],
        Evidence: [{ verification_status: 'SUPPORTED', summary: 'The company reported a completed transaction.' }],
        Claim: [{ reported_fact: 'The company reported a completed transaction.' }],
        quality: { verification_status: 'SUPPORTED', source_strength: 'A' },
      }],
    },
    source_runs: [{ recorded_items: [{ entity_id: 'ent_example', identity: { canonical_name: 'Example Company' } }], source_attempts: [{
      source_url: 'https://example.com/report', attempt_result: 'USABLE',
      retrieved_at_or_attempted_at: '2026-09-20T23:00:00Z',
    }, {
      url_or_source_id: 'https://unrelated.example/report', result: 'success',
      retrieved_at_or_attempted_at: '2026-09-20T23:00:00Z',
    }] }],
  });
  expect(result.included_items).toBe(1);
  expect(result.bundle.entities).toEqual(expect.arrayContaining([
    expect.objectContaining({ canonical_name: 'Example Company' }),
  ]));
  expect(result.bundle.evidence).toEqual([
    expect.objectContaining({ source_url: 'https://example.com/report', summary: 'The company reported a completed transaction.' }),
  ]);
});
