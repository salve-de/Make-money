import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as ingestTyped } from '@/app/api/foundation/ingest/typed/route';
import { GET as getBusinesses } from '@/app/api/businesses/route';
import { withCloudflareRuntimeEnv } from '@/lib/runtime/cloudflare';
import { gitBlobSha1 } from './typed-ingest';
import { adaptFoundationDetailToFinancialEntity } from './foundation-adapter';
import type { FoundationBusinessCase } from './business-reader';
import { UniversalIntelligenceStream } from '@/features/company-inspector/ui/UniversalIntelligenceStream';

type StoredObject = {
  body: Uint8Array;
  etag: string;
  httpMetadata?: { contentType?: string };
  customMetadata?: Record<string, string>;
  uploaded: Date;
};

class MemoryR2 {
  private objects = new Map<string, StoredObject>();
  private sequence = 0;

  keys(): string[] {
    return [...this.objects.keys()].sort();
  }

  async head(key: string) {
    const stored = this.objects.get(key);
    return stored ? this.metadata(stored) : null;
  }

  async get(key: string, options?: { range?: { offset: number; length: number } }) {
    const stored = this.objects.get(key);
    if (!stored) return null;
    const range = options?.range;
    const body = range
      ? stored.body.slice(range.offset, range.offset + range.length)
      : stored.body.slice();
    return {
      ...this.metadata(stored),
      async arrayBuffer() {
        return body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength);
      },
    };
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
    if (options?.onlyIf?.etagMatches !== undefined) {
      if (!existing || existing.etag !== options.onlyIf.etagMatches) return null;
    }
    const body = value.slice();
    const stored: StoredObject = {
      body,
      etag: `mem-${++this.sequence}`,
      httpMetadata: options?.httpMetadata,
      customMetadata: options?.customMetadata,
      uploaded: new Date('2026-09-24T13:30:00.000Z'),
    };
    this.objects.set(key, stored);
    return this.metadata(stored);
  }

  async list(options: { limit?: number; prefix?: string; cursor?: string } = {}) {
    const prefix = options.prefix || '';
    const limit = Math.max(1, options.limit || 1000);
    const all = this.keys().filter((key) => key.startsWith(prefix));
    const start = options.cursor ? Number.parseInt(options.cursor, 10) : 0;
    const selected = all.slice(start, start + limit);
    const next = start + selected.length;
    return {
      objects: selected.map((key) => {
        const stored = this.objects.get(key)!;
        return {
          key,
          size: stored.body.byteLength,
          etag: stored.etag,
          uploaded: stored.uploaded,
        };
      }),
      truncated: next < all.length,
      cursor: next < all.length ? String(next) : undefined,
    };
  }

  private metadata(stored: StoredObject) {
    return {
      size: stored.body.byteLength,
      httpMetadata: stored.httpMetadata,
      customMetadata: stored.customMetadata,
      etag: stored.etag,
      httpEtag: stored.etag,
      uploaded: stored.uploaded,
    };
  }
}

const sourceRunId = 'run_discovery_typed_e2e_001';
const subjectRef = 'case:typed-e2e-company:2026';
const entityId = 'ent_organization_1234567890abcdef1234';
const evidenceId = 'ev_1234567890abcdef12345678';
const unresolvedEntityId = 'ent_organization_deadbeefdeadbeefdead';
const typedPath =
  `staging/automation/typed-records/DISCOVERY/2026/09/24/${sourceRunId}/typed-e2e-company-typed-record-set-v1.json`;
const artifactPath =
  `staging/automation/discovery/2026/09/24/20260924T223000JST-discovery-${sourceRunId}.json`;

function sourceArtifact() {
  return {
    schema_version: 'collection-run.v1',
    lane: 'DISCOVERY',
    run_id: sourceRunId,
    started_at: '2026-09-24T13:29:00Z',
    finished_at: '2026-09-24T13:30:00Z',
    contract_ref: 'docs/COLLECTION_OS_V3.md@test',
    input_snapshot: {},
    source_attempts: [],
    recorded_items: [{ subject_ref: subjectRef }],
    coverage_delta: {},
    audit: {},
    checkpoint: {},
    final_status: 'SUCCESS',
  };
}

function typedRecordSet(
  verificationStatus: string = 'SUPPORTED',
  publicPolicy = false,
  includeUnresolvedReference = false,
) {
  const sourceId = publicPolicy ? 'src.e-stat' : 'src.test.primary';
  const policyId = publicPolicy ? 'rights.e-stat.v1' : null;
  const sourceUrl = publicPolicy ? 'https://www.e-stat.go.jp/' : 'https://example.com/report';
  return {
    schema_version: 'typed-record-set.v1',
    source_run_id: sourceRunId,
    source_artifact: {
      path: artifactPath,
      blob_sha: '',
      lane: 'DISCOVERY',
    },
    purpose: 'make_money',
    subject_ref: subjectRef,
    subject: {
      query: 'Typed E2E Company',
      candidate_name: 'Typed E2E Company',
      candidate_domain: 'example.com',
      notes: null,
    },
    provenance: {
      retrieved_at: '2026-09-24T13:29:00Z',
      recorded_at: '2026-09-24T13:30:00Z',
      collection_channel: 'web_search_indexed+github',
      agent: {
        name: 'ChatGPT Web Collection',
        model: null,
        version: 'collection-operations.v1+discovery.v1',
      },
      rights_reviewed_at: publicPolicy ? '2026-09-24T13:28:00Z' : null,
    },
    sources: [{
      source_id: sourceId,
      provider_name: publicPolicy ? 'e-Stat' : 'Typed E2E official source',
      source_type: publicPolicy ? 'official_statistics' : 'official_release',
      canonical_url: sourceUrl,
      source_strength: publicPolicy ? 'S' : 'A',
      rights_status: 'metadata_only',
      rights_policy_id: policyId,
      access_notes: null,
    }],
    evidence: [{
      evidence_id: evidenceId,
      source_id: sourceId,
      source_url: sourceUrl,
      source_title: 'Typed E2E official report',
      source_type: publicPolicy ? 'official_statistics' : 'official_release',
      publisher_or_speaker: publicPolicy ? 'e-Stat' : 'Typed E2E Company',
      published_at: '2026-09-24T13:00:00Z',
      retrieved_at: '2026-09-24T13:29:00Z',
      source_strength: publicPolicy ? 'S' : 'A',
      rights_status: 'metadata_only',
      rights_policy_id: policyId,
      raw_storage: {
        status: 'metadata_only',
        bucket: null,
        key: null,
        content_sha256: null,
        content_type: null,
        bytes: null,
      },
      summary: 'Official report states annual revenue of $123 million.',
      extracted_facts: ['Annual revenue reported as $123 million.'],
    }],
    entities: [{
      entity_id: entityId,
      entity_type: 'organization',
      canonical_name: 'Typed E2E Company',
      aliases: ['Typed E2E Company'],
      canonical_identifier: null,
      domain: 'example.com',
      status: 'active',
      observed_at: '2026-09-24T13:29:00Z',
      evidence_ids: [evidenceId],
    }],
    claims: [
      ...(publicPolicy ? [{
        claim_id: 'cl_1234567890abcdef12345678',
        entity_ids: [entityId],
        statement: 'Typed E2E Company reports annual revenue of $123 million.',
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        confidence: 1,
        occurred_at: '2026-09-24T13:00:00Z',
        evidence_ids: [evidenceId],
      }] : []),
      ...(includeUnresolvedReference ? [{
        claim_id: 'cl_deadbeefdeadbeefdeadbeef',
        entity_ids: [entityId, unresolvedEntityId],
        statement: 'Typed E2E Company references an entity that is not yet materialized.',
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        confidence: 1,
        occurred_at: null,
        evidence_ids: [evidenceId],
      }] : []),
    ],
    metrics: [],
    money_signals: [],
    events: [],
    relationships: [],
    observations: [{
      observation_id: 'obs_1234567890abcdef12345678',
      observation_type: 'business_model.revenue_signal',
      origin_type: 'reported',
      verification_status: verificationStatus,
      observed_at: '2026-09-24T13:29:00Z',
      collection_channel: 'web',
      observer: 'DISCOVERY',
      evidence_ids: [evidenceId],
      payload_schema_ref: 'urn:test:typed-e2e:v1',
      payload: {
        summary: 'Official report states annual revenue of $123 million.',
        amount: 123000000,
        currency: 'USD',
        structured_only_field: {
          must_survive_transport: true,
        },
      },
    }],
    quality: {
      mapping_status: 'REQUIRES_BUNDLE_V2',
      unknowns: [{ field: 'margin', status: 'OPEN' }],
      conflicts: [],
      warnings: ['structured observation must survive transport'],
      schema_validation: 'NOT_RUN',
    },
  };
}

function requestFor(
  verificationStatus: string = 'SUPPORTED',
  publicPolicy = false,
  includeUnresolvedReference = false,
) {
  const artifactText = JSON.stringify(sourceArtifact());
  const typed = typedRecordSet(verificationStatus, publicPolicy, includeUnresolvedReference);
  typed.source_artifact.blob_sha = gitBlobSha1(artifactText);
  const typedText = JSON.stringify(typed);
  return {
    write_authorized: true as const,
    source: {
      repository: 'salve-de/universal-foundation',
      source_ref: 'main',
      source_commit_sha: 'a'.repeat(40),
      typed_record_set_path: typedPath,
      typed_record_set_blob_sha: gitBlobSha1(typedText),
      source_artifact_path: artifactPath,
      source_artifact_blob_sha: typed.source_artifact.blob_sha,
    },
    typed_record_set_text: typedText,
    source_artifact_text: artifactText,
  };
}

function requestForMixedRights() {
  const artifactText = JSON.stringify(sourceArtifact());
  const typed = typedRecordSet('SUPPORTED', true);
  const heldEvidenceId = 'ev_aaaaaaaaaaaaaaaaaaaaaaaa';
  const heldEntityId = 'ent_organization_aaaaaaaaaaaaaaaaaaaa';

  typed.sources.push({
    source_id: 'src.test.restricted',
    provider_name: 'Restricted discovery source',
    source_type: 'secondary_reporting',
    canonical_url: 'https://example.org/restricted',
    source_strength: 'B',
    rights_status: 'pending_review',
    rights_policy_id: null,
    access_notes: null,
  });
  typed.evidence.push({
    evidence_id: heldEvidenceId,
    source_id: 'src.test.restricted',
    source_url: 'https://example.org/restricted',
    source_title: 'Restricted discovery report',
    source_type: 'secondary_reporting',
    publisher_or_speaker: 'Restricted Publisher',
    published_at: '2026-09-24T13:00:00Z',
    retrieved_at: '2026-09-24T13:29:00Z',
    source_strength: 'B',
    rights_status: 'pending_review',
    rights_policy_id: null,
    raw_storage: {
      status: 'metadata_only',
      bucket: null,
      key: null,
      content_sha256: null,
      content_type: null,
      bytes: null,
    },
    summary: 'This source must remain private.',
    extracted_facts: ['Private-only discovery fact.'],
  });
  typed.entities.push({
    entity_id: heldEntityId,
    entity_type: 'organization',
    canonical_name: 'Held Entity',
    aliases: ['Held Entity'],
    canonical_identifier: null,
    domain: 'example.org',
    status: 'active',
    observed_at: '2026-09-24T13:29:00Z',
    evidence_ids: [heldEvidenceId],
  });
  typed.claims.push({
    claim_id: 'cl_aaaaaaaaaaaaaaaaaaaaaaaa',
    entity_ids: [heldEntityId],
    statement: 'Held Entity has a private-only discovery fact.',
    origin_type: 'reported',
    verification_status: 'SUPPORTED',
    confidence: 1,
    occurred_at: '2026-09-24T13:00:00Z',
    evidence_ids: [heldEvidenceId],
  });

  typed.source_artifact.blob_sha = gitBlobSha1(artifactText);
  const typedText = JSON.stringify(typed);
  return {
    write_authorized: true as const,
    source: {
      repository: 'salve-de/universal-foundation',
      source_ref: 'main',
      source_commit_sha: 'a'.repeat(40),
      typed_record_set_path: typedPath,
      typed_record_set_blob_sha: gitBlobSha1(typedText),
      source_artifact_path: artifactPath,
      source_artifact_blob_sha: typed.source_artifact.blob_sha,
    },
    typed_record_set_text: typedText,
    source_artifact_text: artifactText,
  };
}

function canonicalKeys(r2: MemoryR2): string[] {
  return r2.keys().filter((key) =>
    key.startsWith('datasets/ds.business.research-bundles.derived/v1/'));
}

async function postTyped(requestBody: ReturnType<typeof requestFor>) {
  return ingestTyped(new NextRequest('http://localhost/api/foundation/ingest/typed', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-foundation-ingest-token': 'typed-e2e-token',
    },
    body: JSON.stringify(requestBody),
  }));
}

describe('typed sidecar end-to-end through MemoryR2 and serving API', () => {
  it('writes canonical data but holds the public view when rights are not cleared', async () => {
    const r2 = new MemoryR2();
    await withCloudflareRuntimeEnv({
      FOUNDATION_INGEST_TOKEN: 'typed-e2e-token',
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const first = await postTyped(requestFor());
      const firstBody = await first.json();
      expect(first.status).toBe(200);
      expect(firstBody.success).toBe(true);
      expect(firstBody.input_kind).toBe('typed_sidecar');
      expect(firstBody.view_projection.status).toBe('RIGHTS_HELD');
      expect(firstBody.new_arrivals).toBeNull();

      const firstCanonical = canonicalKeys(r2);
      expect(firstCanonical).toHaveLength(1);
      expect(r2.keys()).not.toContain(`views/make-money/v1/entities/${entityId}.json`);

      const detailResponse = await getBusinesses(
        new Request(`http://localhost/api/businesses?foundationOnly=true&entity_id=${entityId}`),
      );
      expect(detailResponse.status).toBe(404);

      const second = await postTyped(requestFor());
      const secondBody = await second.json();
      expect(second.status).toBe(200);
      expect(secondBody.success).toBe(true);
      expect(secondBody.view_projection.status).toBe('RIGHTS_HELD');
      expect(canonicalKeys(r2)).toEqual(firstCanonical);
    });
  });

  it('materializes and serves an approved-policy supported fact projection', async () => {
    const r2 = new MemoryR2();
    await withCloudflareRuntimeEnv({
      FOUNDATION_INGEST_TOKEN: 'typed-e2e-token',
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const first = await postTyped(requestFor('SUPPORTED', true));
      const firstBody = await first.json();
      expect(first.status).toBe(200);
      expect(firstBody.success).toBe(true);
      expect(firstBody.mapper_version).toBe('r2-queue-mapper-v6');
      expect(firstBody.view_projection.status).toMatch(/^PASS/);
      expect(r2.keys()).toContain(`views/make-money/v1/entities/${entityId}.json`);

      const detailResponse = await getBusinesses(
        new Request(`http://localhost/api/businesses?foundationOnly=true&entity_id=${entityId}`),
      );
      const detail = await detailResponse.json();
      expect(detailResponse.status).toBe(200);
      expect(detail.source).toBe('foundation_lake');
      expect(detail.data.id).toBe(entityId);
      const detailText = JSON.stringify(detail.data);
      expect(detailText).toContain('annual revenue of $123 million');
      const structuredObservation = detail.data.observations.find(
        (item: { kind?: string }) => item.kind === 'business_model.revenue_signal',
      );
      expect(structuredObservation).toMatchObject({
        kind: 'business_model.revenue_signal',
        publicPayload: {
          amount: 123000000,
          currency: 'USD',
        },
      });
      expect(structuredObservation).not.toHaveProperty('payload');
      expect(structuredObservation).not.toHaveProperty('observer');
      expect(structuredObservation).not.toHaveProperty('payloadSchemaRef');
      expect(detailText).not.toContain('structured_only_field');
      expect(detailText).not.toContain('must_survive_transport');
      expect(detailText).not.toContain('urn:test:typed-e2e:v1');
      expect(detailText).not.toContain('DISCOVERY');

      const uiEntity = adaptFoundationDetailToFinancialEntity(
        detail.data as FoundationBusinessCase,
      );
      const uiHtml = renderToStaticMarkup(createElement(
        UniversalIntelligenceStream,
        { entity: uiEntity, currency: 'USD' },
      ));
      expect(uiHtml).toContain('構造化データ');
      expect(uiHtml).toContain('business_model.revenue_signal');
      expect(uiHtml).toContain('123000000');
      expect(uiHtml).toContain('USD');
      expect(uiHtml).not.toContain('structured_only_field');
      expect(uiHtml).not.toContain('must_survive_transport');
      expect(uiHtml).not.toContain('urn:test:typed-e2e:v1');
      expect(uiHtml).not.toContain('DISCOVERY');

      const canonicalObject = await r2.get(canonicalKeys(r2)[0]);
      expect(canonicalObject).toBeTruthy();
      const canonicalBody = canonicalObject
        ? new Uint8Array(await canonicalObject.arrayBuffer())
        : new Uint8Array();
      const canonicalText = new TextDecoder().decode(canonicalBody);
      expect(canonicalText).toContain('must_survive_transport');
      expect(canonicalText).toContain('urn:test:typed-e2e:v1');
      expect(canonicalText).toContain('DISCOVERY');

      const listResponse = await getBusinesses(
        new Request('http://localhost/api/businesses?foundationOnly=true&limit=100'),
      );
      const list = await listResponse.json();
      expect(listResponse.status).toBe(200);
      expect(list.data.some((row: { id?: string }) => row.id === entityId)).toBe(true);

      const firstCanonical = canonicalKeys(r2);
      const second = await postTyped(requestFor('SUPPORTED', true));
      const secondBody = await second.json();
      expect(second.status).toBe(200);
      expect(secondBody.success).toBe(true);
      expect(canonicalKeys(r2)).toEqual(firstCanonical);
    });
  });

  it('does not report success while a rights-cleared UI projection target remains unresolved', async () => {
    const r2 = new MemoryR2();
    await withCloudflareRuntimeEnv({
      FOUNDATION_INGEST_TOKEN: 'typed-e2e-token',
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const response = await postTyped(requestFor('SUPPORTED', true, true));
      const body = await response.json();

      expect(response.status).toBe(202);
      expect(body.success).toBe(false);
      expect(body.partial).toBe(true);
      expect(body.retryable).toBe(true);
      expect(body.view_projection.status).toBe('UNRESOLVED');
      expect(body.view_projection.complete).toBe(false);
      expect(body.view_projection.unresolved_entity_ids).toContain(unresolvedEntityId);
      expect(canonicalKeys(r2)).toHaveLength(1);

      const retry = await postTyped(requestFor('SUPPORTED', true, true));
      const retryBody = await retry.json();
      expect(retry.status).toBe(202);
      expect(retryBody.success).toBe(false);
      expect(retryBody.canonical_ingest).toBe('ALREADY_COMMITTED');
      expect(retryBody.view_projection.unresolved_entity_ids).toContain(unresolvedEntityId);
      expect(canonicalKeys(r2)).toHaveLength(1);
    });
  });

  it('filters mixed-rights targets and resumes against the original canonical bundle', async () => {
    const r2 = new MemoryR2();
    const heldEntityId = 'ent_organization_aaaaaaaaaaaaaaaaaaaa';
    await withCloudflareRuntimeEnv({
      FOUNDATION_INGEST_TOKEN: 'typed-e2e-token',
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const first = await postTyped(requestForMixedRights());
      const firstBody = await first.json();
      expect(first.status).toBe(200);
      expect(firstBody.success).toBe(true);
      expect(firstBody.view_projection.status).toMatch(/^PASS/);
      expect(r2.keys()).toContain(`views/make-money/v1/entities/${entityId}.json`);
      expect(r2.keys()).not.toContain(`views/make-money/v1/entities/${heldEntityId}.json`);
      const canonicalAfterFirst = canonicalKeys(r2);
      expect(canonicalAfterFirst).toHaveLength(1);

      const second = await postTyped(requestForMixedRights());
      const secondBody = await second.json();
      expect(second.status).toBe(200);
      expect(secondBody.success).toBe(true);
      expect(secondBody.canonical_ingest).toBe('ALREADY_COMMITTED');
      expect(canonicalKeys(r2)).toEqual(canonicalAfterFirst);
      expect(r2.keys()).not.toContain(`views/make-money/v1/entities/${heldEntityId}.json`);
    });
  });

  it('rejects an invalid immutable typed sidecar before any canonical write', async () => {
    const r2 = new MemoryR2();
    await withCloudflareRuntimeEnv({
      FOUNDATION_INGEST_TOKEN: 'typed-e2e-token',
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const before = canonicalKeys(r2);
      const response = await postTyped(requestFor('PARTIAL'));
      const body = await response.json();
      expect(response.status).toBe(422);
      expect(body.terminal).toBe(true);
      expect(body.reason_code).toBe('SOURCE_SCHEMA_INVALID');
      expect(canonicalKeys(r2)).toEqual(before);
    });
  });
});
