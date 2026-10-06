import { describe, expect, it } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import { publicEntity, publicFoundationData } from './public-entity';

describe('private research history public boundary', () => {
  it('keeps public source links but excludes original ingestion history without mutating storage', () => {
    const stored = {
      id: 'history-test',
      sourceMetadata: { rawStorage: { payloadKey: 'private/raw' }, originalText: 'old claim' },
      meta: { analysis: 'paid' },
      evidenceCards: [{ sourceNote: 'https://example.org/source' }],
    };
    const before = JSON.stringify(stored);
    const result = publicEntity(stored as unknown as FinancialEntity);
    expect(result).not.toHaveProperty('sourceMetadata');
    expect(result).not.toHaveProperty('meta');
    expect(result.hasPremiumAnalysis).toBe(true);
    expect(result.evidenceCards).toEqual(stored.evidenceCards);
    expect(JSON.stringify(stored)).toBe(before);
  });

  it('removes private history from nested payloads and arrays', () => {
    expect(publicFoundationData({ items: [{ sourceMetadata: { previous: 'private' }, title: 'visible' }] }))
      .toEqual({ items: [{ title: 'visible' }] });
  });

  it('never exposes superseded audit snapshots as current public facts', () => {
    const stored = {
      id: 'reaudit-history-test',
      reaudit: {
        auditDate: '2026-09-29',
        sources: [{ url: 'https://example.org/source' }],
        legacyDisplaySnapshot: {
          priorPnl: { monthlyRevenue: 1200000, isRevenueUnconfirmed: false },
          priorReportedMetrics: [{ context: 'superseded source expression' }],
        },
      },
      evidenceCards: [{ sourceNote: 'https://example.org/source' }],
    };
    const before = JSON.stringify(stored);
    const result = publicEntity(stored as unknown as FinancialEntity);
    expect(result).not.toHaveProperty('reaudit.legacyDisplaySnapshot');
    expect(result).toHaveProperty('reaudit.auditDate', '2026-09-29');
    expect(result).toHaveProperty('reaudit.sources', stored.reaudit.sources);
    expect(result.evidenceCards).toEqual(stored.evidenceCards);
    expect(JSON.stringify(stored)).toBe(before);
    expect(publicFoundationData({ items: [stored] })).not.toHaveProperty('items.0.reaudit.legacyDisplaySnapshot');
  });

  it('再監査メモは出典・裏付けの文・監査日だけを公開し、担当者名や内部メモは出さない', () => {
    const stored = {
      id: 'reaudit-allowlist-test',
      reaudit: {
        auditDate: '2026-09-29',
        auditOwner: 'lane:C internal agent',
        method: 'internal method',
        conflicts: ['internal note'],
        rights: { held: false },
        narrativeStatus: 'UNVERIFIED',
        sources: [{ url: 'https://example.org/source' }],
        supported: ['月商 100万円'],
      },
      evidenceCards: [{ sourceNote: 'https://example.org/source' }],
    };
    const result = publicEntity(stored as unknown as FinancialEntity);
    expect(Object.keys(result.reaudit ?? {}).sort()).toEqual(['auditDate', 'sources', 'supported']);
    expect(JSON.stringify(result)).not.toMatch(/lane:C|internal method|internal note/);
    expect(publicEntity({ id: 'no-audit' } as unknown as FinancialEntity)).not.toHaveProperty('reaudit');
  });
});
