import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
const project = vi.hoisted(() => vi.fn());
vi.mock('./make-money-view', () => ({ materializeMakeMoneyViews: project }));
import worker, { materializeScheduledR2Handoff } from '../../../r2-writer/worker';

type Row = Record<string, unknown>;
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); project.mockReset(); });
const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value) + '\n');

async function fixture(count = 2) {
  const files = new Map<string, Row>(); const values = new Map<string, Uint8Array>();
  const queues: Array<{ path: string; queue: Row; entity: Row }> = [];
  let r2Reads = 0, puts = 0, githubCalls = 0;
  let afterTree: (() => void) | undefined;
  const blobSha = (value: unknown) => createHash('sha1').update(JSON.stringify(value)).digest('hex');
  for (let n = 0; n < count; n++) {
    const queue = { run_id: `run_hold_${n}`, finished_at: '2026-09-21T00:00:00Z',
      recorded_items: [{ name: `Company ${n}`, state: 'VALIDATED_FOR_R2_HANDOFF', Evidence: `ev_${String(n).padStart(24, '0')}` }],
      input_snapshot: { selected_source_path: `staging/automation/discovery/source_${n}.json` } };
    const source = { source_attempts: [{ url: `https://example.com/${n}`, result: 'success', evidence_ids_if_any: [`ev_${String(n).padStart(24, '0')}`] }] };
    const { bundle } = await materializeScheduledR2Handoff({ queue, source_runs: [source] });
    const path = `staging/r2-queue/2026/09/21/run_hold_${n}.json`;
    files.set(path, queue); files.set(queue.input_snapshot.selected_source_path, source);
    queues.push({ path, queue, entity: (bundle.entities as Row[])[0] });
  }
  const get = vi.fn(async (key: string) => { r2Reads++; const value = values.get(key);
    return value ? { arrayBuffer: async () => value.slice().buffer } : null; });
  const bucket = { head: vi.fn(), get, put: vi.fn(async (key: string, value: Uint8Array) => {
    puts++; if (values.has(key)) return null; values.set(key, value.slice());
    return { arrayBuffer: async () => value.slice().buffer };
  }) };
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    githubCalls++;
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.pathname.includes('/git/trees/')) {
      const tree = [...files].map(([path, value]) => ({ type: 'blob', path, sha: blobSha(value) }));
      afterTree?.(); afterTree = undefined;
      return Response.json({ tree });
    }
    const path = decodeURIComponent(url.pathname.split('/contents/')[1] || '');
    if (init?.method === 'PUT') {
      expect(files.has(path)).toBe(false);
      files.set(path, JSON.parse(Buffer.from(JSON.parse(String(init.body)).content, 'base64').toString()));
      return Response.json({}, { status: 201 });
    }
    return files.has(path) ? Response.json({ sha: blobSha(files.get(path)), encoding: 'base64', content: Buffer.from(JSON.stringify(files.get(path))).toString('base64') })
      : new Response(null, { status: 404 });
  }));
  project.mockResolvedValue({ complete: true, unresolved_entity_ids: [] });
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const run = async () => {
    const beforeGithub = githubCalls, beforeReads = r2Reads, beforePuts = puts;
    await worker.scheduled({ scheduledTime: 0, cron: '20 * * * *' }, {
      FOUNDATION_R2_LAKE: bucket, FOUNDATION_R2_RAW: bucket, FOUNDATION_R2_PUBLIC: bucket, FOUNDATION_R2_RESTRICTED: bucket,
      FOUNDATION_R2_WRITER_ENABLED: 'true', FOUNDATION_R2_WRITER_VERSION: 'test.hold', FOUNDATION_GITHUB_TOKEN: 'test-only',
    });
    expect(githubCalls - beforeGithub).toBeLessThanOrEqual(40);
    expect(r2Reads - beforeReads + puts - beforePuts).toBeLessThanOrEqual(900);
    return JSON.parse(log.mock.calls.at(-1)![0]);
  };
  const conflict = (n: number) => {
    const entity = queues[n].entity; const key = `datasets/ds.business.entities.core/v1/entities/${entity.entity_id}.json`;
    const bytes = encode({ ...entity, canonical_name: 'Preserve this immutable original' }); values.set(key, bytes);
    return { key, bytes };
  };
  const holds = () => [...files.values()].filter(value => value.status === 'HELD_IMMUTABLE_CONFLICT');
  return { files, values, queues, bucket, run, conflict, holds,
    afterTree: (fn: () => void) => { afterTree = fn; },
    get githubCalls() { return githubCalls; }, get r2Reads() { return r2Reads; }, get puts() { return puts; } };
}

describe('scheduled immutable conflicts are explicit holds, never success', () => {
  it.each(['queue', 'dependency', 'deleted dependency'])('fails closed when %s changes after the tree snapshot', async target => {
    const f = await fixture(1); f.conflict(0);
    f.afterTree(() => {
      const path = target === 'queue' ? f.queues[0].path : 'staging/automation/discovery/source_0.json';
      if (target === 'deleted dependency') f.files.delete(path);
      else f.files.set(path, { ...f.files.get(path), changed_after_tree: true });
    });
    await expect(f.run()).rejects.toThrow('GitHub snapshot changed during read');
    expect(f.holds()).toHaveLength(0); expect(f.puts).toBe(0);
  });
  it('reaches a normal successor in a 40-artifact inventory with three existing holds within budget', async () => {
    const f = await fixture(40);
    // Leave the newest and the first two historical runs held; the next is valid.
    const heldIndices = [9, 0, 1]; // Fixture paths sort lexically; run_hold_9 is newest.
    heldIndices.forEach(f.conflict);
    // Populate valid holds through the real handler, using only these three paths.
    const saved = f.queues.filter((_, n) => !heldIndices.includes(n));
    saved.forEach(q => f.files.delete(q.path));
    await f.run(); expect(f.holds()).toHaveLength(3);
    saved.forEach(q => f.files.set(q.path, q.queue));
    const before = f.githubCalls;
    const result = await f.run();
    expect(result.queue_artifact_count).toBe(40);
    expect(result.processed_queue_runs).toBe(2);
    expect(result.held_conflict_queue_paths).toHaveLength(3);
    expect(f.githubCalls - before).toBe(13);
  });
  it('preserves a conflicting newest run and processes the next normal run', async () => {
    const f = await fixture(); const old = f.conflict(1);
    const result = await f.run();
    expect(result.status).toBe('PARTIAL'); expect(result.processed_queue_runs).toBe(1);
    expect(result.processed_queue_paths).toEqual([f.queues[0].path]);
    expect(result.held_conflict_queue_paths).toEqual([f.queues[1].path]);
    expect(f.values.get(old.key)).toEqual(old.bytes);
    expect(f.holds()).toHaveLength(1);
    expect(f.holds()[0].r2).toMatchObject({ complete: false, created: null, partial_writes_possible: true });
    expect([...f.files.values()].filter(row => row.status === 'SUCCESS').map(row => row.queue_run_id)).toEqual(['run_hold_0']);
  });
  it('terminates all-hold runs and does not repeat R2 preflight for unchanged inputs', async () => {
    const f = await fixture(3); [0, 1, 2].forEach(f.conflict);
    expect(await f.run()).toMatchObject({ status: 'HELD_IMMUTABLE_CONFLICT', processed_queue_runs: 0 });
    expect(f.holds()).toHaveLength(3); expect(f.puts).toBe(0);
    const reads = f.r2Reads;
    // An unrelated receipt changes the repository tree but not candidate inputs.
    f.files.set('staging/automation/receipts/unrelated.json', { status: 'OTHER' });
    expect(await f.run()).toMatchObject({ status: 'HELD_IMMUTABLE_CONFLICT', processed_queue_runs: 0 });
    expect(f.r2Reads).toBe(reads); expect(f.holds()).toHaveLength(3);
  });
  it.each(['queue', 'dependency'])('re-evaluates changed %s content under the same writer version', async change => {
    const f = await fixture(1); f.conflict(0); await f.run(); const reads = f.r2Reads;
    if (change === 'queue') f.queues[0].queue.notes = 'revised input';
    else f.files.set('staging/automation/discovery/source_0.json', {
      source_attempts: [{ url: 'https://example.com/revised', result: 'success', evidence_ids_if_any: ['ev_' + '0'.repeat(24)] }],
    });
    await f.run(); expect(f.r2Reads).toBeGreaterThan(reads); expect(f.holds()).toHaveLength(2);
    expect(f.holds()[0].input_sha256).not.toBe(f.holds()[1].input_sha256);
  });
  it('does not swallow connectivity, authentication or readback integrity failures', async () => {
    for (const message of ['R2 unauthorized', 'EADDRNOTAVAIL', 'R2_READBACK_MISMATCH', 'R2_OBJECT_CONFLICT spoofed text']) {
      const f = await fixture(1); f.bucket.get.mockRejectedValueOnce(new Error(message));
      await expect(f.run()).rejects.toThrow(message); expect(f.holds()).toHaveLength(0);
    }
  });
  it('reports possible partial writes truthfully when an earlier chunk already completed', async () => {
    const f = await fixture(1);
    const entities = Array.from({ length: 201 }, (_, n) => ({ ...f.queues[0].entity, entity_id: `ent_chunk_${n}` }));
    f.queues[0].queue.handoff_candidates = [{ state: 'VALIDATED_FOR_R2_HANDOFF', bundle: {
      schema_version: 'research-bundle.v1', entities, quality: { schema_validation: 'PASS' },
    } }];
    const key = 'datasets/ds.business.entities.core/v1/entities/ent_chunk_199.json';
    const before = encode({ ...entities[199], canonical_name: 'Old' }); f.values.set(key, before);
    expect(await f.run()).toMatchObject({ status: 'HELD_IMMUTABLE_CONFLICT', processed_queue_runs: 0 });
    expect(f.puts).toBeGreaterThan(0); expect(f.values.get(key)).toEqual(before);
    expect(f.holds()[0].r2).toMatchObject({ complete: false, created: null, partial_writes_possible: true });
    expect(project).not.toHaveBeenCalled();
  });
  it('fails a real post-PUT readback mismatch rather than recording a preflight conflict hold', async () => {
    const f = await fixture(1);
    f.bucket.put.mockImplementation(async (key: string) => {
      const bad = encode({ corrupted: true }); f.values.set(key, bad);
      return { arrayBuffer: async () => bad.slice().buffer };
    });
    await expect(f.run()).rejects.toThrow('R2_READBACK_MISMATCH'); expect(f.holds()).toHaveLength(0);
  });
  it('rejects a tampered hold receipt instead of silently skipping the run', async () => {
    const f = await fixture(1); f.conflict(0); await f.run();
    f.holds()[0].queue_run_id = 'run_other';
    await expect(f.run()).rejects.toThrow('hold receipt integrity mismatch');
  });
  it.each(['hash', 'complete', 'created'])('rejects invalid hold %s evidence', async field => {
    const f = await fixture(1); f.conflict(0); await f.run();
    const hold = f.holds()[0];
    if (field === 'hash') delete (hold.conflict as Row).observed_sha256;
    else if (field === 'complete') (hold.r2 as Row).complete = true;
    else (hold.r2 as Row).created = 0;
    await expect(f.run()).rejects.toThrow('hold receipt integrity mismatch');
  });
});
