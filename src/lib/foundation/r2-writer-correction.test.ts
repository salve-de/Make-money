import { afterEach, expect, it, vi } from 'vitest';
import worker, { hydrateQueueCandidates } from '../../../r2-writer/worker';

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it.each([false, true])('advances past more than 40 historical receipts, projected=%s', async (projected) => {
  const logs = vi.spyOn(console, 'log').mockImplementation(() => {});
  const files = new Map<string, unknown>();
  for (let i = 0; i < 60; i++) files.set(`staging/r2-queue/2026/09/21/run_pending_${String(i).padStart(2, '0')}.json`,
    { schema_version: 'r2-queue-run.v1', run_id: `run_pending_${String(i).padStart(2, '0')}`, recorded_items: [] });
  if (projected) for (let i = 0; i < 60; i++) files.set(`staging/automation/receipts/r2_writer/2026/09/21/run_pending_${String(i).padStart(2, '0')}-receipt.json`,
    { status: 'SUCCESS', queue_run_id: `run_pending_${String(i).padStart(2, '0')}`, view_projection: { complete: true } });
  let requests = 0;
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    requests++;
    expect(requests).toBeLessThanOrEqual(40);
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.pathname.includes('/git/trees/')) return Response.json({ tree: [...files.keys()].map(path => ({ type: 'blob', path })) });
    const path = decodeURIComponent(url.pathname.split('/contents/')[1] || '');
    if (init?.method === 'PUT') {
      expect(files.has(path)).toBe(false);
      const body = JSON.parse(String(init.body));
      files.set(path, JSON.parse(Buffer.from(body.content, 'base64').toString('utf8')));
      return Response.json({}, { status: 201 });
    }
    return files.has(path) ? Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify(files.get(path))).toString('base64') }) : new Response(null, { status: 404 });
  }));
  const bucket = { head: vi.fn(), get: vi.fn(), put: vi.fn() };
  const env = { FOUNDATION_R2_RAW: bucket, FOUNDATION_R2_LAKE: bucket, FOUNDATION_R2_RESTRICTED: bucket,
    FOUNDATION_R2_PUBLIC: bucket, FOUNDATION_GITHUB_TOKEN: 'test-only-token', FOUNDATION_R2_WRITER_ENABLED: 'true' };
  await worker.scheduled({ scheduledTime: 0, cron: '20 * * * *' }, env);
  const first = files.size;
  expect(JSON.parse(logs.mock.calls.at(-1)![0]).status).toBe('DEFERRED_REQUEST_BUDGET');
  requests = 0;
  await worker.scheduled({ scheduledTime: 1, cron: '20 * * * *' }, env);
  expect(files.size).toBeGreaterThan(first);
  for(let invocation=0;invocation<20;invocation++) { requests=0; await worker.scheduled({scheduledTime:invocation+2,cron:'20 * * * *'},env); }
  expect([...files.keys()].filter(path=>path.includes('-retry-'))).toHaveLength(60);
  expect(bucket.put).not.toHaveBeenCalled();
});

it('loads an indexed candidate artifact and checks its declared count', async () => {
  const path = 'staging/r2-queue/2026/09/20/candidates/run_example/01-05.json';
  const bundles = [{ schema_version: 'research-bundle.v1', run_id: 'first' }, { schema_version: 'research-bundle.v1', run_id: 'second' }];
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify(bundles)).toString('base64') })));
  const bucket = { head: vi.fn(), get: vi.fn(), put: vi.fn() };
  const env = { FOUNDATION_R2_RAW: bucket, FOUNDATION_R2_LAKE: bucket, FOUNDATION_R2_RESTRICTED: bucket,
    FOUNDATION_R2_PUBLIC: bucket, FOUNDATION_GITHUB_TOKEN: 'test-only-token' };
  const queue = { recorded_items: [{ state: 'VALIDATED_FOR_R2_HANDOFF', artifact_path: path, count: 2 }] };
  const result = await hydrateQueueCandidates(env, queue);
  expect(result.handoff_candidates).toEqual(bundles.map(bundle => ({ state: 'VALIDATED_FOR_R2_HANDOFF', bundle_path: path, bundle })));
  await expect(hydrateQueueCandidates(env, { recorded_items: [{ ...queue.recorded_items[0], count: 3 }] })).rejects.toThrow('count mismatch');
  await expect(hydrateQueueCandidates(env, { recorded_items: [{ ...queue.recorded_items[0], artifact_path: 'staging/../../secrets.json' }] })).rejects.toThrow('Invalid candidate artifact path');
  expect(bucket.put).not.toHaveBeenCalled();
});

it('revalidates a run instead of copying its legacy failed receipt', async () => {
  const logs = vi.spyOn(console, 'log').mockImplementation(() => {});
  const queuePath = 'staging/r2-queue/2026/09/21/run_legacy.json';
  const oldPath = 'staging/automation/receipts/r2_writer/1970/01/01/run_legacy-receipt.json';
  const legacy = { status: 'SKIPPED_NOT_READY', queue_run_id: 'run_legacy', materialization: { issues: ['old failure'] } };
  const files = new Map<string, unknown>([
    [queuePath, { schema_version: 'r2-queue-run.v1', run_id: 'run_legacy', recorded_items: [] }],
    [oldPath, legacy],
  ]);
  const writes: Array<Record<string, unknown>> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.pathname.includes('/git/trees/')) return Response.json({ tree: [queuePath, ...[...files.keys()].filter(p => p.includes('/receipts/'))].map(path => ({ type: 'blob', path })) });
    const path = decodeURIComponent(url.pathname.split('/contents/')[1] || '');
    if (init?.method === 'PUT') {
      expect(files.has(path)).toBe(false);
      const body = JSON.parse(String(init.body));
      const receipt = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      files.set(path, receipt); writes.push(receipt);
      return Response.json({}, { status: 201 });
    }
    return files.has(path) ? Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify(files.get(path))).toString('base64') }) : new Response(null, { status: 404 });
  }));
  const bucket = { head: vi.fn(async () => null), get: vi.fn(async () => null), put: vi.fn(async () => null) };
  await worker.scheduled({ scheduledTime: 0, cron: '20 * * * *' }, {
    FOUNDATION_R2_RAW: bucket, FOUNDATION_R2_LAKE: bucket, FOUNDATION_R2_RESTRICTED: bucket, FOUNDATION_R2_PUBLIC: bucket,
    FOUNDATION_GITHUB_TOKEN: 'test-only-token', FOUNDATION_R2_WRITER_ENABLED: 'true',
  });
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ status: 'SKIPPED_NOT_READY', materialization: { issues: ['queue recorded_items contains no rows'] } });
  expect(JSON.parse(logs.mock.calls[0][0])).toMatchObject({ status: 'SKIPPED_NOT_READY', skipped_invalid_queues: 1 });
  expect(files.get(oldPath)).toEqual(legacy);
  expect(bucket.put).not.toHaveBeenCalled();
});

it('records a scheduled audit correction once without touching R2', async () => {
  const logs = vi.spyOn(console, 'log').mockImplementation(() => {});
  const queuePath = 'staging/r2-queue/2026/09/21/run_correction.json';
  const targetPath = 'staging/r2-queue/2026/09/21/run_original.json';
  const files = new Map<string, unknown>([
    [queuePath, { schema_version: 'r2-queue-run-correction.v1', run_id: 'run_correction',
      input_snapshot: { corrects_path: targetPath, corrects_run_id: 'run_original' },
      recorded_items: [{ type: 'audit_correction', field: 'field_coverage_delta.metric_bundles', old_value: 25, correct_value: 23 }] }],
    [targetPath, { run_id: 'run_original', field_coverage_delta: { metric_bundles: 25 } }],
  ]);
  const writes: Array<Record<string, unknown>> = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
    if (url.pathname.includes('/git/trees/')) return Response.json({ tree: [queuePath, ...[...files.keys()].filter(p => p.includes('/receipts/'))].map(path => ({ type: 'blob', path })) });
    const path = decodeURIComponent(url.pathname.split('/contents/')[1] || '');
    if (init?.method === 'PUT') {
      expect(files.has(path)).toBe(false);
      const body = JSON.parse(String(init.body));
      const receipt = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      files.set(path, receipt);
      writes.push(receipt);
      return Response.json({}, { status: 201 });
    }
    if (!files.has(path)) return new Response(null, { status: 404 });
    return Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify(files.get(path))).toString('base64') });
  }));
  const bucket = { head: vi.fn(async () => null), get: vi.fn(async () => null), put: vi.fn(async () => null) };
  const env = { FOUNDATION_R2_RAW: bucket, FOUNDATION_R2_LAKE: bucket, FOUNDATION_R2_RESTRICTED: bucket,
    FOUNDATION_R2_PUBLIC: bucket, FOUNDATION_GITHUB_TOKEN: 'test-only-token', FOUNDATION_R2_WRITER_ENABLED: 'true' };
  await worker.scheduled({ scheduledTime: 0, cron: '20 * * * *' }, env);
  await worker.scheduled({ scheduledTime: 1, cron: '20 * * * *' }, env);
  expect(JSON.parse(logs.mock.calls[0][0])).toMatchObject({ status: 'SUCCESS', processed_audit_corrections: 1, processed_queue_runs: 0 });
  expect(JSON.parse(logs.mock.calls[1][0])).toMatchObject({ status: 'NO_UNPROCESSED_QUEUE', processed_audit_corrections: 0 });
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({ status: 'AUDIT_CORRECTION_RECORDED', r2: { created: 0 } });
  expect(files.get(targetPath)).toEqual({ run_id: 'run_original', field_coverage_delta: { metric_bundles: 25 } });
  expect(bucket.head).not.toHaveBeenCalled();
  expect(bucket.get).not.toHaveBeenCalled();
  expect(bucket.put).not.toHaveBeenCalled();
});
