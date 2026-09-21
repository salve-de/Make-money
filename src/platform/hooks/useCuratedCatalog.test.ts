import { describe, expect, it } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import { mergeKnownCatalogEntities } from './useCuratedCatalog';

describe('paged catalog merge', () => {
  it('preserves a selected full dossier when summaries arrive later', () => {
    const full = { id: 'selected', lootBlueprint: {}, evidenceCards: [{ id: 'one' }, { id: 'two' }] } as FinancialEntity;
    const summary = { id: 'selected', name: 'summary' } as FinancialEntity;
    const next = { id: 'next' } as FinancialEntity;
    expect(mergeKnownCatalogEntities([full], [summary, next])).toEqual([full, next]);
  });
  it('updates ordinary summaries and deduplicates repeated pages', () => {
    const old = { id: 'one', latestDossierHash: 'old' } as FinancialEntity;
    const latest = { id: 'one', latestDossierHash: 'new' } as FinancialEntity;
    expect(mergeKnownCatalogEntities([old], [latest, latest])).toEqual([latest]);
  });
});
