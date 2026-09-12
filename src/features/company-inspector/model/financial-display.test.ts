import { ToolsSection } from '../ui/ToolsSection';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { normalizeFinancialEntity } from '@/shared/financial-integrity';
import { INSTITUTIONAL_ENTITIES, SOURCE_INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import type { EvidenceStatus } from '@/shared/terminal';
import { DynamicEvidenceDeck } from '../dynamic-sections/DynamicEvidenceDeck';
import { FinancialSection } from '../ui/FinancialSection';
import { buildInspectorModel } from './inspector-model';

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  VERIFIED: '一次確認済',
  REPORTED: '創業者公表',
  ESTIMATED: '逆算推計',
  POST_MORTEM: '検死解剖',
  UNKNOWN: '未確認',
};

it('renders every supported evidence status, including post-mortem evidence', () => {
  for (const status of ['VERIFIED', 'REPORTED', 'ESTIMATED', 'POST_MORTEM', 'UNKNOWN'] satisfies EvidenceStatus[]) {
    const html = renderToStaticMarkup(createElement(DynamicEvidenceDeck, { cards: [{
      id: 'evidence', type: 'SMOKING_GUN', title: 'Source', punchline: 'Observation', evidenceStatus: status,
    }] }));
    expect(html).toContain(STATUS_LABELS[status]);
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

it('shows the discrepancy instead of silently balancing the recorded profit', () => {
  const entity = normalizeFinancialEntity(SOURCE_INSTITUTIONAL_ENTITIES.find((entry) => entry.name.startsWith('Acquire.com'))!);
  const html = renderToStaticMarkup(createElement(FinancialSection, { entity, ...buildInspectorModel(entity, 'JPY') }));
  expect(html).toContain('財務データ要照合');
  expect(html).toContain('¥4200万');
  expect(html).toContain('¥3600万');
  expect(html).toContain('その他営業経費');
  expect(html).not.toContain('100%基準');
});

it('shows known COGS and gross profit even when OPEX and gross margin are unknown', () => {
  const base = INSTITUTIONAL_ENTITIES[0];
  const entity = { ...base, pnl: { ...base.pnl,
    monthlyRevenue: 100000, cogs: 30000, grossProfit: 70000, grossMargin: 0,
    operatingProfit: 0, operatingMargin: 0, isRevenueUnconfirmed: false,
    isCogsUnconfirmed: false, isGrossProfitUnconfirmed: false, isGrossMarginUnconfirmed: true,
    isMarginUnconfirmed: true, isCostsUnconfirmed: true,
    financialStatus: 'REPORTED' as const,
  } };
  const html = renderToStaticMarkup(createElement(FinancialSection, { entity, ...buildInspectorModel(entity, 'JPY') }));
  expect(html).toContain('-¥3万');
  expect(html).toContain('¥7万');
  expect(html).toContain('粗利益 (Gross Profit: 未確認)');
});

it('does not render unconfirmed tool costs as zero-cost infrastructure', () => {
  const entity = INSTITUTIONAL_ENTITIES.find((entry) => entry.name === 'Photo AI')!;
  const html = renderToStaticMarkup(createElement(ToolsSection, { entity, ...buildInspectorModel(entity, 'JPY') }));
  expect(html).toContain('費用未確認');
  expect(html).not.toContain('¥0');
  expect(html).not.toContain('月額計: ¥');
});
