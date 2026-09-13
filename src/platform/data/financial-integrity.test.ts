import { describe, expect, it } from 'vitest';
import { inspectFinancialIntegrity, normalizeFinancialEntity } from '@/shared/financial-integrity';
import { INSTITUTIONAL_ENTITIES, SOURCE_INSTITUTIONAL_ENTITIES, INSTITUTIONAL_ENTITY_ALIASES, findInstitutionalEntity } from './mockLedgerData';

describe('all local financial records at the display boundary', () => {
  it('preserves source money while withholding every inconsistent derived KPI', () => {
    expect(SOURCE_INSTITUTIONAL_ENTITIES.length).toBeGreaterThanOrEqual(123);
    for (const source of SOURCE_INSTITUTIONAL_ENTITIES) {
      const result = normalizeFinancialEntity(source);
      const check = inspectFinancialIntegrity(source.pnl);
      expect(result.pnl.monthlyRevenue).toBe(source.pnl.monthlyRevenue);
      expect(result.pnl.operatingProfit).toBe(source.pnl.operatingProfit);
      expect(result.pnl.operatingExpenses).toEqual(source.pnl.operatingExpenses);
      if (check.profitConflict || check.grossConflict) {
        expect(result.pnl.isOperatingProfitUnconfirmed, source.name).toBe(true);
        expect(result.pnl.isNetProfitUnconfirmed, source.name).toBe(true);
      }
      if (check.marginUndefined || check.marginConflict || check.profitConflict || check.grossConflict) {
        expect(result.pnl.isMarginUnconfirmed, source.name).toBe(true);
      }
    }
  });
  it('quarantines all independently audited profit discrepancies', () => {
    const names = ['Acquire.com', 'Demand Curve', 'Ali Abdaal Courses', 'Red Gregory', "S'well", 'Chubbies', '2PM', 'Flowbase', 'Baseten', 'Baserow', 'Appwrite', 'Airgram', 'APUtime', 'Capacities', 'Activepieces'];
    for (const name of names) {
      const matches = SOURCE_INSTITUTIONAL_ENTITIES.filter((entity) => entity.name.startsWith(name));
      expect(matches.length, name).toBeGreaterThan(0);
      for (const source of matches) {
        expect(normalizeFinancialEntity(source).pnl.isOperatingProfitUnconfirmed, source.name).toBe(true);
        expect(normalizeFinancialEntity(source).pnl.isMarginUnconfirmed, source.name).toBe(true);
      }
    }
  });
  it('excludes audited aliases from listings but resolves old saved IDs', () => {
    expect(new Set(INSTITUTIONAL_ENTITIES.map((entity) => entity.name)).size).toBe(INSTITUTIONAL_ENTITIES.length);
    for (const [alias, id] of Object.entries(INSTITUTIONAL_ENTITY_ALIASES)) {
      expect(findInstitutionalEntity(alias)?.id).toBe(id);
      expect(SOURCE_INSTITUTIONAL_ENTITIES.some((entity) => entity.id === alias)).toBe(true);
    }
  });
  it('does not present the zero-denominator and false zero margins as known', () => {
    for (const name of ['Clubhouse', 'Quibi']) {
      expect(INSTITUTIONAL_ENTITIES.find((entity) => entity.name.includes(name))?.pnl.isMarginUnconfirmed).toBe(true);
    }
  });
  it('does not invent positive profit when reported profit is zero or negative', () => {
    const base = SOURCE_INSTITUTIONAL_ENTITIES[0];
    const pnl = { ...base.pnl, monthlyRevenue: 100, cogs: 0, grossProfit: 100,
      operatingExpenses: { serverAndApi: 200, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
      operatingProfit: -100, operatingMargin: -100 };
    expect(inspectFinancialIntegrity(pnl).marginConflict).toBe(false);
    expect(inspectFinancialIntegrity({ ...pnl, operatingProfit: 0 }).profitConflict).toBe(true);
  });
  it('quarantines the damaged Photo AI claim and explicitly marks conflicting periods', () => {
    const photo = SOURCE_INSTITUTIONAL_ENTITIES.find((entity) => entity.id === 'ent_photoai')!;
    expect(JSON.stringify(photo)).not.toMatch(/zsh\.|パック〜|Stripeからを/);
    const damaged = photo.evidenceCards?.find((card) => card.id === 'ev_photoai_loot_blueprint');
    expect(damaged?.evidenceStatus).toBe('UNKNOWN');
    const conflict = photo.evidenceCards?.find((card) => card.id === 'ev_photoai_crime');
    expect(conflict?.sourceNote).toContain('不一致');
    expect(conflict?.evidenceStatus).toBe('UNKNOWN');
  });
});
