import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { FinancialOperationsSupplement } from './FinancialOperationsSupplement';

function fixture() {
  const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
  entity.growthRateYoY = -12; entity.isGrowthUnconfirmed = false;
  Object.assign(entity.operations, { initialTeamSize: 2, currentTeamSize: 8, weeklyHours: 14, automationLevel: 75, initialCapitalRequired: 1000, isTeamSizeUnconfirmed: false, isWeeklyHoursUnconfirmed: false, isCapitalUnconfirmed: false, isAutomationUnconfirmed: false, toolStack: [{name:'Tool A',category:'Hosting',monthlyCost:200,isCostUnconfirmed:false,url:'https://example.com'},{name:'Tool B',category:'DB',monthlyCost:0,isCostUnconfirmed:false}] });
  return entity;
}
const render = (entity: ReturnType<typeof fixture>) => renderToStaticMarkup(<FinancialOperationsSupplement entity={entity} formatMoney={value => `¥${value}`} />);
it('restores growth, operating metrics, per-tool costs, total and source links without duplicating P&L', () => {
  const html = render(fixture());
  for (const text of ['-12%', '2人', '8人', '14時間', '75%', '¥1000', 'Tool A', '¥200', '¥0', 'https://example.com/']) expect(html).toContain(text);
  expect(html).not.toContain('営業利益');
  expect(html).toContain('合計 ¥200');
});
it('does not treat missing or unconfirmed zero costs as free and does not sum partial costs', () => {
  const entity = fixture(); entity.operations.toolStack[1].isCostUnconfirmed = undefined;
  entity.operations.isCapitalUnconfirmed = true; entity.operations.initialCapitalRequired = 99999;
  const html = render(entity); expect(html).toContain('合計 —'); expect(html).not.toContain('¥0'); expect(html).not.toContain('¥99999');
});
it('falls back to legacy team size and rejects unsafe links and invalid values', () => {
  const entity = fixture(); entity.operations.currentTeamSize = undefined; entity.operations.teamSize = 3;
  entity.operations.toolStack[0].url = 'javascript:alert(1)'; entity.growthRateYoY = NaN;
  const html = render(entity); expect(html).toContain('3人'); expect(html).not.toContain('javascript:'); expect(html).not.toContain('NaN');
});
it('omits an entirely empty supplement instead of fabricating zeros', () => {
  const entity = fixture(); entity.isGrowthUnconfirmed = true; entity.pnl.sourceDoc = ''; entity.pnl.estimationLogic = undefined; entity.pnl.dataSnapshotPeriod = undefined;
  Object.assign(entity.operations, { isTeamSizeUnconfirmed:true,isCapitalUnconfirmed:true,isWeeklyHoursUnconfirmed:true,isAutomationUnconfirmed:true,toolStack:[] });
  expect(render(entity)).toBe('');
});

it('retains tool category, purpose and replacement difficulty plus non-estimated financial context', () => {
  const entity = fixture();
  entity.operations.toolStack[0].purpose = 'Batch processing';
  entity.operations.toolStack[0].replacementDifficulty = 'HIGH';
  entity.pnl.financialStatus = 'REPORTED'; entity.pnl.sourceDoc = 'Annual report'; entity.pnl.estimationLogic = 'Observed revenue basis';
  const html = render(entity);
  for (const text of ['Hosting', 'Batch processing', '切替難易度: 高', 'Annual report', 'Observed revenue basis']) expect(html).toContain(text);
  entity.pnl.financialStatus = 'ESTIMATED'; expect(render(entity)).not.toContain('Observed revenue basis');
});

it('retains independently confirmed financial values when revenue is absent', () => {
  const entity = fixture(); Object.assign(entity.pnl, { financialStatus:'REPORTED', isRevenueUnconfirmed:true, operatingProfit:-4321,isOperatingProfitUnconfirmed:false,cogs:876,isCogsUnconfirmed:false,grossProfit:765,isGrossProfitUnconfirmed:false,isCostsUnconfirmed:false });
  entity.pnl.operatingExpenses.serverAndApi = 543;
  const html = render(entity);
  for (const value of ['¥-4321','¥876','¥765','¥543']) expect(html).toContain(value);
  entity.pnl.isOperatingProfitUnconfirmed = true;
  expect(render(entity)).not.toContain('¥-4321');
});
it('avoids duplicating visible cash anatomy and preserves estimated gross-profit labeling', () => {
  const entity = fixture(); Object.assign(entity.pnl, {financialStatus:'REPORTED',monthlyRevenue:1000,isRevenueUnconfirmed:false,operatingProfit:987,isOperatingProfitUnconfirmed:false,grossProfit:888,isGrossProfitUnconfirmed:false});
  expect(render(entity)).not.toContain('¥987');
  entity.pnl.financialStatus = 'ESTIMATED';
  expect(render(entity)).toContain('推計粗利益（月額換算）');
  expect(render(entity)).toContain('¥888');
  expect(render(entity)).not.toContain('¥987');
});
