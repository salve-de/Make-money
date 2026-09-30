import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  foundationBucket: vi.fn().mockResolvedValue('foundation-lake'),
  listObjects: vi.fn(),
  readObject: vi.fn(),
  viewReady: vi.fn(),
  latestRelease: vi.fn(),
  readThroughDetail: vi.fn(),
  readPublicSummaryById: vi.fn(),
  readValuePage: vi.fn(),
  dossierReady: vi.fn(),
  parseBusinessCase: vi.fn((value: unknown) => value),
  adaptDetail: vi.fn((value: unknown) => value),
  computeHash: vi.fn(() => 'hash'),
  curatedFind: vi.fn(),
  curatedList: vi.fn(),
}));

vi.mock('@/lib/foundation/make-money-view', () => ({
  assertMakeMoneyValuePage: vi.fn(),
  isMakeMoneyViewBackfillComplete: mocks.viewReady,
  mapServingReads: async <T, R>(items: readonly T[], read: (item: T) => Promise<R>): Promise<R[]> =>
    Promise.all(items.map(read)),
  readMakeMoneyPublicEntitySummaryById: mocks.readPublicSummaryById,
  readMakeMoneyValuePage: mocks.readValuePage,
  readMakeMoneyViewDetail: mocks.readThroughDetail,
  selectNewArrivalPromotionIds: (entityIds: readonly string[], knownIds: ReadonlySet<string>) =>
    entityIds.filter((id) => !knownIds.has(id)).slice(0, 10),
}));

vi.mock('@/lib/foundation/new-arrivals-index', () => ({
  readIndexedNewArrivalsRelease: mocks.latestRelease,
}));

vi.mock('@/lib/foundation/schema', () => ({
  parseFoundationBusinessCase: mocks.parseBusinessCase,
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
  adaptFoundationDetailToFinancialEntity: mocks.adaptDetail,
  adaptFoundationSummaryToFinancialEntity: (value: unknown) => value,
  isFoundationDossierReady: mocks.dossierReady,
}));

vi.mock('@/lib/company-access/local-entity-index', () => ({
  findCachedPublishableEntity: mocks.curatedFind,
  readCachedLocalPublishableEntities: mocks.curatedList,
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
  computeDossierContentHash: mocks.computeHash,
  getDossierStoragePath: () => 'path',
}));

vi.mock('@/lib/foundation/dataset-registry', () => ({
  foundationDataset: () => ({ datasetId: 'dataset' }),
}));

vi.mock('@/shared/financial-entity-schema', () => ({
  parseFinancialEntity: (value: unknown) => value,
}));

vi.mock('@/lib/storage/r2', () => ({
  getFoundationBucketAsync: mocks.foundationBucket,
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
    mocks.readValuePage.mockReset();
    mocks.dossierReady.mockReset();
    mocks.dossierReady.mockReturnValue(false);
    mocks.parseBusinessCase.mockReset();
    mocks.parseBusinessCase.mockImplementation((value: unknown) => value);
    mocks.adaptDetail.mockReset();
    mocks.adaptDetail.mockImplementation((value: unknown) => value);
    mocks.computeHash.mockReset();
    mocks.computeHash.mockReturnValue('hash');
    mocks.curatedFind.mockReset();
    mocks.curatedFind.mockResolvedValue(null);
    mocks.curatedList.mockReset();
    mocks.curatedList.mockResolvedValue([]);
  });

  function detailWithObservation(entityId: string, observation: Record<string, unknown>) {
    return {
      ...summary(entityId, 'Wire Boundary Company'),
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
    mocks.readThroughDetail.mockResolvedValue(detailWithObservation('ent_wire_raw', {
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

    const response = await GET(new Request('http://localhost/api/businesses?entity_id=ent_wire_raw'));
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
    mocks.readThroughDetail.mockResolvedValue(detailWithObservation('ent_wire_public', {
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

    const response = await GET(new Request('http://localhost/api/businesses?entity_id=ent_wire_public'));
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
    mocks.readThroughDetail.mockResolvedValue(detailWithObservation('ent_wire_large', {
      id: 'obs_too_large',
      kind: 'business_model.public',
      text: 'Public text survives',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      observedAt: '2026-09-24T13:29:00Z',
      publicPayload: { tooLong: 'x'.repeat(4097) },
      evidenceIds: ['ev_wire'],
    }));

    const response = await GET(new Request('http://localhost/api/businesses?entity_id=ent_wire_large'));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data.observations[0].text).toBe('Public text survives');
    expect(body.data.observations[0]).not.toHaveProperty('publicPayload');
  });
});

describe('Foundation detail CPU boundary', () => {
  beforeEach(() => {
    mocks.readThroughDetail.mockReset();
    mocks.dossierReady.mockReset();
    mocks.dossierReady.mockReturnValue(false);
    mocks.parseBusinessCase.mockReset();
    mocks.parseBusinessCase.mockImplementation((value: unknown) => value);
    mocks.adaptDetail.mockReset();
    mocks.adaptDetail.mockImplementation((value: unknown) => value);
    mocks.computeHash.mockReset();
    mocks.computeHash.mockReturnValue('hash');
    mocks.curatedFind.mockReset();
    mocks.curatedFind.mockResolvedValue(null);
    mocks.curatedList.mockReset();
    mocks.curatedList.mockResolvedValue([]);
  });

  function businessCase(id: string, name = 'Foundation Company') {
    return {
      ...summary(id, name),
      claims: [],
      metrics: [],
      moneySignals: [],
      events: [],
      relationships: [],
      observations: [],
      derived: [],
      bundlesScanned: 1,
      bundleObjectsListed: 1,
      bundleScanComplete: true,
    };
  }

  it('serves foundationOnly detail without touching curated lookup', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_foundation_only'));

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_foundation_only'
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('foundation_lake');
    expect(mocks.curatedFind).not.toHaveBeenCalled();
    expect(mocks.curatedList).not.toHaveBeenCalled();
  });

  it('serves the fresh R2 detail on the next request instead of a 60-second stale copy', async () => {
    const makeDetail = (text: string) => ({
      ...businessCase('ent_r2_refresh'),
      observations: [{
        id: 'obs_r2_refresh',
        kind: 'business_model.refresh',
        text,
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        observedAt: '2026-09-24T13:29:00Z',
        evidenceIds: [],
      }],
    });
    mocks.readThroughDetail
      .mockResolvedValueOnce(makeDetail('First R2 version'))
      .mockResolvedValueOnce(makeDetail('Updated R2 version'));

    const firstResponse = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_r2_refresh'
    ));
    const secondResponse = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_r2_refresh'
    ));
    const first = await firstResponse.json();
    const second = await secondResponse.json();

    expect(firstResponse.status).toBe(200);
    expect(first.data.observations[0].text).toBe('First R2 version');
    expect(secondResponse.status).toBe(200);
    expect(second.data.observations[0].text).toBe('Updated R2 version');
    expect(mocks.readThroughDetail).toHaveBeenCalledTimes(2);
  });

  it('does not serve a previous detail after the current R2 read fails', async () => {
    mocks.readThroughDetail
      .mockResolvedValueOnce(businessCase('ent_r2_no_stale'))
      .mockRejectedValueOnce(new Error('R2 transient failure'))
      .mockRejectedValueOnce(new Error('R2 persistent failure'));

    const first = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_r2_no_stale'
    ));
    const second = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_r2_no_stale'
    ));

    expect(first.status).toBe(200);
    expect(second.status).toBe(503);
    expect(mocks.readThroughDetail).toHaveBeenCalledTimes(3);
  });

  it('returns 404 for missing foundationOnly detail without loading curated fallback', async () => {
    mocks.readThroughDetail.mockResolvedValue(null);

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_missing'
    ));

    expect(response.status).toBe(404);
    expect(mocks.curatedFind).not.toHaveBeenCalled();
    expect(mocks.curatedList).not.toHaveBeenCalled();
  });

  it('retries one transient Foundation detail read before returning foundationOnly success', async () => {
    mocks.readThroughDetail
      .mockRejectedValueOnce(new Error('R2 transient failure'))
      .mockResolvedValueOnce(businessCase('ent_r2_retry'));

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_r2_retry'
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('foundation_lake');
    expect(mocks.readThroughDetail).toHaveBeenCalledTimes(2);
    expect(mocks.curatedFind).not.toHaveBeenCalled();
    expect(mocks.curatedList).not.toHaveBeenCalled();
  });

  it('returns 503 after two Foundation detail read failures without touching curated fallback', async () => {
    mocks.readThroughDetail.mockRejectedValue(new Error('R2 persistent failure'));

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_r2_error'
    ));

    expect(response.status).toBe(503);
    expect(mocks.readThroughDetail).toHaveBeenCalledTimes(2);
    expect(mocks.curatedFind).not.toHaveBeenCalled();
    expect(mocks.curatedList).not.toHaveBeenCalled();
  });

  it('falls back to curated once when normal detail parsing throws', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_parse_failure'));
    mocks.parseBusinessCase.mockImplementationOnce(() => {
      throw new Error('invalid Foundation projection');
    });
    mocks.curatedFind.mockResolvedValue({
      id: 'ent_parse_failure',
      name: 'Curated Parse Fallback',
      latestDossierHash: 'b'.repeat(64),
      sourceRevision: 2,
    });

    const response = await GET(new Request(
      'http://localhost/api/businesses?entity_id=ent_parse_failure'
    ));

    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe('local_fallback');
    expect(mocks.curatedFind).toHaveBeenCalledTimes(1);
  });

  it('returns 503 on foundationOnly parsing failure without curated fallback', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_parse_failure_only'));
    mocks.parseBusinessCase.mockImplementationOnce(() => {
      throw new Error('invalid Foundation projection');
    });

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_parse_failure_only'
    ));

    expect(response.status).toBe(503);
    expect(mocks.curatedFind).not.toHaveBeenCalled();
  });

  it('falls back to curated once when ready Foundation response generation throws', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_hash_failure'));
    mocks.dossierReady.mockReturnValue(true);
    mocks.computeHash.mockImplementationOnce(() => {
      throw new Error('hash generation failure');
    });
    mocks.curatedFind.mockResolvedValue({
      id: 'ent_hash_failure',
      name: 'Curated Hash Fallback',
      latestDossierHash: 'c'.repeat(64),
      sourceRevision: 3,
    });

    const response = await GET(new Request(
      'http://localhost/api/businesses?entity_id=ent_hash_failure'
    ));

    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe('local_fallback');
    expect(mocks.curatedFind).toHaveBeenCalledTimes(1);
  });

  it('returns 503 on foundationOnly response-generation failure without curated fallback', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_hash_failure_only'));
    mocks.computeHash.mockImplementationOnce(() => {
      throw new Error('hash generation failure');
    });

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&entity_id=ent_hash_failure_only'
    ));

    expect(response.status).toBe(503);
    expect(mocks.curatedFind).not.toHaveBeenCalled();
  });

  it('skips curated lookup when Foundation dossier is already ready', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_ready'));
    mocks.dossierReady.mockReturnValue(true);

    const response = await GET(new Request(
      'http://localhost/api/businesses?entity_id=ent_ready'
    ));

    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe('foundation_lake');
    expect(mocks.curatedFind).not.toHaveBeenCalled();
  });

  it('公開版の目録にある ID は、Foundation が準備済みでも公開版（curated）を返す', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_37signals_T6M1R8QK', 'Foundation Candidate'));
    mocks.dossierReady.mockReturnValue(true);
    mocks.curatedFind.mockResolvedValue({ id: 'ent_37signals_T6M1R8QK', name: 'Released', latestDossierHash: 'a'.repeat(64), sourceRevision: 1 });

    const response = await GET(new Request('http://localhost/api/businesses?entity_id=ent_37signals_T6M1R8QK'));

    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe('local_fallback');
    expect(mocks.readThroughDetail).not.toHaveBeenCalled();
  });

  it('公開版の目録にある ID の foundationOnly は 404 にして、通常の取得へ回す', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_37signals_T6M1R8QK', 'Foundation Candidate'));
    mocks.dossierReady.mockReturnValue(true);

    const response = await GET(new Request('http://localhost/api/businesses?foundationOnly=true&entity_id=ent_37signals_T6M1R8QK'));

    expect(response.status).toBe(404);
    expect(mocks.readThroughDetail).not.toHaveBeenCalled();
  });

  it('preserves curated precedence for a partial Foundation dossier and looks it up once', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_overlap', 'Foundation Partial'));
    mocks.dossierReady.mockReturnValue(false);
    mocks.curatedFind.mockResolvedValue({
      id: 'ent_overlap',
      name: 'Curated Entity',
      latestDossierHash: 'a'.repeat(64),
      sourceRevision: 7,
    });

    const response = await GET(new Request(
      'http://localhost/api/businesses?entity_id=ent_overlap'
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('local_fallback');
    expect(mocks.curatedFind).toHaveBeenCalledTimes(1);
    expect(mocks.curatedFind).toHaveBeenCalledWith('ent_overlap');
  });

  it('falls back to a publishable partial Foundation dossier after one curated miss', async () => {
    mocks.readThroughDetail.mockResolvedValue(businessCase('ent_partial'));
    mocks.dossierReady.mockReturnValue(false);
    mocks.curatedFind.mockResolvedValue(null);

    const response = await GET(new Request(
      'http://localhost/api/businesses?entity_id=ent_partial'
    ));

    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe('foundation_lake');
    expect(mocks.curatedFind).toHaveBeenCalledTimes(1);
  });
});


describe('Foundation list page resource bound', () => {
  beforeEach(() => {
    mocks.viewReady.mockResolvedValue(true);
    mocks.readValuePage.mockReset();
    mocks.curatedList.mockReset();
    mocks.curatedList.mockResolvedValue([]);
  });

  it('caps foundationOnly list pages at 12 while preserving the serving cursor', async () => {
    mocks.readValuePage.mockResolvedValue({
      data: Array.from({ length: 12 }, (_, index) => summary(`ent_page_${index}`, `Company ${index}`)),
      nextCursor: 'make-money-serving-v2:next',
      hasMore: true,
      newArrivals: null,
    });

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&limit=25&cursor=existing-cursor'
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.readValuePage).toHaveBeenCalledWith({ cursor: 'existing-cursor', limit: 12 });
    expect(body.count).toBe(12);
    expect(body.nextCursor).toBe('make-money-serving-v2:next');
    expect(body.hasMore).toBe(true);
    expect(mocks.curatedList).not.toHaveBeenCalled();
  });

  it('keeps a smaller caller limit unchanged', async () => {
    mocks.readValuePage.mockResolvedValue({
      data: Array.from({ length: 5 }, (_, index) => summary(`ent_small_${index}`, `Small ${index}`)),
      nextCursor: null,
      hasMore: false,
      newArrivals: null,
    });

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&limit=5'
    ));

    expect(response.status).toBe(200);
    expect(mocks.readValuePage).toHaveBeenCalledWith({ cursor: undefined, limit: 5 });
  });
});

describe('Foundation bounded search', () => {
  beforeEach(() => {
    mocks.foundationBucket.mockReset();
    mocks.foundationBucket.mockResolvedValue('foundation-lake');
    mocks.viewReady.mockResolvedValue(true);
    mocks.latestRelease.mockReset();
    mocks.latestRelease.mockResolvedValue(null);
    mocks.readPublicSummaryById.mockReset();
    mocks.readPublicSummaryById.mockResolvedValue(null);
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

  it('searches latest published cases first and keeps their IDs excluded across later cursor pages', async () => {
    const apolloId = 'ent_org_4a819d424adf6b2a118f';
    mocks.latestRelease.mockResolvedValue({
      releaseId: '20260925-15',
      releaseAt: '2026-09-25T06:00:00.000Z',
      label: '2026.09.25 15:00 JST',
      count: 1,
      entityIds: [apolloId],
      contributionCount: 1,
    });
    mocks.readPublicSummaryById.mockResolvedValue(summary(apolloId, 'Apollo Global Management'));
    mocks.listObjects.mockImplementation(async ({ cursor }: { cursor?: string }) => {
      if (!cursor) {
        return {
          objects: [{ key: 'views/make-money/v1/entities/apollo-first.json' }],
          truncated: true,
          cursor: 'archive-page-2',
        };
      }
      if (cursor === 'archive-page-2') {
        return {
          objects: [{ key: 'views/make-money/v1/entities/apollo-later-copy.json' }],
          truncated: true,
          cursor: 'archive-page-3',
        };
      }
      return {
        objects: [{ key: 'views/make-money/v1/entities/apollo-archive-case.json' }],
        truncated: false,
        cursor: null,
      };
    });
    mocks.readObject.mockImplementation(async (_bucket: string, key: string) => ({
      body: new TextEncoder().encode(JSON.stringify({
        summary: key.endsWith('apollo-archive-case.json')
          ? summary('ent_archive_0123456789abcdef0123', 'Apollo archive case')
          : summary(apolloId, 'Apollo Global Management'),
      })),
    }));

    const firstResponse = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=1'
    ));
    const firstBody = await firstResponse.json();
    expect(firstResponse.status).toBe(200);
    expect(firstBody.data.map((row: { id: string }) => row.id)).toEqual([apolloId]);
    expect(firstBody.data).toHaveLength(1);
    expect(firstBody.nextCursor).toMatch(/^foundation-search-v2:/);

    const secondResponse = await GET(new Request(
      `http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=1&cursor=${encodeURIComponent(firstBody.nextCursor)}`
    ));
    const secondBody = await secondResponse.json();
    expect(secondResponse.status).toBe(200);
    expect(secondBody.data).toEqual([]);
    expect(secondBody.hasMore).toBe(true);
    expect(secondBody.nextCursor).toMatch(/^foundation-search-v2:/);

    const thirdResponse = await GET(new Request(
      `http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=1&cursor=${encodeURIComponent(secondBody.nextCursor)}`
    ));
    const thirdBody = await thirdResponse.json();
    expect(thirdResponse.status).toBe(200);
    expect(thirdBody.data.map((row: { id: string }) => row.id)).toEqual([
      'ent_archive_0123456789abcdef0123',
    ]);
    expect(mocks.latestRelease).toHaveBeenCalledTimes(1);
    expect(mocks.listObjects.mock.calls.map(([options]) => options.cursor)).toEqual([
      undefined,
      'archive-page-2',
      'archive-page-3',
    ]);
  });

  it('returns a latest Apollo match even when archive bucket resolution fails afterward', async () => {
    const apolloId = 'ent_org_4a819d424adf6b2a118f';
    mocks.latestRelease.mockResolvedValue({
      releaseId: '20260925-15',
      releaseAt: '2026-09-25T06:00:00.000Z',
      label: '2026.09.25 15:00 JST',
      count: 1,
      entityIds: [apolloId],
      contributionCount: 1,
    });
    mocks.readPublicSummaryById.mockResolvedValue(summary(apolloId, 'Apollo Global Management'));
    mocks.foundationBucket.mockRejectedValueOnce(new Error('archive bucket temporarily unavailable'));

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=12',
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('foundation_lake');
    expect(body.data.map((row: { id: string }) => row.id)).toEqual([apolloId]);
    expect(body.searchComplete).toBe(false);
    expect(body.archiveRetryable).toBe(true);
    expect(body.nextCursor).toBeNull();
    expect(body.hasMore).toBe(false);
    expect(mocks.readPublicSummaryById).toHaveBeenCalledWith(apolloId);
    expect(mocks.readPublicSummaryById.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.foundationBucket.mock.invocationCallOrder[0]);
    expect(mocks.listObjects).not.toHaveBeenCalled();
  });

  it('preserves the latest result when an initial archive object read fails', async () => {
    const apolloId = 'ent_org_4a819d424adf6b2a118f';
    mocks.latestRelease.mockResolvedValue({
      releaseId: '20260925-15',
      releaseAt: '2026-09-25T06:00:00.000Z',
      label: '2026.09.25 15:00 JST',
      count: 1,
      entityIds: [apolloId],
      contributionCount: 1,
    });
    mocks.readPublicSummaryById.mockResolvedValue(summary(apolloId, 'Apollo Global Management'));
    mocks.listObjects.mockResolvedValue({
      objects: [{ key: 'views/make-money/v1/entities/archive.json' }],
      truncated: false,
      cursor: null,
    });
    mocks.readObject.mockRejectedValueOnce(new Error('archive object temporarily unavailable'));

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=12',
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((row: { id: string }) => row.id)).toEqual([apolloId]);
    expect(body.searchComplete).toBe(false);
    expect(body.archiveRetryable).toBe(true);
  });

  it('marks the search incomplete when the latest release index fails but archive returns a row', async () => {
    mocks.latestRelease.mockRejectedValueOnce(new Error('latest release index temporarily unavailable'));
    mocks.listObjects.mockResolvedValue({
      objects: [{ key: 'views/make-money/v1/entities/apollo-archive.json' }],
      truncated: true,
      cursor: 'archive-page-2',
    });
    mocks.readObject.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({
        summary: summary('ent_archive_apollo_0123456789', 'Apollo archive business'),
      })),
    });

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=12',
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.map((row: { id: string }) => row.id))
      .toEqual(['ent_archive_apollo_0123456789']);
    expect(body.searchComplete).toBe(false);
    expect(body.latestRetryable).toBe(true);
    expect(body.archiveRetryable).toBe(false);
    // A latest-side gap takes precedence over archive continuation so the
    // explicit retry rechecks the latest index from the start.
    expect(body.nextCursor).toBeNull();
    expect(body.hasMore).toBe(false);
  });

  it('marks the search incomplete when a published latest summary cannot be read', async () => {
    const apolloId = 'ent_org_4a819d424adf6b2a118f';
    mocks.latestRelease.mockResolvedValue({
      releaseId: '20260925-15',
      releaseAt: '2026-09-25T06:00:00.000Z',
      label: '2026.09.25 15:00 JST',
      count: 1,
      entityIds: [apolloId],
      contributionCount: 1,
    });
    mocks.readPublicSummaryById.mockRejectedValueOnce(new Error('latest summary temporarily unavailable'));
    mocks.listObjects.mockResolvedValue({ objects: [], truncated: false, cursor: null });

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=12',
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.searchComplete).toBe(false);
    expect(body.latestRetryable).toBe(true);
    expect(body.archiveRetryable).toBe(false);
    expect(body.data).toEqual([]);
    expect(body.nextCursor).toBeNull();
    expect(body.hasMore).toBe(false);
  });

  it('returns an empty retryable partial result when the initial archive page fails with no latest match', async () => {
    mocks.latestRelease.mockResolvedValue(null);
    mocks.listObjects.mockRejectedValue(new Error('temporary R2 list failure'));

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=12',
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('foundation_lake');
    expect(body.data).toEqual([]);
    expect(body.count).toBe(0);
    expect(body.searchComplete).toBe(false);
    expect(body.archiveRetryable).toBe(true);
    expect(body.nextCursor).toBeNull();
    expect(body.hasMore).toBe(false);
  });

  it('returns 503 on a failed cursor continuation so the client can retry that cursor', async () => {
    mocks.listObjects.mockRejectedValue(new Error('temporary continuation failure'));
    const cursor = `foundation-search-v1:${encodeURIComponent('archive-page-2')}`;

    const response = await GET(new Request(
      `http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=12&cursor=${encodeURIComponent(cursor)}`,
    ));

    expect(response.status).toBe(503);
    expect(mocks.latestRelease).not.toHaveBeenCalled();
    expect(mocks.listObjects).toHaveBeenCalledWith(expect.objectContaining({ cursor: 'archive-page-2' }));
  });

  it('keeps a latest result when the later projection readiness read fails', async () => {
    const apolloId = 'ent_org_4a819d424adf6b2a118f';
    mocks.latestRelease.mockResolvedValue({
      releaseId: '20260925-15',
      releaseAt: '2026-09-25T06:00:00.000Z',
      label: '2026.09.25 15:00 JST',
      count: 1,
      entityIds: [apolloId],
      contributionCount: 1,
    });
    mocks.readPublicSummaryById.mockResolvedValue(summary(apolloId, 'Apollo Global Management'));
    mocks.listObjects.mockResolvedValue({ objects: [], truncated: false, cursor: null });
    mocks.viewReady.mockRejectedValueOnce(new Error('rebuild state temporarily unavailable'));

    const response = await GET(new Request(
      'http://localhost/api/businesses?foundationOnly=true&q=Apollo&limit=12',
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.source).toBe('foundation_lake');
    expect(body.projection).toBe('make-money.v1-backfill-in-progress');
    expect(body.data.map((row: { id: string }) => row.id)).toEqual([apolloId]);
    expect(body.count).toBe(1);
    expect(body.searchComplete).toBe(true);
    expect(body.archiveRetryable).toBe(false);
    expect(body.hasMore).toBe(false);
    expect(mocks.readPublicSummaryById.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.viewReady.mock.invocationCallOrder[0]);
  });

  it.each([
    {
      label: 'more than ten exclusions',
      excludedIds: Array.from(
        { length: 11 },
        (_, index) => `ent_org_${String(index).padStart(20, '0')}`,
      ),
    },
    {
      label: 'an invalid entity ID',
      excludedIds: ['not-an-entity-id'],
    },
  ])('rejects a v2 cursor with $label before reading R2', async ({ excludedIds }) => {
    mocks.listObjects.mockClear();
    mocks.readObject.mockClear();
    mocks.latestRelease.mockClear();
    mocks.viewReady.mockClear();
    const cursor = `foundation-search-v2:${encodeURIComponent(JSON.stringify({
      version: 2,
      r2Cursor: 'archive-page-2',
      excludedIds,
    }))}`;

    const response = await GET(new Request(
      `http://localhost/api/businesses?foundationOnly=true&q=Apollo&cursor=${encodeURIComponent(cursor)}`
    ));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid cursor');
    expect(mocks.viewReady).not.toHaveBeenCalled();
    expect(mocks.latestRelease).not.toHaveBeenCalled();
    expect(mocks.listObjects).not.toHaveBeenCalled();
    expect(mocks.readObject).not.toHaveBeenCalled();
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
