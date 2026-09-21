import { createHash } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ objects: new Map<string, Uint8Array>(), writes: vi.fn(), core: vi.fn(), race: null as null | (() => void) }));
vi.mock('./business-reader', async original => ({
  ...await original<typeof import('./business-reader')>(), readFoundationEntitySummaryById: state.core,
}));
vi.mock('@/lib/storage/r2', () => {
  class Conflict extends Error {}
  return {
    R2ViewConcurrentModificationError: Conflict,
    getFoundationBucketAsync: async () => 'lake',
    readR2Object: async (_bucket: string, key: string) => {
      const body = state.objects.get(key);
      return body ? { body, exists: true, etag: createHash('sha256').update(body).digest('hex') } : null;
    },
    getFromR2: async (key: string) => state.objects.has(key) ? new TextDecoder().decode(state.objects.get(key)) : null,
    listR2Objects: async () => ({ objects: [], truncated: false }),
    putR2MutableView: async (input: {key: string; body: string}, options: {expectedEtag: string}) => {
      if (state.race) { const race = state.race; state.race = null; race(); throw new Conflict(); }
      const previous = state.objects.get(input.key);
      if (previous && createHash('sha256').update(previous).digest('hex') !== options.expectedEtag) throw new Conflict();
      state.writes(input.key);
      const bytes = new TextEncoder().encode(input.body);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      state.objects.set(input.key, bytes);
      return { status: previous && new TextDecoder().decode(previous) === input.body ? 'UNCHANGED' : 'UPDATED',
        sha256, readback: { bytes_match: true, sha256_match: true } };
    },
  };
});
import { buildFoundationBusinessCasesFromBundle, foundationBusinessCaseToValueSummary } from './business-reader';
import { materializeMakeMoneyViews, mergeFoundationBusinessCasesForView, repairMakeMoneyViewEvidence } from './make-money-view';

const prefix = 'datasets/ds.business.research-bundles.derived/v1/2026/09/21/';
const viewKey = 'views/make-money/v1/entities/ent_example.json';
const progressKey = (run: string) => `views/make-money/v1/_projection-progress/${run}.json`;
const at = '2026-09-21T00:00:00Z';
function bundle(run: string, evidence: string[], claim = 'cl_original') {
  return { schema_version: 'research-bundle.v1', run_id: run, retrieved_at: at,
    entities: [{entity_id: 'ent_example', entity_type: 'company', canonical_name: 'Example', aliases: [],
      domain: null, canonical_identifier: null, status: 'observed', observed_at: at, evidence_ids: evidence}],
    claims: [{claim_id: claim, entity_ids: ['ent_example'], statement: claim, origin_type: 'reported',
      verification_status: 'SUPPORTED', confidence: 1, evidence_ids: evidence}],
    metrics: [], money_signals: [], events: [], relationships: [], observations: [], derived: [],
  };
}
function put(key: string, value: unknown) {
  const bytes = new TextEncoder().encode(JSON.stringify(value)); state.objects.set(key, bytes);
  return {key, sha256: createHash('sha256').update(bytes).digest('hex')};
}
function stored(key: string) { return JSON.parse(new TextDecoder().decode(state.objects.get(key))); }
function progress(run: string) {
  put(progressKey(run), {schema_version: 'make-money-view-projection-progress.v2', run_id: run,
    bundle_key: `${prefix}${run}.json`, retrieved_at: at, next_index: 1, total_targets: 1,
    complete: true, unresolved_entity_ids: [], updated_at: at});
}
function setup() {
  const old = bundle('run_old', ['ev_good', 'ev_wrong']);
  const corrected = bundle('run_corrected', ['ev_good']);
  const later = bundle('run_later', ['ev_other'], 'cl_other');
  const originalRef = put(`${prefix}run_old.json`, old);
  const correctedRef = put(`${prefix}run_corrected.json`, corrected);
  put(`${prefix}run_later.json`, later); progress('run_later');
  const oldCase = buildFoundationBusinessCasesFromBundle(old)[0];
  const detail = mergeFoundationBusinessCasesForView(oldCase, buildFoundationBusinessCasesFromBundle(later)[0]);
  put(viewKey, {schema_version: 'make-money-view.v2', consumer: 'make-money', projection_version: 'v1',
    source_run_ids: ['run_old', 'run_later'], latest_source_run_id: 'run_later', projected_at: at,
    summary: foundationBusinessCaseToValueSummary(detail), detail});
  state.core.mockResolvedValue(oldCase);
  return { entityId: 'ent_example', original: originalRef, corrected: correctedRef };
}
beforeEach(() => {state.objects.clear(); state.writes.mockClear(); state.core.mockReset(); state.race = null;});

it('rebuilds the corrected contribution, retains other runs, and never writes canonical originals', async () => {
  const input = setup(); const before = state.objects.get(input.original.key);
  const result = await repairMakeMoneyViewEvidence(input);
  const view = stored(viewKey);
  expect(result.readback).toEqual({bytes_match: true, sha256_match: true});
  expect(view.source_run_ids).toEqual(['run_corrected', 'run_later']);
  expect(view.detail.claims.map((r: {id: string}) => r.id)).toEqual(['cl_original', 'cl_other']);
  expect(view.detail.evidenceIds).toEqual(['ev_good', 'ev_other']);
  expect(view.excluded_source_run_ids).toEqual(['run_old']);
  expect(view.excluded_evidence_ids).toEqual(['ev_wrong']);
  expect(state.objects.get(input.original.key)).toEqual(before);
  expect(state.writes.mock.calls.every(([key]) => key === viewKey)).toBe(true);
  expect((await repairMakeMoneyViewEvidence(input)).status).toBe('UNCHANGED');
});
it('normal projection cannot reintroduce superseded evidence through a retained immutable entity core', async () => {
  const input = setup(); await repairMakeMoneyViewEvidence(input);
  await materializeMakeMoneyViews(bundle('run_new', ['ev_new'], 'cl_new'));
  expect(stored(viewKey).detail.evidenceIds).not.toContain('ev_wrong');
  expect(stored(viewKey).detail.claims.map((r: {id: string}) => r.id)).toContain('cl_other');
  const prior = stored(viewKey);
  await materializeMakeMoneyViews(bundle('run_old', ['ev_good', 'ev_wrong']));
  expect(stored(viewKey)).toEqual(prior);
});
it('fails closed on missing other-run history', async () => {
  const input = setup(); state.objects.delete(progressKey('run_later'));
  await expect(repairMakeMoneyViewEvidence(input)).rejects.toThrow('refusing to drop');
  expect(state.writes).not.toHaveBeenCalled();
});
it('dry-run resolves every contributing bundle but writes nothing', async () => {
  const result = await repairMakeMoneyViewEvidence({...setup(), dryRun: true});
  expect(result.status).toBe('DRY_RUN');
  expect(result.retainedRunIds).toEqual(['run_corrected', 'run_later']);
  expect(state.writes).not.toHaveBeenCalled();
});
it('rejects tampered bytes and business-fact changes', async () => {
  const input = setup();
  await expect(repairMakeMoneyViewEvidence({...input, corrected: {...input.corrected, sha256: '0'.repeat(64)}})).rejects.toThrow('hash mismatch');
  const changed = bundle('run_corrected', ['ev_good']); changed.claims[0].statement = 'invented';
  input.corrected = put(input.corrected.key, changed);
  await expect(repairMakeMoneyViewEvidence(input)).rejects.toThrow('record facts');
  expect(state.writes).not.toHaveBeenCalled();
});
it('re-reads and retains concurrent new history after a CAS conflict', async () => {
  const input = setup();
  state.race = () => {
    const next = bundle('run_concurrent', ['ev_race'], 'cl_race');
    put(`${prefix}run_concurrent.json`, next); progress('run_concurrent');
    const view = stored(viewKey); view.source_run_ids.push('run_concurrent'); put(viewKey, view);
  };
  const result = await repairMakeMoneyViewEvidence(input);
  expect(result.retries).toBe(1);
  expect(result.retainedRunIds).toContain('run_concurrent');
  expect(stored(viewKey).detail.claims.map((r: {id: string}) => r.id)).toContain('cl_race');
});
