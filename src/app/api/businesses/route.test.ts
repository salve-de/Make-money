import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listObjects: vi.fn(),
  readObject: vi.fn(),
  viewReady: vi.fn(),
  readThroughDetail: vi.fn(),
}));

vi.mock('@/lib/foundation/make-money-view', () => ({
  isMakeMoneyViewBackfillComplete: mocks.viewReady,
    readMakeMoneyValuePage: vi.fn(),
  readMakeMoneyViewDetail: mocks.readThroughDetail,
}));

vi.mock('@/lib/foundation/schema', () => ({
  parseFoundationBusinessCase: (value: unknown) => value,
  parseFoundationValuePage: (value: unknown) => value,
}));

vi.mock('@/lib/company-access/public-entity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/company-access/public-entity')>();
  return {
    ...actual,
    isPublishableEntity: () => true,
    publicEntity: (value: unknown) => value,
    publicFoundationData: (value: unknown) => value,
    publicSummaryEntity: (value: unknown) => value,
  };
});

vi.mock('@/lib/foundation/foundation-adapter', () => ({
  adaptFoundationDetailToFinancialEntity: (value: unknown) => value,
  adaptFoundationSummaryToFinancialEntity: (value: unknown) => value,
  isFoundationDossierReady: () => false,
}));

vi.mock('@/lib/company-access/local-entity-index', () => ({
  findCachedPublishableEntity: vi.fn(),
  readCachedLocalPublishableEntities: vi.fn(),
}));

vi.mock('@/lib/foundation/business-reader', () => ({
  readFoundationBusinessCase: vi.fn(),
}));

vi.mock('@/platform/data/mockLedgerData', () => ({
  INSTITUTIONAL_ENTITIES: [],
}));

vi.mock('@/lib/foundation/immutable-dossier-pipeline', () => ({
  CloudflareR2BlobStorage: class {},
}));

vi.mock('@/lib/foundation/dossier-projection', () => ({
  computeDossierContentHash: () => 'hash',
  getDossierStoragePath: () => 'path',
}));

vi.mock('@/lib/foundation/dataset-registry', () => ({
  foundationDataset: () => ({ datasetId: 'dataset' }),
}));

vi.mock('@/shared/financial-entity-schema', () => ({
  parseFinancialEntity: (value: unknown) => value,
}));

vi.mock('@/lib/storage/r2', () => ({
  getFoundationBucketAsync: vi.fn().mockResolvedValue('foundation-lake'),
  listR2Objects: mocks.listObjects,
  readR2Object: mocks.readObject,
}));

import { GET } from './route';

function summary(id: string, name: string) {
  return {
    id,
    name,
    entityType: 'company',
    aliases: [],
    canonicalIdentifier: null,
    domain: null,
    status: 'active',
    observedAt: null,
    evidenceIds: [],
    valueProfile: {
      tier: 'USEFUL',
      score: 1,
      labels: [],
      businessSignal: null,
      painSignal: null,
      moneySignal: null,
      tractionSignal: null,
      mechanismSignal: null,
      timeSignal: null,
      counts: { claims: 0, metrics: 0, moneySignals: 0, events: 0, observations: 0, derived: 0, evidence: 0 },
    },
  };
}

describe('Foundation detail public Observation wire boundary', () => {
  beforeEach(() => {
    mocks.viewReady.mockResolvedValue(true);
    mocks.listObjects.mockReset();
    mocks.readObject.mockReset();
    mocks.readThroughDetail.mockReset();
  });

  function detailWithObservation(observation: Record<string, unknown>) {
    return {
      ...summary('ent_wire_boundary', 'Wire Boundary Company'),
      evidenceIds: ['ev_wire'],
      claims: [],
      metrics: [],
      moneySignals: [],
      events: [],
      relationships: [],
      observations: [observation],
      derived: [],
      bundlesScanned: 1,
      bundleObjectsListed: 1,
      bundleScanComplete: true,
    };
  }

  it('does not put raw payload, observer, schema ref, transport metadata, or collection metadata on the API wire', async () => {
    mocks.readThroughDetail.mockResolvedValue(detailWithObservation({
      id: 'obs_raw_only',
      kind: 'business_model.raw',
      text: 'Raw-only semantic text',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      observedAt: '2026-09-24T13:29:00Z',
      collectionTier: 'CORE',
      collectionChannel: 'web',
      observer: 'DISCOVERY',
      payloadSchemaRef: 'urn:internal:schema',
      payload: { raw_secret: 'do-not-expose' },
      evidenceIds: ['ev_wire'],
      transport_typed_record_set_v1: { secret: true },
    }));

    const response = await GET(new Request('http://localhost/api/businesses?entity_id=ent_wire_boundary'));
    const body = await response.json();
    expect(response.status).toBe(200);
    const observation = body.data.observations[0];
    expect(observation).toEqual({
      id: 'obs_raw_only',
      kind: 'business_model.raw',
      text: 'Raw-only semantic text',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      observedAt: '2026-09-24T13:29:00Z',
      evidenceIds: ['ev_wire'],
    });
    expect(JSON.stringify(body)).not.toContain('do-not-expose');
    expect(JSON.stringify(body)).not.toContain('DISCOVERY');
    expect(JSON.stringify(body)).not.toContain('urn:internal:schema');
    expect(JSON.stringify(body)).not.toContain('transport_typed_record_set_v1');
  });

  it('returns only an explicit bounded publicPayload and omits internal metadata', async () => {
    mocks.readThroughDetail.mockResolvedValue(detailWithObservation({
      id: 'obs_public',
      kind: 'business_model.public',
      text: 'Public semantic text',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      observedAt: '2026-09-24T13:29:00Z',
      observer: 'DISCOVERY',
      payloadSchemaRef: 'urn:internal:schema',
      payload: { raw_secret: 'do-not-expose' },
      publicPayload: {
        amount: 123000000,
        nested: { public_fact: true },
      },
      evidenceIds: ['ev_wire'],
    }));

    const response = await GET(new Request('http://localhost/api/businesses?entity_id=ent_wire_boundary'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.observations[0]).toEqual({
      id: 'obs_public',
      kind: 'business_model.public',
      text: 'Public semantic text',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      observedAt: '2026-09-24T13:29:00Z',
      evidenceIds: ['ev_wire'],
      publicPayload: {
        amount: 123000000,
        nested: { public_fact: true },
      },
    });
    expect(JSON.stringify(body)).not.toContain('raw_secret');
    expect(JSON.stringify(body)).not.toContain('DISCOVERY');
    expect(JSON.stringify(body)).not.toContain('urn:internal:schema');
  });

  it('drops an oversized publicPayload from the API wire instead of truncating canonical data', async () => {
    mocks.readThroughDetail.mockResolvedValue(detailWithObservation({
      id: 'obs_too_large',
      kind: 'business_model.public',
      text: 'Public text survives',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      observedAt: '2026-09-24T13:29:00Z',
      publicPayload: { tooLong: 'x'.repeat(4097) },
      evidenceIds: ['ev_wire'],
    }));

    const response = await GET(new Request('http://localhost/api/businesses?entity_id=ent_wire_boundary'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.observations[0].text).toBe('Public text survives');
    expect(body.data.observations[0]).not.toHaveProperty('publicPayload');
  });
});

describe('Foundation bounded search', () => {
  beforeEach(() => {
    mocks.viewReady.mockResolvedValue(true);
    mocks.readThroughDetail.mockClear();
    mocks.readThroughDetail.mockResolvedValue(null);
    mocks.listObjects.mockImplementation(async ({ cursor }: { cursor?: string }) => cursor
      ? { objects: [{ key: 'views/make-money/v1/entities/target.json' }], truncated: false, cursor: null }
      : { objects: [{ key: 'views/make-money/v1/entities/other.json' }], truncated: true, cursor: 'page-2' });
    mocks.readObject.mockImplementation(async (_bucket: string, key: string) => ({
      body: new TextEncoder().encode(JSON.stringify({
        summary: key.endsWith('/target.json') ? summary('ent_target', 'Target Company') : summary('ent_other', 'Other Company'),
      })),
    }));
  });

  it('finds a record outside the first R2 page without scanning research bundles', async () => {
    const firstResponse = await GET(new Request('http://localhost/api/businesses?foundationOnly=true&q=target'));
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(firstBody).toMatchObject({ source: 'foundation_lake', count: 0, total: null, searchComplete: false, hasMore: true });

    const response = await GET(new Request(`http://localhost/api/businesses?foundationOnly=true&q=target&cursor=${encodeURIComponent(firstBody.nextCursor)}`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({ source: 'foundation_lake', count: 1, total: null, searchComplete: true, hasMore: false });
    expect(body.data.map((row: { id: string }) => row.id)).toEqual(['ent_target']);
    expect(mocks.listObjects).toHaveBeenCalledTimes(2);
    expect(mocks.readObject).toHaveBeenCalledTimes(2);
  });

  it('accepts the raw cursor form used by the existing Foundation client', async () => {
    const firstResponse = await GET(new Request('http://localhost/api/businesses?foundationOnly=true&q=target'));
    const firstBody = await firstResponse.json();
    const rawCursor = firstBody.nextCursor.replace(/^foundation-search-v1:/, '');

    const response = await GET(new Request(`http://localhost/api/businesses?foundationOnly=true&q=target&cursor=${encodeURIComponent(rawCursor)}`));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.map((row: { id: string }) => row.id)).toEqual(['ent_target']);
  });

  it('bounds the R2 object page to the response limit so matching rows are not skipped', async () => {
    const first = summary('ent_first', 'Target First');
    const second = summary('ent_second', 'Target Second');
    mocks.listObjects.mockImplementation(async ({ cursor, limit }: { cursor?: string; limit: number }) => {
      expect(limit).toBe(1);
      return cursor
        ? { objects: [{ key: 'views/make-money/v1/entities/second.json' }], truncated: false, cursor: null }
        : { objects: [{ key: 'views/make-money/v1/entities/first.json' }], truncated: true, cursor: 'page-2' };
    });
    mocks.readObject.mockImplementation(async (_bucket: string, key: string) => ({
      body: new TextEncoder().encode(JSON.stringify({ summary: key.endsWith('/first.json') ? first : second })),
    }));

    const firstResponse = await GET(new Request('http://localhost/api/businesses?foundationOnly=true&q=target&limit=1'));
    const firstBody = await firstResponse.json();
    expect(firstResponse.status).toBe(200);
    expect(firstBody.data.map((row: { id: string }) => row.id)).toEqual(['ent_first']);
    expect(firstBody.hasMore).toBe(true);

    const secondResponse = await GET(new Request(`http://localhost/api/businesses?foundationOnly=true&q=target&limit=1&cursor=${encodeURIComponent(firstBody.nextCursor)}`));
    const secondBody = await secondResponse.json();
    expect(secondResponse.status).toBe(200);
    expect(secondBody.data.map((row: { id: string }) => row.id)).toEqual(['ent_second']);
    expect(secondBody.hasMore).toBe(false);
  });

  it('searches a read-time resolved name when a legacy materialized summary stores the entity ID', async () => {
    const stored = summary('ent_company_0123456789abcdef0123', 'ent_company_0123456789abcdef0123');
    const resolved = {
      ...stored,
      name: 'ECA Texas multifamily portfolio / Elowen Capital',
      claims: [], metrics: [], moneySignals: [], events: [], relationships: [], observations: [], derived: [],
      bundlesScanned: 1, bundleObjectsListed: 1, bundleScanComplete: true,
    };
    mocks.listObjects.mockResolvedValue({
      objects: [{ key: 'views/make-money/v1/entities/legacy.json' }], truncated: false, cursor: null,
    });
    mocks.readObject.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({ summary: stored, detail: stored })),
    });
    mocks.readThroughDetail.mockResolvedValue(resolved);

    const response = await GET(new Request('http://localhost/api/businesses?foundationOnly=true&q=ECA%20Texas%20multifamily%20portfolio'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.map((row: { name: string }) => row.name)).toEqual(['ECA Texas multifamily portfolio / Elowen Capital']);
    expect(mocks.readThroughDetail).toHaveBeenCalledWith('ent_company_0123456789abcdef0123');
  });

  it('rejects an oversized search before touching R2', async () => {
    const response = await GET(new Request(`http://localhost/api/businesses?foundationOnly=true&q=${'x'.repeat(201)}`));
    expect(response.status).toBe(400);
    expect(mocks.listObjects).not.toHaveBeenCalled();
  });
});
