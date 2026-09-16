import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { EstimatedCashSummary } from './EstimatedCashSummary';

describe('estimated financial presentation', () => {
  it('labels modeled P&L as estimates and exposes provenance instead of claiming observed cash', () => {
    const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
    entity.pnl = {
      ...entity.pnl,
      financialStatus: 'ESTIMATED',
      sourceClass: 'INDEPENDENT_SECONDARY',
      dataSnapshotPeriod: '2026-08 observation',
      sourceDoc: 'Independent test source',
      estimationLogic: 'price × estimated customers ÷ month',
      confidenceScore: 0.72,
      estimationRange: { min: 1000000, max: 3000000, median: 2000000 },
      isRevenueUnconfirmed: false,
      isCogsUnconfirmed: false,
      isCostsUnconfirmed: false,
      isOperatingProfitUnconfirmed: false,
    };

    const html = renderToStaticMarkup(
      <EstimatedCashSummary entity={entity} formatMoney={(value) => `¥${value.toLocaleString('ja-JP')}`} />,
    );

    expect(html).toContain('推計P&amp;L');
    expect(html).toContain('ESTIMATED');
    expect(html).toContain('通帳着金・創業者の個人手取り・実際の口座残高を意味しません');
    expect(html).toContain('Independent test source');
    expect(html).toContain('price × estimated customers ÷ month');
    expect(html).toContain('72%');
    expect(html).not.toContain('月次実額');
    expect(html).not.toContain('創業者口座への実質手残りキャッシュ');
  });
});
