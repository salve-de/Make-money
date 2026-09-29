import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { hasValidEvidenceLocator, isPublishableEntity, publicSummaryEntity } from './public-entity';
import { reconcileFinancialEntity } from '@/platform/data/financial-reconciliation';
import { inspectFinancialEvidenceConsistency, normalizeFinancialEntity } from '@/shared/financial-integrity';
import type { FinancialEntity } from '@/shared/terminal';

const catalog = JSON.parse(readFileSync(resolve(process.cwd(), 'data/entities-index.json'), 'utf8')) as FinancialEntity[];

function sourceEntity(id: string): FinancialEntity {
  const entity = catalog.find((candidate) => candidate.id === id);
  if (!entity) throw new Error(`Missing catalog fixture: ${id}`);
  return entity;
}

function project(entity: FinancialEntity): FinancialEntity {
  return normalizeFinancialEntity(reconcileFinancialEntity(entity));
}

describe('read-time financial reconciliation at the public boundary', () => {
  it('keeps Pete Codes honest at the source: self-reported figure kept as a label, derived P&L unconfirmed, legacy display archived (2026-09-29 rebuild)', () => {
    const source = sourceEntity('ent_ebizfacts_petecodesghostwritingfounders10800month_52547c76000c');
    const projected = project(source);

    expect(source.publishability).toBe('PARTIAL');
    expect(source.pnl.isRevenueUnconfirmed).toBe(true);
    expect(source.pnl.isOperatingProfitUnconfirmed).toBe(true);
    expect(source.pnl.revenueLabel).toContain('本人申告');
    expect(source.reaudit?.legacyDisplaySnapshot).toBeTruthy();
    expect(projected.pnl.monthlyRevenue).toBe(0);
    expect(projected.pnl.isOperatingProfitUnconfirmed).toBe(true);
    expect(projected.pnl.isNetProfitUnconfirmed).toBe(true);
    expect(publicSummaryEntity(projected).pnl.operatingProfit).toBe(0);
    expect(publicSummaryEntity(projected).pnl.revenueLabel).toContain('本人申告');
    expect(isPublishableEntity(projected)).toBe(true);
  });

  it('holds Jim Lashbaugh annual/monthly period contradiction without converting it', () => {
    const source = sourceEntity('ent_ebizfacts_jimlashbaughpermitexpediting40kyear250hour_36e66e799a59');
    const projected = project(source);

    expect(projected.pnl.monthlyRevenue).toBe(source.pnl.monthlyRevenue);
    expect(projected.pnl.operatingProfit).toBe(source.pnl.operatingProfit);
    expect(projected.pnl.isRevenueUnconfirmed).toBe(true);
    expect(projected.pnl.isGrossProfitUnconfirmed).toBe(true);
    expect(projected.pnl.isGrossMarginUnconfirmed).toBe(true);
    expect(projected.pnl.isOperatingProfitUnconfirmed).toBe(true);
    expect(projected.pnl.isMarginUnconfirmed).toBe(true);
    expect(projected.pnl.isNetProfitUnconfirmed).toBe(true);
    expect(projected.pnl.revenueLabel).toContain('月次換算なし');
    expect(publicSummaryEntity(projected).pnl.monthlyRevenue).toBe(0);
    expect(publicSummaryEntity(projected).pnl.revenueLabel).not.toContain('600');
  });

  it('holds every derived KPI that depends on an unknown revenue amount', () => {
    const source = sourceEntity('ent_keyence');
    const revenueUnknown = {
      ...source,
      observations: ['売上は未確認'],
      observationsStream: [],
    };
    const projected = project(revenueUnknown);

    expect(projected.pnl.monthlyRevenue).toBe(source.pnl.monthlyRevenue);
    expect(projected.pnl.grossProfit).toBe(source.pnl.grossProfit);
    expect(projected.pnl.operatingProfit).toBe(source.pnl.operatingProfit);
    expect(projected.pnl.isRevenueUnconfirmed).toBe(true);
    expect(projected.pnl.isGrossProfitUnconfirmed).toBe(true);
    expect(projected.pnl.isGrossMarginUnconfirmed).toBe(true);
    expect(projected.pnl.isOperatingProfitUnconfirmed).toBe(true);
    expect(projected.pnl.isMarginUnconfirmed).toBe(true);
    expect(projected.pnl.isNetProfitUnconfirmed).toBe(true);
    expect(projected.pnl.isCogsUnconfirmed).toBeFalsy();
    expect(projected.pnl.isCostsUnconfirmed).toBeFalsy();
  });

  it('limits unknown domains to the clause that contains the unknown marker', () => {
    const source = sourceEntity('ent_keyence');
    const paragraph = {
      ...source,
      observations: ['売上は確認済み。利益は未確認'],
      observationsStream: [],
    };
    const consistency = inspectFinancialEvidenceConsistency(paragraph);
    const projected = project(paragraph);

    expect(consistency.explicitUnknownDomains).toEqual(['profit']);
    expect(consistency.explicitUnknownEvidence).toEqual(['利益は未確認']);
    expect(projected.pnl.isRevenueUnconfirmed).toBeFalsy();
    expect(projected.pnl.isGrossProfitUnconfirmed).toBeFalsy();
    expect(projected.pnl.isGrossMarginUnconfirmed).toBeFalsy();
    expect(projected.pnl.isOperatingProfitUnconfirmed).toBe(true);
    expect(projected.pnl.isNetProfitUnconfirmed).toBe(true);
  });

  it('does not change the no-bindings publication gate for the two reconciled records', () => {
    for (const id of [
      'ent_ebizfacts_petecodesghostwritingfounders10800month_52547c76000c',
      'ent_ebizfacts_jimlashbaughpermitexpediting40kyear250hour_36e66e799a59',
    ]) {
      const source = sourceEntity(id);
      const projected = project(source);
      expect(hasValidEvidenceLocator(source), id).toBe(true);
      expect(hasValidEvidenceLocator(projected), id).toBe(true);
      expect(isPublishableEntity(source), id).toBe(true);
      expect(isPublishableEntity(projected), id).toBe(true);
    }
  });

  it('leaves an unrelated normal catalog record numerically intact', () => {
    const source = sourceEntity('ent_keyence');
    const projected = project(source);
    expect(projected.pnl).toEqual(source.pnl);
    expect(projected.unknownsNotes).toEqual(source.unknownsNotes);
  });
});
