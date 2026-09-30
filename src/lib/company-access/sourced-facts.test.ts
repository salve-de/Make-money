import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import type { FinancialEntity } from '@/shared/terminal';
import { hasSourcedFact } from './sourced-facts';

const base = (): FinancialEntity => {
  const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]) as FinancialEntity;
  entity.observationsStream = [];
  entity.evidenceCards = [];
  entity.pnl = { ...entity.pnl, isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, sourceDoc: '出典未記録', revenueLabel: '未確認' };
  return entity;
};

describe('hasSourcedFact', () => {
  it('is false when nothing carries a source', () => {
    expect(hasSourcedFact(base())).toBe(false);
  });
  it('accepts an observation with a source URL', () => {
    const entity = base();
    entity.observationsStream = [{ text: '事実', sourceUrl: 'https://example.com/a' }];
    expect(hasSourcedFact(entity)).toBe(true);
  });
  it('accepts an evidence card with a source URL and a body, but not an empty one', () => {
    const entity = base();
    entity.evidenceCards = [{ id: 'c', type: 'SMOKING_GUN', title: 't', evidenceStatus: 'REPORTED', punchline: '', sourceNote: 'https://example.com/a' }];
    expect(hasSourcedFact(entity)).toBe(false);
    entity.evidenceCards[0].punchline = '本文';
    expect(hasSourcedFact(entity)).toBe(true);
  });
  it('accepts SEC-backed numbers only when a number exists', () => {
    const entity = base();
    entity.pnl.sourceDoc = 'https://www.sec.gov/Archives/edgar/data/1/x.htm';
    expect(hasSourcedFact(entity)).toBe(false);
    entity.pnl.revenueLabel = '売上高45,183,036千ドル';
    entity.pnl.dataSnapshotPeriod = '2025-01-01〜2025-12-31';
    expect(hasSourcedFact(entity)).toBe(true);
  });
});
