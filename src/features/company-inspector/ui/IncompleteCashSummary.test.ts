import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { IncompleteCashSummary } from './IncompleteCashSummary';
import type { FinancialEntity } from '@/shared/terminal';

it('keeps known revenue but does not turn missing profit into measured zero', () => {
  const entity = { pnl: { monthlyRevenue: 120000, operatingProfit: 0, isRevenueUnconfirmed: false, isOperatingProfitUnconfirmed: true } } as FinancialEntity;
  const html = renderToStaticMarkup(createElement(IncompleteCashSummary, { entity, formatMoney: (value) => `¥${value}` }));
  expect(html).toContain('¥120000');
  expect(html).toContain('未確認');
  expect(html).not.toContain('¥0');
  expect(html).not.toContain('<canvas');
});
