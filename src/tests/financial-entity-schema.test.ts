import { expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { parseFinancialEntity } from '@/shared/financial-entity-schema';
const entity = INSTITUTIONAL_ENTITIES[0];
it('validates checked-in company records without losing optional evidence', () => {
  for (const value of INSTITUTIONAL_ENTITIES) expect(parseFinancialEntity(value)).toBe(value);
});
it('rejects broken nested financial and evidence records before rendering', () => {
  expect(() => parseFinancialEntity({ ...entity, pnl: { ...entity.pnl, monthlyRevenue: '100' } })).toThrow('Invalid FinancialEntity');
  expect(() => parseFinancialEntity({ ...entity, operations: null })).toThrow();
  expect(() => parseFinancialEntity({ ...entity, evidenceCards: [{ type: 'UNRECOGNIZED' }] })).toThrow();
  expect(() => parseFinancialEntity({ ...entity, pnl: { ...entity.pnl, operatingProfit: Infinity } })).toThrow();
});
it('keeps forward-compatible fields and never fills missing required values', () => {
  const value = { ...entity, futureObservation: 'keep me' };
  expect(parseFinancialEntity(value)).toBe(value);
  const missing: Partial<typeof entity> = { ...entity };
  delete missing.pnl;
  expect(() => parseFinancialEntity(missing)).toThrow();
});
