import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import type { EvidenceStatus } from '@/shared/terminal';
import { DynamicEvidenceDeck } from '../dynamic-sections/DynamicEvidenceDeck';
import { FinancialSection } from '../ui/FinancialSection';
import { buildInspectorModel } from './inspector-model';

it('renders every supported evidence status, including post-mortem evidence', () => {
  for (const status of ['VERIFIED', 'REPORTED', 'ESTIMATED', 'POST_MORTEM', 'UNKNOWN'] satisfies EvidenceStatus[]) {
    const html = renderToStaticMarkup(createElement(DynamicEvidenceDeck, { cards: [{
      id: 'evidence', type: 'SMOKING_GUN', title: 'Source', punchline: 'Observation', evidenceStatus: status,
    }] }));
    expect(html).toContain(status === 'UNKNOWN' ? 'UNAUDITED' : status);
  }
});

it('does not render unknown costs and profits as observed zeros or a waterfall', () => {
  const base = INSTITUTIONAL_ENTITIES[0];
  const entity = { ...base, pnl: { ...base.pnl, monthlyRevenue: 120000, operatingProfit: 0,
    operatingMargin: 0, grossProfit: 0, grossMargin: 0, isRevenueUnconfirmed: false,
    isMarginUnconfirmed: true, isGrossMarginUnconfirmed: true, isCostsUnconfirmed: true,
    financialStatus: 'REPORTED' as const } };
  const html = renderToStaticMarkup(createElement(FinancialSection, { entity, ...buildInspectorModel(entity, 'JPY') }));
  expect(html).toContain('¥12万');
  expect(html).toContain('未確認');
  expect(html).not.toContain('100%基準');
  expect(html).not.toContain('¥0');
});
