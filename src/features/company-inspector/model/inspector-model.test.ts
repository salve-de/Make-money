import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { buildInspectorModel, parsePunchline } from './inspector-model';

const base = INSTITUTIONAL_ENTITIES.find((entity) => entity.id === 'ent_keyence')!;
describe('Inspector presentation calculations', () => {
  it('retains the current JPY/USD display conversion and waterfall', () => {
    const model = buildInspectorModel(base, 'JPY');
    expect(model.formatMoney(80000000000)).toBe('¥800.0億');
    expect(model.formatMoney(25000)).toBe('¥3万');
    expect(buildInspectorModel(base, 'USD').formatMoney(150000000)).toBe('$1.0M');
    expect(model.profitPct).toBe(Math.round(base.pnl.operatingProfit / base.pnl.monthlyRevenue * 100));
  });
  it('does not display unconfirmed revenue as confirmed financials', () => {
    const entity = { ...base, pnl: { ...base.pnl, isRevenueUnconfirmed: true } };
    expect(buildInspectorModel(entity, 'JPY').isFinancialUnavailable).toBe(true);
  });
  it('handles zero revenue and losses without infinite chart percentages', () => {
    const entity = { ...base, pnl: { ...base.pnl, monthlyRevenue: 0, operatingProfit: -500, financialStatus: 'UNAVAILABLE' as const } };
    const model = buildInspectorModel(entity, 'JPY');
    expect(model.isFinancialUnavailable).toBe(true);
    expect(model.profitPct).toBe(0);
    expect(model.cogsPct).toBeLessThanOrEqual(100);
    expect(Number.isFinite(model.serverPct)).toBe(true);
  });
  it('displays an explicitly known zero revenue', () => {
    const entity = { ...base, pnl: { ...base.pnl, monthlyRevenue: 0, isRevenueUnconfirmed: false, financialStatus: 'REPORTED' as const } };
    expect(buildInspectorModel(entity, 'JPY').isFinancialUnavailable).toBe(false);
  });
  it('keeps explicit financial evidence status for hazard cases', () => {
    const entity = { ...base, growthRateYoY: -31, pnl: { ...base.pnl, financialStatus: 'REPORTED' as const } };
    const model = buildInspectorModel(entity, 'JPY');
    expect(model.isHazardMode).toBe(true);
    expect(model.financialStatus).toBe('REPORTED');
  });
  it('selects dynamic cards only when present', () => {
    expect(buildInspectorModel({ ...base, evidenceCards: [] }, 'JPY').hasEvidenceCards).toBe(false);
    expect(buildInspectorModel({ ...base, evidenceCards: [{ id: 'proof', type: 'SMOKING_GUN', title: 'proof', punchline: 'source', evidenceStatus: 'UNKNOWN' }] }, 'JPY').hasEvidenceCards).toBe(true);
  });
  it('splits an optional punchline without dropping multiline observations', () => {
    expect(parsePunchline('【要点】 本文\n次行')).toEqual({ punchline: '要点', detail: '本文\n次行' });
    expect(parsePunchline('本文')).toEqual({ punchline: '', detail: '本文' });
  });
});
