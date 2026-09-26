import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as ingestTyped } from '@/app/api/foundation/ingest/typed/route';
import { GET as getBusinesses } from '@/app/api/businesses/route';
import { withCloudflareRuntimeEnv } from '@/lib/runtime/cloudflare';
import { gitBlobSha1, prepareFoundationTypedIngest } from './typed-ingest';
import { adaptFoundationDetailToFinancialEntity } from './foundation-adapter';
import type { FoundationBusinessCase } from './business-reader';
import { UniversalIntelligenceStream } from '@/features/company-inspector';
import {
  materializeMakeMoneyViews,
  readMakeMoneyViewDetail,
  rebuildMakeMoneyViewsPage,
} from './make-money-view';

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
const recordOnlyEntityId = 'ent_organization_cccccccccccccccccccc';
const evidenceId = 'ev_1234567890abcdef12345678';
const unresolvedEntityId = 'ent_organization_deadbeefdeadbeefdead';
const typedPath =
  `staging/automation/typed-records/DISCOVERY/2026/09/24/${sourceRunId}/typed-e2e-company-typed-record-set-v1.json`;
const artifactPath =
  `staging/automation/discovery/2026/09/24/20260924T223000JST-discovery-${sourceRunId}.json`;

const realSecTypedPath =
  'staging/automation/typed-records/DISCOVERY/2026/09/24/run_discovery_c9f08f33d29b6e83f303f9f77eae91c5/starwood-sreit-apollo-affordable-housing-jv-liquidity-recapitalization-2026-typed-record-set-v1.json';
const realSecArtifactPath =
  'staging/automation/discovery/2026/09/24/20260924T031000JST-discovery-run_discovery_c9f08f33d29b6e83f303f9f77eae91c5.json';
const realSecTypedBlob = '8df9b73060b67e75612a143a886dee96a66065c9';
const realSecArtifactBlob = 'dc1f5bfcbfe89f6b8e9d3083a30de13eaf833f53';
const realSecApolloEntityId = 'ent_org_4a819d424adf6b2a118f';

const real20260926TypedPath =
  'staging/automation/typed-records/VERIFY_RECONCILE/2026/09/26/run_verify_20260926T072824JST_cfdf4cf4_retry/starwood-sreit-apollo-affordable-housing-jv-liquidity-recapitalization-2026-typed-record-set-v1.json';
const real20260926ArtifactPath =
  'staging/automation/verify/2026/09/26/20260926T072824JST-verify-run_verify_20260926T072824JST_cfdf4cf4_retry.json';
const real20260926TypedBlob = '37eed9f48d341cf2c4fc37fbeeb14242708050f6';
const real20260926ArtifactBlob = '5ba60f80ab626cef329bf616b7310e8ca697925c';
const real20260926ExpectedRunId = 'run_handoff_aeaa51394b04bf63114c1b51ebf522be';
const real20260926ObservationId = 'obs_3b978269d9ec6eba82dc1f9b';
const real20260926StarwoodEntityId = 'ent_org_0e1d9b556075d9fc7f36';
const real20260926ApolloEntityId = 'ent_org_4a819d424adf6b2a118f';

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

function requestForRealSecFixture() {
  const typedText = readFileSync(
    'src/lib/foundation/fixtures/real-starwood-apollo-sec-typed-record-set-v1.json',
    'utf8',
  );
  const artifactText = readFileSync(
    'src/lib/foundation/fixtures/real-starwood-apollo-sec-collection-run-v1.json',
    'utf8',
  );
  return {
    write_authorized: true as const,
    source: {
      repository: 'salve-de/universal-foundation',
      source_ref: 'main',
      source_commit_sha: 'c271502e34c6772759c02048ca690403da51fcf1',
      typed_record_set_path: realSecTypedPath,
      typed_record_set_blob_sha: gitBlobSha1(typedText),
      source_artifact_path: realSecArtifactPath,
      source_artifact_blob_sha: gitBlobSha1(artifactText),
    },
    typed_record_set_text: typedText,
    source_artifact_text: artifactText,
  };
}

function requestForReal20260926Fixture() {
  const typedText = readFileSync(
    'src/lib/foundation/fixtures/real-starwood-apollo-2026-09-26-typed-record-set-v1.json',
    'utf8',
  );
  const artifactText = readFileSync(
    'src/lib/foundation/fixtures/real-starwood-apollo-2026-09-26-collection-run-v1.json',
    'utf8',
  );
  return {
    write_authorized: true as const,
    source: {
      repository: 'salve-de/universal-foundation',
      source_ref: 'automation-research',
      source_commit_sha: 'f72f4bbd01a055834134e9a3c141f32909510b53',
      typed_record_set_path: real20260926TypedPath,
      typed_record_set_blob_sha: gitBlobSha1(typedText),
      source_artifact_path: real20260926ArtifactPath,
      source_artifact_blob_sha: gitBlobSha1(artifactText),
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


function privateCanonicalBundle(input: {
  runId: string;
  retrievedAt: string;
  entityId?: string;
}) {
  const privateEvidenceId = 'ev_privateprivateprivateprivate';
  const targetEntityId = input.entityId || entityId;
  return {
    schema_version: 'research-bundle.v1',
    run_id: input.runId,
    retrieved_at: input.retrievedAt,
    sources: [{
      source_id: 'src.private',
      provider_name: 'Unreviewed Private Source',
      source_type: 'secondary_reporting',
      canonical_url: 'https://example.com/private',
      rights_status: 'pending_review',
      rights_policy_id: null,
    }],
    evidence: [{
      evidence_id: privateEvidenceId,
      source_id: 'src.private',
      source_url: 'https://example.com/private',
      source_type: 'secondary_reporting',
      rights_status: 'pending_review',
      rights_policy_id: null,
    }],
    entities: [{
      entity_id: targetEntityId,
      entity_type: 'organization',
      canonical_name: 'PRIVATE ENTITY MUST NOT LEAK',
      aliases: ['PRIVATE ALIAS MUST NOT LEAK'],
      canonical_identifier: null,
      domain: 'private.example',
      status: 'active',
      observed_at: input.retrievedAt,
      evidence_ids: [privateEvidenceId],
    }],
    claims: [{
      claim_id: 'cl_privateprivateprivateprivate',
      entity_ids: [targetEntityId],
      statement: 'PRIVATE CLAIM MUST NOT LEAK',
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      confidence: 1,
      occurred_at: input.retrievedAt,
      evidence_ids: [privateEvidenceId],
    }],
    metrics: [],
    money_signals: [],
    events: [],
    relationships: [],
    observations: [{
      observation_id: 'obs_privateprivateprivatepriv',
      observation_type: 'private.raw_observation.v1',
      entity_id: targetEntityId,
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      observed_at: input.retrievedAt,
      evidence_ids: [privateEvidenceId],
      text: 'PRIVATE OBSERVATION MUST NOT LEAK',
      payload: {
        secret: 'PRIVATE RAW PAYLOAD MUST NOT LEAK',
      },
    }],
    derived: [],
    quality: {
      unknowns: [],
      conflicts: [],
      warnings: [],
      schema_validation: 'PASS',
    },
  };
}

function canonicalBundleKey(runId: string, retrievedAt: string): string {
  const date = new Date(retrievedAt);
  const year = String(date.getUTCFullYear()).padStart(4, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `datasets/ds.business.research-bundles.derived/v1/${year}/${month}/${day}/${runId}.json`;
}

function publicMaterializationBundle(input: {
  runId: string;
  retrievedAt: string;
  includeEntity?: boolean;
  observationId?: string;
}) {
  return {
    schema_version: 'research-bundle.v1',
    run_id: input.runId,
    retrieved_at: input.retrievedAt,
    sources: [],
    evidence: [],
    entities: input.includeEntity ? [{
      entity_id: recordOnlyEntityId,
      entity_type: 'organization',
      canonical_name: 'Existing Public Company',
      aliases: [],
      canonical_identifier: null,
      domain: 'example.com',
      status: 'active',
      observed_at: input.retrievedAt,
      evidence_ids: [],
    }] : [],
    claims: [],
    metrics: [],
    money_signals: [],
    events: [],
    relationships: [],
    observations: input.observationId ? [{
      observation_id: input.observationId,
      observation_type: 'public_fact.v1',
      entity_id: recordOnlyEntityId,
      origin_type: 'reported',
      verification_status: 'SUPPORTED',
      observed_at: input.retrievedAt,
      evidence_ids: [],
      text: 'Public enrichment fact',
      public_payload: { value: 1 },
    }] : [],
    derived: [],
    quality: {
      unknowns: [],
      conflicts: [],
      warnings: [],
      schema_validation: 'PASS',
    },
  };
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

  it('publishes the exact real SEC Starwood/Apollo sidecar after upstream rights approval', async () => {
    const request = requestForRealSecFixture();
    expect(request.source.typed_record_set_blob_sha).toBe(realSecTypedBlob);
    expect(request.source.source_artifact_blob_sha).toBe(realSecArtifactBlob);

    const r2 = new MemoryR2();
    await withCloudflareRuntimeEnv({
      FOUNDATION_INGEST_TOKEN: 'typed-e2e-token',
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const first = await postTyped(request);
      const firstBody = await first.json();

      expect(first.status).toBe(200);
      expect(firstBody.success).toBe(true);
      expect(firstBody.mapper_version).toBe('r2-queue-mapper-v6');
      expect(firstBody.view_projection.status).toBe('PASS');
      expect(r2.keys()).toContain(
        `views/make-money/v1/entities/${realSecApolloEntityId}.json`,
      );

      const detailResponse = await getBusinesses(
        new Request(
          `http://localhost/api/businesses?foundationOnly=true&entity_id=${realSecApolloEntityId}`,
        ),
      );
      expect(detailResponse.status).toBe(200);
      const detailBody = await detailResponse.json();
      const detail = detailBody.data as FoundationBusinessCase;
      expect(JSON.stringify(detail)).toContain('41.5');
      expect(JSON.stringify(detail)).toContain('58.5');
      expect(JSON.stringify(detail)).not.toContain('$1.02 billion');
      expect(JSON.stringify(detail)).not.toContain('redeemable noncontrolling interest');

      const uiEntity = adaptFoundationDetailToFinancialEntity(detail);
      const uiHtml = renderToStaticMarkup(createElement(
        UniversalIntelligenceStream,
        { entity: uiEntity, currency: 'USD' },
      ));
      expect(uiHtml).toContain('41.5');
      expect(uiHtml).toContain('58.5');
      expect(uiHtml).not.toContain('$1.02 billion');
      expect(uiHtml).not.toContain('redeemable noncontrolling interest');

      const canonicalObject = await r2.get(canonicalKeys(r2)[0]);
      expect(canonicalObject).toBeTruthy();
      const canonicalBody = canonicalObject
        ? new Uint8Array(await canonicalObject.arrayBuffer())
        : new Uint8Array();
      const canonicalText = new TextDecoder().decode(canonicalBody);
      expect(canonicalText).toContain('$1.02 billion');
      expect(canonicalText).toContain('Class B Common Units');
      expect(canonicalText).toContain('redeemable noncontrolling interest');
    });
  });

  it('publishes the exact 2026-09-26 operational sidecar through typed ingest to both API/UI views', async () => {
    const request = requestForReal20260926Fixture();
    expect(request.source.typed_record_set_blob_sha).toBe(real20260926TypedBlob);
    expect(request.source.source_artifact_blob_sha).toBe(real20260926ArtifactBlob);

    const r2 = new MemoryR2();
    await withCloudflareRuntimeEnv({
      FOUNDATION_INGEST_TOKEN: 'typed-e2e-token',
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const first = await postTyped(request);
      const firstBody = await first.json();

      expect(first.status).toBe(200);
      expect(firstBody.success).toBe(true);
      expect(firstBody.run_id).toBe(real20260926ExpectedRunId);
      expect(firstBody.mapper_version).toBe('r2-queue-mapper-v6');
      expect(firstBody.view_projection.status).toBe('PASS');
      expect(firstBody.view_projection.complete).toBe(true);
      expect(firstBody.view_projection.unresolved_entity_ids).toEqual([]);

      for (const entityId of [
        real20260926StarwoodEntityId,
        real20260926ApolloEntityId,
      ]) {
        expect(r2.keys()).toContain(
          `views/make-money/v1/entities/${entityId}.json`,
        );

        const detailResponse = await getBusinesses(
          new Request(
            `http://localhost/api/businesses?foundationOnly=true&entity_id=${entityId}`,
          ),
        );
        expect(detailResponse.status).toBe(200);
        const detailBody = await detailResponse.json();
        const detail = detailBody.data as FoundationBusinessCase;
        const target = detail.observations.find(
          (observation) => observation.id === real20260926ObservationId,
        );
        expect(target).toBeTruthy();
        expect(target?.publicDisplay?.title).toBe(
          'Starwood SREIT / Apollo affordable-housing JV terms',
        );
        expect(target?.publicDisplay?.facts).toEqual(expect.arrayContaining([
          expect.objectContaining({
            label: 'Reported ownership — Apollo-managed funds / affiliates',
            value: 41.5,
            suffix: '%',
          }),
          expect.objectContaining({
            label: 'Reported ownership — Starwood SREIT',
            value: 58.5,
            suffix: '%',
          }),
          expect.objectContaining({
            label: 'Reported Apollo investment (USD)',
            value: 1020000000,
          }),
          expect.objectContaining({
            label: 'Reported properties (approx.)',
            value: 120,
          }),
          expect.objectContaining({
            label: 'Call-option IRR cap (years 5–10)',
            value: 7,
            suffix: '%',
          }),
          expect.objectContaining({
            label: 'Starwood asset management / operational control',
            value: true,
          }),
          expect.objectContaining({
            label: 'Proceeds repay credit facilities',
            value: true,
          }),
        ]));
        expect(target?.publicDisplay?.sourceUrls).toEqual([
          'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332741/ck0001711929-20260803.htm',
          'https://www.sec.gov/Archives/edgar/data/1711929/000119312526351388/ck0001711929-20260813.htm',
        ]);

        const serializedDetail = JSON.stringify(detail);
        expect(serializedDetail).not.toContain('rising_minimum_yield_guarantee');
        expect(serializedDetail).not.toContain('exact_joint_venture_legal_name');
        expect(serializedDetail).not.toContain('exact_apollo_investing_legal_entities');

        const uiEntity = adaptFoundationDetailToFinancialEntity(detail);
        const uiHtml = renderToStaticMarkup(createElement(
          UniversalIntelligenceStream,
          { entity: uiEntity, currency: 'USD' },
        ));
        expect(uiHtml).toContain('Starwood SREIT / Apollo affordable-housing JV terms');
        expect(uiHtml).toContain('41.5%');
        expect(uiHtml).toContain('58.5%');
        expect(uiHtml).toContain('1020000000');
        expect(uiHtml).toContain('120');
        expect(uiHtml).toContain('7%');
        expect(uiHtml).toContain('Starwood asset management / operational control');
        expect(uiHtml).toContain('Proceeds repay credit facilities');
        expect(uiHtml).toContain('https://www.sec.gov/Archives/edgar/');
        expect(uiHtml).not.toContain('rising_minimum_yield_guarantee');
        expect(uiHtml).not.toContain('exact_joint_venture_legal_name');
        expect(uiHtml).not.toContain('exact_apollo_investing_legal_entities');
      }

      const canonicalObject = await r2.get(canonicalKeys(r2)[0]);
      expect(canonicalObject).toBeTruthy();
      const canonicalBody = canonicalObject
        ? new Uint8Array(await canonicalObject.arrayBuffer())
        : new Uint8Array();
      const canonicalText = new TextDecoder().decode(canonicalBody);
      expect(canonicalText).toContain('rising_minimum_yield_guarantee');
      expect(canonicalText).toContain('exact_joint_venture_legal_name');
      expect(canonicalText).toContain('exact_apollo_investing_legal_entities');

      const firstCanonical = canonicalKeys(r2);
      const second = await postTyped(request);
      const secondBody = await second.json();
      expect(second.status).toBe(200);
      expect(secondBody.success).toBe(true);
      expect(secondBody.canonical_ingest).toBe('ALREADY_COMMITTED');
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


describe('public identity for record-only materialization', () => {
  it('updates an existing public entity view from a record-only enrichment bundle', async () => {
    const r2 = new MemoryR2();
    await withCloudflareRuntimeEnv({
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const seed = await materializeMakeMoneyViews(publicMaterializationBundle({
        runId: 'run_public_identity_seed',
        retrievedAt: '2026-09-24T10:00:00Z',
        includeEntity: true,
      }));
      expect(seed.complete).toBe(true);
      expect(seed.unresolved_entity_ids).toEqual([]);

      const enrichment = await materializeMakeMoneyViews(publicMaterializationBundle({
        runId: 'run_public_identity_enrichment',
        retrievedAt: '2026-09-24T11:00:00Z',
        observationId: 'obs_aaaaaaaaaaaaaaaaaaaaaaaa',
      }));
      expect(enrichment.complete).toBe(true);
      expect(enrichment.unresolved_entity_ids).toEqual([]);

      const detail = await readMakeMoneyViewDetail(recordOnlyEntityId);
      expect(detail).not.toBeNull();
      expect(detail?.name).toBe('Existing Public Company');
      expect(detail?.observations).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'obs_aaaaaaaaaaaaaaaaaaaaaaaa',
          kind: 'public_fact.v1',
        }),
      ]));
    });
  });

  it('does not merge rights-held pending canonical history into an existing public view', async () => {
    const r2 = new MemoryR2();
    const privateRunId = 'run_private_pending_history_001';
    const privateRetrievedAt = '2026-09-24T13:00:00Z';
    const privateBundle = privateCanonicalBundle({
      runId: privateRunId,
      retrievedAt: privateRetrievedAt,
      entityId: recordOnlyEntityId,
    });
    const privateBundleKey = canonicalBundleKey(
      privateRunId,
      privateRetrievedAt,
    );

    await r2.put(
      privateBundleKey,
      new TextEncoder().encode(`${JSON.stringify(privateBundle)}\n`),
    );
    await r2.put(
      `views/make-money/v1/_unresolved-by-entity/${encodeURIComponent(recordOnlyEntityId)}/${encodeURIComponent(privateRunId)}.json`,
      new TextEncoder().encode(JSON.stringify({
        schema_version: 'make-money-unresolved-entity.v1',
        entity_id: recordOnlyEntityId,
        run_id: privateRunId,
        bundle_key: privateBundleKey,
        retrieved_at: privateRetrievedAt,
        status: 'PENDING',
        resolved_at: null,
        updated_at: '2026-09-24T13:01:00Z',
      })),
    );

    await withCloudflareRuntimeEnv({
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const seed = await materializeMakeMoneyViews(publicMaterializationBundle({
        runId: 'run_safe_public_seed',
        retrievedAt: '2026-09-24T14:00:00Z',
        includeEntity: true,
      }));
      expect(seed.complete).toBe(false);
      expect(seed.unresolved_entity_ids).toContain(recordOnlyEntityId);

      const detail = await readMakeMoneyViewDetail(recordOnlyEntityId);
      expect(detail).not.toBeNull();
      const serialized = JSON.stringify(detail);
      expect(serialized).not.toContain('PRIVATE ENTITY MUST NOT LEAK');
      expect(serialized).not.toContain('PRIVATE CLAIM MUST NOT LEAK');
      expect(serialized).not.toContain('PRIVATE OBSERVATION MUST NOT LEAK');
      expect(serialized).not.toContain('PRIVATE RAW PAYLOAD MUST NOT LEAK');

      const unresolvedObject = await r2.get(
        `views/make-money/v1/_unresolved-by-entity/${encodeURIComponent(recordOnlyEntityId)}/${encodeURIComponent(privateRunId)}.json`,
      );
      expect(unresolvedObject).toBeTruthy();
      const unresolvedBody = unresolvedObject
        ? new Uint8Array(await unresolvedObject.arrayBuffer())
        : new Uint8Array();
      expect(JSON.parse(new TextDecoder().decode(unresolvedBody)).status)
        .toBe('PENDING');
    });
  });

  it('keeps record-only enrichment unresolved when only private canonical identity exists', async () => {
    const r2 = new MemoryR2();
    await r2.put(
      `datasets/ds.business.entities.core/v1/entities/${recordOnlyEntityId}.json`,
      new TextEncoder().encode(JSON.stringify({
        entity_id: recordOnlyEntityId,
        entity_type: 'organization',
        canonical_name: 'Private Canonical Company',
        aliases: [],
        canonical_identifier: null,
        domain: 'private.example',
        status: 'active',
        observed_at: '2026-09-24T09:00:00Z',
        evidence_ids: [],
      })),
    );

    await withCloudflareRuntimeEnv({
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const report = await materializeMakeMoneyViews(publicMaterializationBundle({
        runId: 'run_private_identity_must_not_cross',
        retrievedAt: '2026-09-24T12:00:00Z',
        observationId: 'obs_bbbbbbbbbbbbbbbbbbbbbbbb',
      }));

      expect(report.complete).toBe(false);
      expect(report.unresolved_entity_ids).toEqual([recordOnlyEntityId]);
      expect(r2.keys()).not.toContain(
        `views/make-money/v1/entities/${recordOnlyEntityId}.json`,
      );
    });
  });
});


describe('rights parity across normal ingest, unresolved replay and rebuild', () => {
  it('rebuild materializes only the current rights-approved projection from private canonical', async () => {
    const request = requestFor('SUPPORTED', true);
    const prepared = prepareFoundationTypedIngest(request);
    const bundle = prepared.bundle as Record<string, unknown>;
    const runId = String(bundle.run_id);
    const retrievedAt = String(bundle.retrieved_at);
    const key = canonicalBundleKey(runId, retrievedAt);
    const r2 = new MemoryR2();
    await r2.put(
      key,
      new TextEncoder().encode(`${JSON.stringify(bundle)}\n`),
    );

    await withCloudflareRuntimeEnv({
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const report = await rebuildMakeMoneyViewsPage(5);
      expect(report.processed_this_run).toBe(1);
      expect(report.materialized_entities).toBe(1);
      expect(r2.keys()).toContain(
        `views/make-money/v1/entities/${entityId}.json`,
      );

      const detailResponse = await getBusinesses(
        new Request(
          `http://localhost/api/businesses?foundationOnly=true&entity_id=${entityId}`,
        ),
      );
      const detail = await detailResponse.json();
      const serialized = JSON.stringify(detail.data);
      expect(detailResponse.status).toBe(200);
      expect(serialized).toContain('annual revenue of $123 million');
      expect(serialized).not.toContain('must_survive_transport');
      expect(serialized).not.toContain('urn:test:typed-e2e:v1');
      expect(serialized).not.toContain('DISCOVERY');
    });
  });

  it('unresolved replay materializes an approved projection, not the private canonical bundle', async () => {
    const request = requestFor('SUPPORTED', true);
    const prepared = prepareFoundationTypedIngest(request);
    const bundle = prepared.bundle as Record<string, unknown>;
    const runId = String(bundle.run_id);
    const retrievedAt = String(bundle.retrieved_at);
    const bundleKey = canonicalBundleKey(runId, retrievedAt);
    const r2 = new MemoryR2();

    await r2.put(
      bundleKey,
      new TextEncoder().encode(`${JSON.stringify(bundle)}\n`),
    );
    await r2.put(
      'views/make-money/v1/_rebuild-state.json',
      new TextEncoder().encode(JSON.stringify({
        schema_version: 'make-money-view-rebuild-state.v1',
        complete: true,
        cursor: null,
        processed_bundles: 1,
        updated_at: '2026-09-24T18:01:00Z',
      })),
    );
    await r2.put(
      `views/make-money/v1/_projection-progress/${encodeURIComponent(runId)}.json`,
      new TextEncoder().encode(JSON.stringify({
        schema_version: 'make-money-view-projection-progress.v2',
        run_id: runId,
        bundle_key: bundleKey,
        retrieved_at: retrievedAt,
        next_index: 1,
        total_targets: 1,
        complete: false,
        unresolved_entity_ids: [entityId],
        updated_at: '2026-09-24T18:01:00Z',
      })),
    );

    await withCloudflareRuntimeEnv({
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const report = await rebuildMakeMoneyViewsPage(5);
      expect(report.unresolved_replayed).toBe(1);
      expect(r2.keys()).toContain(
        `views/make-money/v1/entities/${entityId}.json`,
      );

      const detailResponse = await getBusinesses(
        new Request(
          `http://localhost/api/businesses?foundationOnly=true&entity_id=${entityId}`,
        ),
      );
      const detail = await detailResponse.json();
      const serialized = JSON.stringify(detail.data);
      expect(detailResponse.status).toBe(200);
      expect(serialized).not.toContain('must_survive_transport');
      expect(serialized).not.toContain('urn:test:typed-e2e:v1');
      expect(serialized).not.toContain('DISCOVERY');
    });
  });


  it('rebuild re-applies rights and never materializes a private canonical bundle', async () => {
    const r2 = new MemoryR2();
    const runId = 'run_private_rebuild_001';
    const retrievedAt = '2026-09-24T16:00:00Z';
    const bundle = privateCanonicalBundle({ runId, retrievedAt });
    const key = canonicalBundleKey(runId, retrievedAt);
    await r2.put(
      key,
      new TextEncoder().encode(`${JSON.stringify(bundle)}\n`),
    );

    await withCloudflareRuntimeEnv({
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const report = await rebuildMakeMoneyViewsPage(5);

      expect(report.processed_this_run).toBe(1);
      expect(report.materialized_entities).toBe(0);
      expect(r2.keys()).not.toContain(
        `views/make-money/v1/entities/${entityId}.json`,
      );

      const publicText = r2.keys()
        .filter((candidate) => candidate.startsWith('views/make-money/v1/entities/'))
        .join('\n');
      expect(publicText).not.toContain('PRIVATE');
    });
  });

  it('unresolved replay re-applies rights and never materializes private canonical content', async () => {
    const r2 = new MemoryR2();
    const runId = 'run_private_unresolved_replay_001';
    const retrievedAt = '2026-09-24T17:00:00Z';
    const bundle = privateCanonicalBundle({ runId, retrievedAt });
    const bundleKey = canonicalBundleKey(runId, retrievedAt);

    await r2.put(
      bundleKey,
      new TextEncoder().encode(`${JSON.stringify(bundle)}\n`),
    );
    await r2.put(
      'views/make-money/v1/_rebuild-state.json',
      new TextEncoder().encode(JSON.stringify({
        schema_version: 'make-money-view-rebuild-state.v1',
        complete: true,
        cursor: null,
        processed_bundles: 1,
        updated_at: '2026-09-24T17:01:00Z',
      })),
    );
    await r2.put(
      `views/make-money/v1/_projection-progress/${encodeURIComponent(runId)}.json`,
      new TextEncoder().encode(JSON.stringify({
        schema_version: 'make-money-view-projection-progress.v2',
        run_id: runId,
        bundle_key: bundleKey,
        retrieved_at: retrievedAt,
        next_index: 1,
        total_targets: 1,
        complete: false,
        unresolved_entity_ids: [entityId],
        updated_at: '2026-09-24T17:01:00Z',
      })),
    );

    await withCloudflareRuntimeEnv({
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const report = await rebuildMakeMoneyViewsPage(5);

      expect(report.complete).toBe(true);
      expect(report.unresolved_replayed).toBe(0);
      expect(r2.keys()).not.toContain(
        `views/make-money/v1/entities/${entityId}.json`,
      );
    });
  });

  it('normal typed ingest remains rights-held for the same unreviewed source class', async () => {
    const r2 = new MemoryR2();
    await withCloudflareRuntimeEnv({
      FOUNDATION_INGEST_TOKEN: 'typed-e2e-token',
      FOUNDATION_R2_LAKE_BUCKET: 'foundation-lake',
      FOUNDATION_R2_LAKE: r2,
    }, async () => {
      const response = await postTyped(requestFor());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.view_projection.status).toBe('RIGHTS_HELD');
      expect(r2.keys()).not.toContain(
        `views/make-money/v1/entities/${entityId}.json`,
      );
    });
  });
});
