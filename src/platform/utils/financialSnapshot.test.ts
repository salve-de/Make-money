import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '../data/mockLedgerData';
import { financialSnapshot } from './financialSnapshot';

describe('shared promotional financial snapshot', () => {
  const entity = INSTITUTIONAL_ENTITIES.find((row) => row.id === 'ent_photoai')!;
  it('uses supported ledger amounts and margin without a separate marketing number', () => {
    const known = { ...entity, pnl: { ...entity.pnl, monthlyRevenue: 1000, operatingMargin: 20, isRevenueUnconfirmed: false, isMarginUnconfirmed: false } };
    const snapshot = financialSnapshot(known);
    expect(snapshot.revenue).toBe('¥1,000');
    expect(snapshot.margin).toBe('20.0%');
  });
  it('does not promote unknown or undefined margins as zero', () => {
    expect(financialSnapshot({ ...entity, pnl: { ...entity.pnl, isRevenueUnconfirmed: true, isMarginUnconfirmed: true } })).toMatchObject({ revenue: '未確認', margin: '未確認' });
    expect(financialSnapshot({ ...entity, pnl: { ...entity.pnl, monthlyRevenue: 0 } }).margin).toBe('未確認');
  });
});
