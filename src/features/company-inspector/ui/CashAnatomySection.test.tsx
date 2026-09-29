import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { INSTITUTIONAL_ENTITIES, SOURCE_INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import type { FinancialEntity } from '@/shared/terminal';
import { buildInspectorModel } from '../model/inspector-model';
import { CashAnatomySection } from './CashAnatomySection';

// 画面に実際に出る月次損益（事例詳細）で、数値の正直さのルールを守っているかを確かめる。
function render(entity: FinancialEntity): string {
  const model = buildInspectorModel(entity, 'JPY');
  return renderToStaticMarkup(createElement(CashAnatomySection, {
    entity,
    isHazardMode: false,
    formatMoney: model.formatMoney,
    isFinancialUnavailable: model.isFinancialUnavailable,
  }));
}

function withPnl(pnl: Partial<FinancialEntity['pnl']>): FinancialEntity {
  const base = INSTITUTIONAL_ENTITIES[0];
  return { ...base, pnl: { ...base.pnl, ...pnl } };
}

it('keeps known revenue but never turns unknown costs or profit into measured zeros', () => {
  const html = render(withPnl({
    monthlyRevenue: 120000, operatingProfit: 0, operatingMargin: 0, grossProfit: 0, grossMargin: 0, cogs: 0,
    isRevenueUnconfirmed: false, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true,
    isGrossMarginUnconfirmed: true, isCostsUnconfirmed: true, financialStatus: 'REPORTED',
  }));
  expect(html).toContain('12万円');
  expect(html).toContain('未確認');
  expect(html).not.toMatch(/(^|[^\d])0円/);
});

it('shows known COGS and gross profit even when operating costs and margins are unknown', () => {
  const html = render(withPnl({
    monthlyRevenue: 100000, cogs: 30000, grossProfit: 70000, grossMargin: 0,
    operatingProfit: 0, operatingMargin: 0, isRevenueUnconfirmed: false,
    isCogsUnconfirmed: false, isGrossProfitUnconfirmed: false, isGrossMarginUnconfirmed: true,
    isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isCostsUnconfirmed: true,
    financialStatus: 'REPORTED',
  }));
  expect(html).toContain('3万円');
  expect(html).toContain('7万円');
  // 粗利率が未確認なので、粗利益の行に 70% のような割合の表示は出さない（棒の長さの指定は除く）
  expect(html).not.toContain('>70%<');
});

it('keeps a confirmed operating profit visible when only the margin is unconfirmed', () => {
  const html = render(withPnl({
    monthlyRevenue: 1000000, cogs: 200000, grossProfit: 800000, operatingProfit: 500000, operatingMargin: 0,
    operatingExpenses: { serverAndApi: 100000, advertising: 100000, subcontracting: 50000, toolsAndSaaS: 30000, other: 20000 },
    isRevenueUnconfirmed: false, isCogsUnconfirmed: false, isGrossProfitUnconfirmed: false, isCostsUnconfirmed: false,
    isOperatingProfitUnconfirmed: false, isMarginUnconfirmed: true, financialStatus: 'REPORTED',
  }));
  expect(html).toContain('50万円');
  expect(html).toContain('その他 2万円');
  expect(html).not.toContain('財務データ要照合');
});

it('flags recorded figures that do not add up instead of silently balancing them', () => {
  const entity = normalizeFinancialEntity(SOURCE_INSTITUTIONAL_ENTITIES.find((entry) => entry.name.startsWith('Acquire.com'))!);
  const html = render(entity);
  expect(html).toContain('財務データ要照合');
  expect(html).toContain('4,200万円');
  expect(html).toContain('3,600万円');
});
