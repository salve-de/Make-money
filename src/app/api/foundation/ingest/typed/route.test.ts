import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { withCloudflareRuntimeEnv } from '@/lib/runtime/cloudflare';
import { gitBlobSha1, prepareFoundationTypedIngest } from '@/lib/foundation/typed-ingest';
import { POST } from './route';
import { GET as getBusinesses } from '@/app/api/businesses/route';

type Stored = {
  body: Uint8Array;
  etag: string;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
  uploaded: Date;
};

class MemoryR2 {
  private readonly objects = new Map<string, Stored>();

  private object(stored: Stored, body = stored.body) {
    const copy = new Uint8Array(body);
    return {
      size: copy.byteLength,
      httpMetadata: stored.httpMetadata,
      customMetadata: stored.customMetadata,
      etag: stored.etag,
      httpEtag: stored.etag,
      uploaded: stored.uploaded,
      arrayBuffer: async () => copy.buffer.slice(copy.byteOffset, copy.byteOffset + copy.byteLength),
    };
  }

  async head(key: string) {
    const stored = this.objects.get(key);
    return stored ? this.object(stored, new Uint8Array()) : null;
  }

  async get(key: string, options?: { range?: { offset: number; length: number } }) {
    const stored = this.objects.get(key);
    if (!stored) return null;
    const body = options?.range
      ? stored.body.slice(options.range.offset, options.range.offset + options.range.length)
      : stored.body;
    return this.object(stored, body);
  }

  async put(
    key: string,
    value: Uint8Array,
    options?: {
      onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string };
      httpMetadata?: { contentType?: string };
      customMetadata?: Record<string, string>;
    },
  ) {
    const existing = this.objects.get(key);
    if (options?.onlyIf?.etagDoesNotMatch === '*' && existing) return null;
    if (options?.onlyIf?.etagMatches) {
      if (!existing || existing.etag !== options.onlyIf.etagMatches.replace(/^"+|"+$/g, '')) return null;
    }

    const body = new Uint8Array(value);
    const etag = createHash('sha256').update(body).digest('hex').slice(0, 32);
    const stored: Stored = {
      body,
      etag,
      httpMetadata: options?.httpMetadata,
      customMetadata: options?.customMetadata,
      uploaded: new Date(),
    };
    this.objects.set(key, stored);
    return this.object(stored, new Uint8Array());
  }

  async list(options: { limit?: number; prefix?: string; cursor?: string } = {}) {
    const prefix = options.prefix || '';
    const limit = Math.max(1, options.limit || 1000);
    const keys = [...this.objects.keys()].filter((key) => key.startsWith(prefix)).sort();
    const start = options.cursor ? Number(options.cursor) : 0;
    const slice = keys.slice(start, start + limit);
    const next = start + slice.length;
    return {
      objects: slice.map((key) => {
        const stored = this.objects.get(key)!;
        return { key, size: stored.body.byteLength, etag: stored.etag, uploaded: stored.uploaded };
      }),
      truncated: next < keys.length,
      ...(next < keys.length ? { cursor: String(next) } : {}),
    };
  }

  keys(): string[] {
    return [...this.objects.keys()].sort();
  }

  readJson(key: string): unknown {
    const stored = this.objects.get(key);
    if (!stored) return null;
    return JSON.parse(new TextDecoder().decode(stored.body));
  }

  findJson(predicate: (value: Record<string, unknown>, key: string) => boolean) {
    for (const [key, stored] of this.objects) {
      try {
        const value = JSON.parse(new TextDecoder().decode(stored.body));
        if (value && typeof value === 'object' && !Array.isArray(value) && predicate(value, key)) {
          return { key, value: value as Record<string, unknown> };
        }
      } catch {
        // Ignore non-JSON objects in this test helper.
      }
    }
    return null;
  }
}

const fixture = (name: string) =>
  readFileSync(resolve(process.cwd(), 'src/lib/foundation/__fixtures__', name), 'utf8');

const typedPath =
  'staging/automation/typed-records/DISCOVERY/2026/09/22/run_discovery_20260922T105724Z_44a9978146ce/spott-typed-record-set-v1.json';
const artifactPath =
  'staging/automation/discovery/2026/09/22/20260922T110700Z-discovery-run_discovery_20260922T105724Z_44a9978146ce.json';

function realSpottRequest() {
  const typedText = fixture('spott-20260922-typed-record-set-v1.json');
  const artifactText = fixture('spott-20260922-collection-run-v1.json');
  return {
    write_authorized: true as const,
    source: {
      repository: 'salve-de/universal-foundation',
      source_ref: 'main',
      source_commit_sha: 'a'.repeat(40),
      typed_record_set_path: typedPath,
      typed_record_set_blob_sha: gitBlobSha1(typedText),
      source_artifact_path: artifactPath,
      source_artifact_blob_sha: gitBlobSha1(artifactText),
    },
    typed_record_set_text: typedText,
    source_artifact_text: artifactText,
  };
}

function envFor(r2: MemoryR2) {
  return {
    FOUNDATION_INGEST_TOKEN: 'typed-e2e-token',
    FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
    FOUNDATION_R2_LAKE: r2,
  };
}

async function postTyped(r2: MemoryR2, body: unknown) {
  return withCloudflareRuntimeEnv(envFor(r2), () =>
    POST(new NextRequest('http://localhost/api/foundation/ingest/typed', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-foundation-ingest-token': 'typed-e2e-token',
      },
      body: JSON.stringify(body),
    })),
  );
}

describe('typed sidecar real-data E2E', () => {
  it('preserves a real scheduled Spott sidecar through canonical R2, view materialization and public API', async () => {
    const request = realSpottRequest();
    expect(request.source.typed_record_set_blob_sha).toBe('c972c60737e40fd9a862393325dc9141da7d5156');
    expect(request.source.source_artifact_blob_sha).toBe('e582c876c280ef271f59aeeb38eb683f0a3f68db');

    const prepared = prepareFoundationTypedIngest(request);
    const runId = String(prepared.bundle.run_id);
    const r2 = new MemoryR2();

    const first = await postTyped(r2, request);
    const firstBody = await first.json();
    expect(first.status).toBe(200);
    expect(firstBody).toMatchObject({
      success: true,
      input_kind: 'typed_sidecar',
      mapper_version: 'r2-queue-mapper-v4',
      coverage_assessment: 'UNASSESSED',
      run_id: runId,
    });
    expect(firstBody.counts.created).toBeGreaterThan(0);
    expect(firstBody.view_projection.complete).toBe(true);

    const canonical = r2.findJson((value) =>
      value.schema_version === 'research-bundle.v1' && value.run_id === runId,
    );
    expect(canonical).not.toBeNull();
    expect(canonical!.key).toContain('datasets/ds.business.research-bundles.derived/v1/');

    const observations = canonical!.value.observations as Array<Record<string, unknown>>;
    const transport = observations.find((item) => item.observation_type === 'transport.typed_record_set_v1');
    expect(transport?.transport_typed_record_set_v1).toEqual(JSON.parse(request.typed_record_set_text));

    const api = await withCloudflareRuntimeEnv(envFor(r2), () =>
      getBusinesses(new Request('http://localhost/api/businesses?foundationOnly=true&q=Spott&limit=100')),
    );
    const apiBody = await api.json();
    expect(api.status).toBe(200);
    expect(apiBody.source).toBe('foundation_lake');
    expect(apiBody.data.some((row: { id?: string; name?: string }) =>
      row.id === 'ent_organization_2fb9960a8a1bcfd297a2' && row.name === 'Spott',
    )).toBe(true);

    const keysAfterFirst = r2.keys();
    const second = await postTyped(r2, request);
    const secondBody = await second.json();
    expect(second.status).toBe(200);
    expect(secondBody.success).toBe(true);
    expect(secondBody.canonical_ingest).toBe('ALREADY_COMMITTED');
    expect(r2.keys()).toEqual(keysAfterFirst);
  });

  it('rejects an invalid immutable typed input before any canonical or view write', async () => {
    const request = realSpottRequest();
    const invalid = JSON.parse(request.typed_record_set_text);
    invalid.observations[0].verification_status = 'PARTIAL';
    request.typed_record_set_text = JSON.stringify(invalid);
    request.source.typed_record_set_blob_sha = gitBlobSha1(request.typed_record_set_text);

    const r2 = new MemoryR2();
    const response = await postTyped(r2, request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({
      reason_code: 'SOURCE_SCHEMA_INVALID',
      terminal: true,
    });
    expect(r2.keys()).toEqual([]);
  });
});
