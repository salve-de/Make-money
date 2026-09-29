import { beforeEach, expect, it, vi } from 'vitest';
import type { FinancialEntity } from '@/platform/types/terminal';

const mocks = vi.hoisted(() => ({ writes: vi.fn(), exec: vi.fn() }));
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(async () => '[]'), writeFile: mocks.writes, mkdir: vi.fn(),
}));
vi.mock('node:child_process', () => ({ execSync: mocks.exec }));
vi.mock('../storage/r2', () => ({
  getFoundationBucket: (kind: string) => `test-${kind}`,
  isR2ConfiguredAsync: async () => false,
  putR2ObjectCreateOnly: vi.fn(),
  sha256Hex: async (body: string) => `hash-${body.length}`,
}));
vi.mock('@/shared/financial-entity-schema', () => ({ parseFinancialEntity: vi.fn() }));
vi.mock('@/shared/financial-integrity', () => ({ inspectFinancialIntegrity: () => ({}) }));
vi.mock('../../../scripts/pipeline/auto-enrich-entity', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../scripts/pipeline/auto-enrich-entity')>();
  return { ...actual, autoEnrichEntityBeforeIngest: vi.fn(actual.autoEnrichEntityBeforeIngest) };
});
import { autoEnrichEntityBeforeIngest } from '../../../scripts/pipeline/auto-enrich-entity';
import { ingestVerifiedEntities } from '../../../scripts/pipeline/real-ingest-pipeline';

beforeEach(() => {
  vi.clearAllMocks();
  // 2026-09-29: R2 未設定時は明示的に許可しない限り ingest が中断する契約。このテストはローカルミラー（モック fs）を明示的に許可する。
  vi.stubEnv('ALLOW_LOCAL_R2_FALLBACK', '1');
});

it('aborts instead of silently writing a local mirror when R2 is not configured and the fallback is not allowed', async () => {
  vi.stubEnv('ALLOW_LOCAL_R2_FALLBACK', '0');
  const entity = {
    id: 'ent_test_abort', name: 'Abort Example', url: 'https://example.com',
    pnl: { monthlyRevenue: 0, operatingMargin: 0, sourceDoc: 'https://example.com' },
    operations: { toolStack: [] }, evidenceCards: [{ id: 'claim-abort', sourceNote: 'https://example.com' }],
  } as unknown as FinancialEntity;
  await expect(ingestVerifiedEntities([{ entity }], 'test')).rejects.toThrow('[INGEST ABORTED: R2 NOT CONFIGURED]');
  expect(mocks.writes.mock.calls.some(([path]) => String(path).endsWith('/data/entities-index.json'))).toBe(false);
});

it.each(['one capture', 'reversed captures', 'metadata only'])('preserves claim identity and source bindings with %s', async (scenario) => {
  const cards = [
    { id: 'claim-old', sourceNote: 'https://old.example', evidenceLocator: { type: 'html', cssSelector: '#old-fact' } },
    { id: 'claim-new', sourceNote: 'https://new.example' },
    { id: 'claim-third', sourceNote: 'https://other.example' },
  ];
  const entity = {
    id: 'ent_test', name: 'Evidence Example', url: 'https://example.com',
    pnl: { monthlyRevenue: 0, operatingMargin: 0, sourceDoc: 'https://example.com' },
    operations: { toolStack: [] }, evidenceCards: cards,
  } as unknown as FinancialEntity;
  const capture = { content: '<p>Captured fact</p>', contentType: 'text/html', filename: 'new.html', sourceUrl: 'https://new.example' };
  const rawArtifacts = scenario === 'metadata only' ? [] : scenario === 'one capture' ? [capture] : [
    { ...capture, filename: 'other.html', sourceUrl: 'https://other.example' }, capture,
  ];
  const review = scenario === 'one capture' ? {
    reviewer: 'case-reviewer', reviewedAt: '2026-09-29T00:00:00Z',
    sourceUrls: ['https://new.example', 'https://new.example'],
  } : undefined;
  await ingestVerifiedEntities([{ entity, rawArtifacts, review }], 'test');
  const catalogWrite = mocks.writes.mock.calls.find(([path]) => String(path).endsWith('/data/entities-index.json'));
  expect(catalogWrite).toBeDefined();
  expect(JSON.parse(catalogWrite![1])[0].evidenceCards).toEqual(cards);
  expect(entity.evidenceCards).toEqual(cards);
  const journalWrite = mocks.writes.mock.calls.find(([path]) => String(path).includes('/journal/v1/'));
  const journal = JSON.parse(journalWrite![1]);
  expect(journal.entity.evidenceCards).toEqual(cards);
  expect(journal.source_provenance.researcher).toBe(review?.reviewer ?? null);
  expect(journal.source_provenance.reviewed_at).toBe(review?.reviewedAt ?? null);
  expect(journal.source_provenance.verified_sources).toEqual(review ? ['https://new.example'] : []);
  expect(journal.source_provenance.method).toBe(review ? 'REVIEWED_COLLECTION' : 'UNSPECIFIED');
  expect(journal.source_provenance.raw_evidence).toHaveLength(rawArtifacts.length || 1);
  expect(journal.source_provenance.raw_evidence.map((raw: { source_url: string }) => raw.source_url))
    .toEqual(rawArtifacts.length ? rawArtifacts.map(raw => raw.sourceUrl) : [entity.url]);
});

it('rejects invalid review metadata before any storage writes', async () => {
  const entity = { id: 'ent_bad_review', name: 'Test' } as FinancialEntity;
  await expect(ingestVerifiedEntities([{
    entity, review: { reviewer: '', reviewedAt: 'invalid', sourceUrls: [] },
  }], 'invalid-review')).rejects.toThrow('INVALID REVIEW');
  expect(mocks.writes).not.toHaveBeenCalled();
});

it.each([
  { reviewer: 7, reviewedAt: '2026-09-29T00:00:00Z', sourceUrls: [] },
  { reviewer: 'reviewer', reviewedAt: 7, sourceUrls: [] },
  { reviewer: 'reviewer', reviewedAt: 'September 29, 2026', sourceUrls: [] },
  { reviewer: 'reviewer', reviewedAt: '2026-02-30T00:00:00Z', sourceUrls: [] },
  { reviewer: 'reviewer', reviewedAt: '2026-09-29T00:00:00Z', sourceUrls: 'https://example.com' },
  { reviewer: 'reviewer', reviewedAt: '2026-09-29T00:00:00Z', sourceUrls: [7] },
  { reviewer: 'reviewer', reviewedAt: '2026-09-29T00:00:00Z', sourceUrls: ['javascript:alert(1)'] },
  { reviewer: 'reviewer', reviewedAt: '2026-09-29T00:00:00Z', sourceUrls: ['https://user:password@example.com'] },
])('rejects malformed runtime review before writes %#', async (review) => {
  const entity = { id: 'ent_bad_runtime_review', name: 'Test' } as FinancialEntity;
  // JSON callers do not inherit the TypeScript input contract.
  const input = JSON.parse(JSON.stringify({ entity, review }));
  await expect(ingestVerifiedEntities([input], 'invalid-review')).rejects.toThrow('INVALID REVIEW');
  expect(mocks.writes).not.toHaveBeenCalled();
});

it('ingests original private jargon unchanged while normalizing active copy', async () => {
  const sourceMetadata = { original: 'サバンナOS', nested: [{ text: '略奪転用方程式' }] };
  const entity = {
    id: 'ent_private_history', name: 'History Example', url: 'https://example.com',
    tagline: 'サバンナOS', sourceMetadata,
    pnl: { monthlyRevenue: 0, operatingMargin: 0, sourceDoc: 'https://example.com' },
    operations: { toolStack: [] },
    evidenceCards: [{ id: 'history-claim', title: '記録', sourceNote: 'https://example.com', sourceMetadata: { original: '地雷検死' } }],
  };
  const before = structuredClone(entity);
  await ingestVerifiedEntities([JSON.parse(JSON.stringify(entity))], 'original-history');
  const journalWrite = mocks.writes.mock.calls.find(([path]) => String(path).includes('/journal/v1/'));
  expect(journalWrite).toBeDefined();
  const saved = JSON.parse(journalWrite![1]).entity;
  expect(saved.sourceMetadata).toEqual(sourceMetadata);
  expect(saved.evidenceCards[0].sourceMetadata).toEqual({ original: '地雷検死' });
  expect(saved.tagline).toBe('人間の本能・心理の急所');
  const catalogWrite = mocks.writes.mock.calls.find(([path]) => String(path).endsWith('/data/entities-index.json'));
  expect(JSON.parse(catalogWrite![1])[0].sourceMetadata).toEqual(sourceMetadata);
  expect(entity).toEqual(before);
});

it('still rejects jargon outside private history before writes', async () => {
  vi.mocked(autoEnrichEntityBeforeIngest).mockImplementationOnce((entity) => structuredClone(entity));
  const entity = JSON.parse(JSON.stringify({
    id: 'ent_unsanitized', name: 'Unsanitized Example', tagline: 'サバンナOS',
    sourceMetadata: { original: '略奪転用方程式' }, pnl: {},
  }));
  await expect(ingestVerifiedEntities([entity], 'unsanitized')).rejects.toThrow('forbidden internal jargon');
  expect(mocks.writes).not.toHaveBeenCalled();
});
