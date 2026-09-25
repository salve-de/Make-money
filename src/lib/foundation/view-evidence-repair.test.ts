import { createHash } from 'node:crypto';
import { beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ objects: new Map<string, Uint8Array>(), writes: vi.fn(), core: vi.fn(), list: vi.fn(), race: null as null | (() => void) }));
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
    headR2Object: async (_bucket: string, key: string) => ({ exists: state.objects.has(key) }),
    readR2ObjectRange: async (_bucket: string, key: string) => {
      const body = state.objects.get(key);
      return body ? { body, exists: true, etag: createHash('sha256').update(body).digest('hex') } : null;
    },
    getFromR2: async (key: string) => state.objects.has(key) ? new TextDecoder().decode(state.objects.get(key)) : null,
    listR2Objects: state.list,
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
import { materializeMakeMoneyViews, mergeFoundationBusinessCasesForView, readMakeMoneyValuePage, readMakeMoneyViewDetail, repairMakeMoneyViewEvidence } from './make-money-view';

const prefix = 'datasets/ds.business.research-bundles.derived/v1/2026/09/21/';
const viewKey = 'views/make-money/v1/entities/ent_example.json';
const controlKey = 'views/make-money/v1/_evidence-corrections/ent_example.json';
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
beforeEach(() => {state.objects.clear(); state.writes.mockClear(); state.core.mockReset(); state.list.mockReset().mockResolvedValue({objects: [], truncated: false}); state.race = null;});

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
  expect(state.writes.mock.calls.every(([key]) => key === viewKey || key === controlKey)).toBe(true);
  expect((await repairMakeMoneyViewEvidence(input)).status).toBe('UNCHANGED');
});
it('list and detail remain corrected even if an older deployed projector rewrites the ordinary view', async () => {
  const input = setup(); const oldView = state.objects.get(viewKey)!;
  await repairMakeMoneyViewEvidence(input);
  state.objects.set(viewKey, oldView); // Legacy writer does not know the control.
  const detail = await readMakeMoneyViewDetail('ent_example');
  expect(detail?.evidenceIds).toEqual(['ev_good', 'ev_other']);
  expect(detail?.claims.find(row => row.id === 'cl_original')?.evidenceIds).toEqual(['ev_good']);
  expect(detail?.claims.map(row => row.id)).toContain('cl_other');
  state.list.mockImplementation(async ({prefix: p}: {prefix: string}) => ({objects: p.endsWith('/entities/') ? [{key: viewKey}] : [], truncated: false}));
  const page = await readMakeMoneyValuePage();
  expect(page.data[0].evidenceIds).not.toContain('ev_wrong');
});
it('a persisted guard also protects a view recreated after view loss', async () => {
  const input = setup(); await repairMakeMoneyViewEvidence(input);
  state.objects.delete(viewKey);
  await materializeMakeMoneyViews(bundle('run_old', ['ev_good', 'ev_wrong']));
  expect((await readMakeMoneyViewDetail('ent_example'))?.evidenceIds).not.toContain('ev_wrong');
  expect(stored(viewKey).source_run_ids).not.toContain('run_old');
});
it('invalid correction control fails closed instead of showing uncorrected data', async () => {
  setup(); put(controlKey, {schema_version: 'invalid'});
  await expect(readMakeMoneyViewDetail('ent_example')).rejects.toThrow('Invalid persisted');
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
it('retains later updates sharing a corrected record ID through reads and normal projection', async () => {
  const input = setup();
  const later = bundle('run_later', ['ev_other']);
  later.claims[0].statement = 'Later independently reported statement';
  put(`${prefix}run_later.json`, later);
  await repairMakeMoneyViewEvidence(input);
  expect((await readMakeMoneyViewDetail('ent_example'))?.claims.find(row => row.id === 'cl_original')?.statement).toBe(later.claims[0].statement);
  const newest = bundle('run_newest', ['ev_newest']);
  newest.claims[0].statement = 'Newer statement after repair';
  await materializeMakeMoneyViews(newest);
  expect((await readMakeMoneyViewDetail('ent_example'))?.claims.find(row => row.id === 'cl_original')?.statement).toBe(newest.claims[0].statement);
});
it('rejects empty mandatory hashes before writing controls', async () => {
  const input = setup();
  await expect(repairMakeMoneyViewEvidence({...input, original: {...input.original, sha256: ''}})).rejects.toThrow('mandatory bundle hash');
  await expect(repairMakeMoneyViewEvidence({...input, corrected: {...input.corrected, sha256: ''}})).rejects.toThrow('mandatory bundle hash');
  expect(state.writes).not.toHaveBeenCalled();
});
it('rejects record-level reassignment even to evidence retained by the entity', async () => {
  const input = setup();
  const before = bundle('run_old', ['ev_good', 'ev_second', 'ev_wrong']);
  before.claims[0].evidence_ids = ['ev_good'];
  const after = bundle('run_corrected', ['ev_good', 'ev_second']);
  after.claims[0].evidence_ids = ['ev_second'];
  input.original = put(input.original.key, before);
  input.corrected = put(input.corrected.key, after);
  await expect(repairMakeMoneyViewEvidence(input)).rejects.toThrow('record evidence links');
  expect(state.writes).not.toHaveBeenCalled();
});
it('rejects additional observations rather than allowing new facts through repair', async () => {
  const input = setup();
  input.corrected = put(input.corrected.key, {...bundle('run_corrected', ['ev_good']), observations: [
    {entity_ids: ['ent_example'], observation: 'Invented additional fact', evidence_ids: ['ev_good'], verification_status: 'SUPPORTED'},
  ]});
  await expect(repairMakeMoneyViewEvidence(input)).rejects.toThrow('observations');
  expect(state.writes).not.toHaveBeenCalled();
});
it('matches repeated observation text one-to-one without rejecting different valid evidence', async () => {
  const input = setup();
  const observations = [
    {entity_ids: ['ent_example'], observation: 'Repeated report', evidence_ids: ['ev_good']},
    {entity_ids: ['ent_example'], observation: 'Repeated report', evidence_ids: ['ev_other']},
  ];
  input.original = put(input.original.key, {...bundle('run_old', ['ev_good', 'ev_other', 'ev_wrong']), observations});
  input.corrected = put(input.corrected.key, {...bundle('run_corrected', ['ev_good', 'ev_other']), observations});
  await expect(repairMakeMoneyViewEvidence({...input, dryRun: true})).resolves.toMatchObject({status: 'DRY_RUN'});
  input.corrected = put(input.corrected.key, {...bundle('run_corrected', ['ev_good', 'ev_other']), observations: [observations[0], observations[0]]});
  await expect(repairMakeMoneyViewEvidence({...input, dryRun: true})).rejects.toThrow();
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
