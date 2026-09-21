import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import worker, { journalEntries, publicationAssignedAt, queueProcessingOrder, sourceRunPaths } from '../../../r2-writer/worker';

class MemoryBucket {
  readonly values = new Map<string, Uint8Array>();

  async head(key: string) {
    const value = this.values.get(key);
    return value ? { arrayBuffer: async () => value.slice().buffer } : null;
  }

  async get(key: string) {
    const value = this.values.get(key);
    return value ? { arrayBuffer: async () => value.slice().buffer } : null;
  }

  async put(key: string, value: Uint8Array, options?: { onlyIf?: { etagDoesNotMatch?: string } }) {
    if (options?.onlyIf?.etagDoesNotMatch === '*' && this.values.has(key)) return null;
    this.values.set(key, value.slice());
    return { arrayBuffer: async () => value.slice().buffer };
  }
}

describe('scheduled R2 writer publication contribution', () => {
  it('uses a full SHA-256 journal identifier', () => {
    const row = { entity_id: 'ent_test', canonical_name: '検証' };
    const [entry] = journalEntries({ run_id: 'run_test', retrieved_at: '2026-09-20T00:00:00Z', entities: [row] });
    expect(entry.journal_id).toBe('jr_' + createHash('sha256').update(`run_test|entity|ent_test|${JSON.stringify(row)}`).digest('hex'));
  });

  it('assigns publication from source time, not retry time', () => {
    const bundle = { retrieved_at: '2026-09-20T00:00:00Z' };
    expect(publicationAssignedAt(bundle)).toBe('2026-09-20T00:00:00.000Z');
    expect(publicationAssignedAt(bundle, { finished_at: '2026-09-20T02:00:00Z' }))
      .toBe('2026-09-20T02:00:00.000Z');
    expect(() => publicationAssignedAt({})).toThrow('stable source timestamp');
  });
  it('resolves only selected run IDs through the artifact map', () => {
    expect(sourceRunPaths({ selected_discovery: { run_id: 'run_chosen' }, source_artifacts: {
      run_chosen: 'staging/automation/discovery/chosen.json',
      run_other: 'staging/automation/discovery/not-selected.json',
    } })).toEqual(['staging/automation/discovery/chosen.json']);
  });
  it('loads explicitly selected legacy discovery and evolve sources only', () => {
    expect(sourceRunPaths({
      source_discovery: { path: 'staging/automation/discovery/2026/09/20/run_d.json' },
      selected_evolve: 'staging/automation/evolve/2026/09/20/run_e.json',
      source_evolve: '../outside.json',
      latest_monitor_observed: 'staging/automation/monitor/unselected.json',
    })).toEqual(['staging/automation/discovery/2026/09/20/run_d.json', 'staging/automation/evolve/2026/09/20/run_e.json']);
  });
  it('keeps the newest queue fresh while draining the oldest backlog', () => {
    const paths = [
      'staging/r2-queue/2026/09/20/20260920T010222Z-run_j10.json',
      'staging/r2-queue/2026/09/20/20260920T020224Z-run_k11.json',
      'staging/r2-queue/2026/09/20/20260920T220416Z-run_q31.json',
      'staging/r2-queue/2026/09/20/candidates/ignored.json',
    ];

    expect(queueProcessingOrder(paths)).toEqual([
      'staging/r2-queue/2026/09/20/20260920T220416Z-run_q31.json',
      'staging/r2-queue/2026/09/20/20260920T010222Z-run_j10.json',
      'staging/r2-queue/2026/09/20/20260920T020224Z-run_k11.json',
    ]);
    expect(queueProcessingOrder(paths, [paths[1]])).toEqual([paths[1], paths[2], paths[0]]);
  });

  it('accepts the plural source-run field emitted by current queue artifacts', () => {
    expect(sourceRunPaths({ selected_source_path: 'staging/automation/discovery/selected.json' }))
      .toEqual(['staging/automation/discovery/selected.json']);
    expect(sourceRunPaths({
      selected_source_runs: [
        'staging/automation/discovery/current.json',
        'staging/automation/evolve/current.json',
        'staging/automation/discovery/current.json',
      ],
      selected_source_run: 'staging/automation/discovery/legacy.json',
      ignored: ['not-staging.json'],
    })).toEqual([
      'staging/automation/discovery/current.json',
      'staging/automation/evolve/current.json',
      'staging/automation/discovery/legacy.json',
    ]);

    expect(sourceRunPaths({
      selected_source_run: {
        path: 'staging/automation/discovery/object-selected.json',
        run_id: 'run_legacy_object',
      },
    })).toEqual(['staging/automation/discovery/object-selected.json']);

    expect(sourceRunPaths({
      primary_source_run: 'staging/automation/discovery/primary.json',
      new_source_run_refs: [
        'staging/automation/backfill/new.json',
        'staging/automation/receipts/not-a-source-run.json',
      ],
    })).toEqual([
      'staging/automation/discovery/primary.json',
      'staging/automation/backfill/new.json',
    ]);
  });

  it('writes an immutable new-arrivals contribution with the canonical bundle', async () => {
    const lake = new MemoryBucket();
    const env = {
      FOUNDATION_R2_RAW: lake,
      FOUNDATION_R2_LAKE: lake,
      FOUNDATION_R2_RESTRICTED: lake,
      FOUNDATION_R2_PUBLIC: lake,
      FOUNDATION_R2_WRITER_ENABLED: 'true',
      FOUNDATION_WRITER_TOKEN: 'test-token',
      FOUNDATION_R2_WRITER_VERSION: 'test-writer.v1',
    };
    const bundle = {
      schema_version: 'research-bundle.v1',
      run_id: 'run_20260920_test',
      retrieved_at: '2026-09-20T00:00:00.000Z',
      quality: { schema_validation: 'PASS' },
      entities: [{
        entity_id: 'ent_test',
        canonical_name: 'Test entity',
        entity_type: 'company',
        aliases: [],
        status: 'ACTIVE',
        evidence_ids: [],
      }],
      claims: [],
      metrics: [],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [],
      derived: [],
      evidence: [],
    };

    const response = await worker.fetch(
      new Request('https://writer.test/ingest', {
        method: 'POST',
        headers: {
          'x-foundation-writer-token': 'test-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ write_authorized: true, bundle }),
      }),
      env,
    );
    const payload = await response.json() as {
      success?: boolean;
      r2?: {
        new_arrivals?: { entity_count?: number; contribution_key?: string } | null;
        objects?: Array<{ role?: string; key?: string }>;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.r2?.new_arrivals?.entity_count).toBe(1);
    expect(payload.r2?.new_arrivals?.contribution_key).toMatch(
      /^views\/make-money\/new-arrivals\/v1\/contributions\/\d{4}\/\d{2}\/\d{2}\/contrib_run_20260920_test\.json$/,
    );
    expect(payload.r2?.objects?.some((item) => item.role === 'new_arrivals_contribution')).toBe(true);
    const before = [...lake.values.entries()].map(([key, value]) => [key, Array.from(value)]);
    const retry = await worker.fetch(new Request('https://writer.test/ingest', {
      method: 'POST', headers: { 'x-foundation-writer-token': 'test-token' },
      body: JSON.stringify({ write_authorized: true, bundle }),
    }), env);
    expect(retry.status).toBe(200);
    expect((await retry.json() as { r2: { created: number } }).r2.created).toBe(0);
    expect([...lake.values.entries()].map(([key, value]) => [key, Array.from(value)])).toEqual(before);
  });
});
