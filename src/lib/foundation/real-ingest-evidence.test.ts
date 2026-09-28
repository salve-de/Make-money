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
vi.mock('../../../scripts/pipeline/auto-enrich-entity', () => ({
  autoEnrichEntityBeforeIngest: (entity: FinancialEntity) => structuredClone(entity),
}));
import { ingestVerifiedEntities } from '../../../scripts/pipeline/real-ingest-pipeline';

beforeEach(() => vi.clearAllMocks());

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
  await ingestVerifiedEntities([{ entity, rawArtifacts }], 'test');
  const catalogWrite = mocks.writes.mock.calls.find(([path]) => String(path).endsWith('/data/entities-index.json'));
  expect(catalogWrite).toBeDefined();
  expect(JSON.parse(catalogWrite![1])[0].evidenceCards).toEqual(cards);
  expect(entity.evidenceCards).toEqual(cards);
  const journalWrite = mocks.writes.mock.calls.find(([path]) => String(path).includes('/journal/v1/'));
  const journal = JSON.parse(journalWrite![1]);
  expect(journal.entity.evidenceCards).toEqual(cards);
  expect(journal.source_provenance.raw_evidence).toHaveLength(rawArtifacts.length || 1);
  expect(journal.source_provenance.raw_evidence.map((raw: { source_url: string }) => raw.source_url))
    .toEqual(rawArtifacts.length ? rawArtifacts.map(raw => raw.sourceUrl) : [entity.url]);
});
