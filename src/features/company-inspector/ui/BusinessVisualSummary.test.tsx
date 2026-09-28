import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { BusinessVisualSummary } from './BusinessVisualSummary';

function emptyEntity() {
  const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
  entity.essence = undefined;
  entity.pricing = undefined;
  entity.meta = undefined;
  entity.architecturePattern = '';
  entity.strategy = { ...entity.strategy, blindspot: '', moatDescription: '', incumbentDilemma: undefined };
  entity.pnl = { ...entity.pnl, financialStatus: 'UNAVAILABLE' };
  return entity;
}
const render = (entity: ReturnType<typeof emptyEntity>, isHazardMode = false, isPro = false) => renderToStaticMarkup(
  <BusinessVisualSummary entity={entity} isHazardMode={isHazardMode} isPro={isPro} formatMoney={(value) => `JPY ${value}`} />,
);

describe('BusinessVisualSummary', () => {
  it('omits empty diagrams without inventing cash, paths, or cycles', () => {
    expect(render(emptyEntity())).toBe('');
  });

  it('shows the registered customer, offer and revenue structure and comparison', () => {
    const entity = emptyEntity();
    entity.essence = { targetCustomer: '地域の店舗', whatItDoes: '予約受付を代行', painRelief: '' };
    entity.pricing = { model: '予約件数に応じた手数料', pricePoint: '1件300円', psychologicalTrigger: '' };
    entity.architecturePattern = '複数店舗の受付を集約';
    entity.strategy.incumbentDilemma = '各店舗が電話で個別対応';
    const html = render(entity);
    for (const value of ['地域の店舗', '予約受付を代行', '予約件数に応じた手数料', '1件300円', '複数店舗の受付を集約', '各店舗が電話で個別対応']) expect(html).toContain(value);
    expect(html).not.toContain('超過利潤');
    expect(html).not.toContain('損益の項目別比較');
  });

  it('preserves negative operating profit even outside hazard mode and does not invent time series', () => {
    const entity = emptyEntity();
    entity.pnl = { ...entity.pnl, financialStatus: 'REPORTED', monthlyRevenue: 1000, operatingProfit: -200,
      isRevenueUnconfirmed: false, isOperatingProfitUnconfirmed: false,
      isCogsUnconfirmed: true, isCostsUnconfirmed: true, isGrossProfitUnconfirmed: true };
    const html = render(entity);
    expect(html).toContain('営業損失');
    expect(html).toContain('JPY -200');
    expect(html).toContain('left:40%');
    expect(html).not.toContain('2026-04-01');
    expect(html).not.toContain('marginData');
  });

  it('does not turn a positive profit into a loss because the entity is hazardous', () => {
    const entity = emptyEntity();
    entity.pnl = { ...entity.pnl, financialStatus: 'POST_MORTEM', monthlyRevenue: 1000, operatingProfit: 200,
      isRevenueUnconfirmed: false, isOperatingProfitUnconfirmed: false,
      isCogsUnconfirmed: true, isCostsUnconfirmed: true, isGrossProfitUnconfirmed: true };
    const html = render(entity, true);
    expect(html).toContain('営業利益');
    expect(html).not.toContain('営業損失');
  });

  it('labels estimates and retains confirmed zero while omitting missing and nonfinite amounts', () => {
    const entity = emptyEntity();
    entity.pnl = { ...entity.pnl, financialStatus: 'ESTIMATED', monthlyRevenue: 1000, cogs: 0,
      grossProfit: 99999, operatingProfit: Number.NaN, isRevenueUnconfirmed: false,
      isCogsUnconfirmed: false, isCostsUnconfirmed: true, isGrossProfitUnconfirmed: undefined,
      isOperatingProfitUnconfirmed: false, dataSnapshotPeriod: '2026年8月', sourceDoc: '登録された推計資料' };
    const html = render(entity);
    expect(html).toContain('推計損益');
    expect(html).toContain('推計 JPY 0');
    expect(html).toContain('2026年8月');
    expect(html).toContain('登録された推計資料');
    expect(html).not.toContain('99999');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('営業利益');
  });

  it('hides premium metadata by default and uses public strategy fallbacks', () => {
    const entity = emptyEntity();
    entity.meta = {
      incumbentDilemma: { cannibalizationBarrier: 'PRIVATE_BARRIER', scaleMismatchReason: '', decisionSpeedAdvantage: '' },
      pricingPower: { anchorComparison: '', lossAversionTrigger: '', budgetCategory: '' },
      lockInMechanism: { switchingFriction: 'PRIVATE_RETENTION', dataHostage: '', workflowIntegration: '' },
      capitalEfficiency: { workingCapitalStrategy: 'PRIVATE_CAPITAL', cashConversionCycle: '', incrementalMargin: '' },
    };
    entity.architecturePattern = '公開の提供構造';
    entity.strategy.incumbentDilemma = '公開の比較情報';
    entity.strategy.moatDescription = '公開の継続要因';
    const free = render(entity);
    expect(free).not.toContain('PRIVATE_');
    expect(free).toContain('公開の比較情報');
    expect(free).toContain('公開の継続要因');
    const pro = render(entity, false, true);
    for (const marker of ['PRIVATE_BARRIER', 'PRIVATE_RETENTION', 'PRIVATE_CAPITAL']) expect(pro).toContain(marker);
  });

  it('does not draw a causal growth loop from retention and capital descriptions', () => {
    const entity = emptyEntity();
    entity.strategy.moatDescription = '顧客データ移行に時間がかかる';
    const html = render(entity);
    expect(html).toContain('顧客データ移行に時間がかかる');
    expect(html).not.toContain('ループ');
    expect(html).not.toContain('再投資');
  });
});
