'use client';

import React from 'react';

import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';

function percentOf(value: number, revenue: number): number {
  return revenue > 0 ? Math.round((value / revenue) * 100) : 0;
}

export function CashAnatomySection({
  entity,
  isHazardMode,
  formatMoney,
  isFinancialUnavailable,
}: Pick<
  InspectorSectionProps,
  'entity' | 'isHazardMode' | 'formatMoney' | 'isFinancialUnavailable'
>) {
  const rev = Math.max(entity.pnl?.monthlyRevenue ?? 0, 0);
  const cogs = Math.max(entity.pnl?.cogs ?? 0, 0);
  const opexObj = entity.pnl?.operatingExpenses ?? {
    serverAndApi: 0,
    advertising: 0,
    subcontracting: 0,
    toolsAndSaaS: 0,
    other: 0,
  };
  const totalOpex = Math.max(
    (opexObj.serverAndApi || 0) +
      (opexObj.advertising || 0) +
      (opexObj.subcontracting || 0) +
      (opexObj.toolsAndSaaS || 0) +
      (opexObj.other || 0),
    0,
  );
  const profit = entity.pnl?.operatingProfit ?? 0;
  const grossProfit = rev - cogs;
  const isLoss = profit < 0;
  const actualCogsPct = percentOf(cogs, rev);
  const opexPct = percentOf(totalOpex, rev);
  const actualProfitPct = percentOf(profit, rev);
  const grossProfitPct = percentOf(grossProfit, rev);

  const cogsUnknown = Boolean(entity.pnl.isCogsUnconfirmed || entity.pnl.isCostsUnconfirmed || (cogs === 0 && rev > 0 && !entity.pnl.cogs));
  const opexUnknown = Boolean(entity.pnl.isCostsUnconfirmed || (totalOpex === 0 && rev > 0 && Object.values(opexObj).every((v) => !v)));
  const profitUnknown = Boolean(entity.pnl.isOperatingProfitUnconfirmed || entity.pnl.isMarginUnconfirmed || (profit === 0 && rev > 0 && !entity.pnl.operatingProfit));
  const grossProfitUnknown = Boolean(entity.pnl.isGrossProfitUnconfirmed || entity.pnl.isGrossMarginUnconfirmed || cogsUnknown);

  const statusLabel = {
    VERIFIED: '一次資料',
    REPORTED: '報道・取材',
    ESTIMATED: '推計',
    POST_MORTEM: '事後資料',
    UNAVAILABLE: '未確認',
  }[entity.pnl.financialStatus || 'UNAVAILABLE'];

  // 財務データがない場合
  if (isFinancialUnavailable || rev <= 0 || entity.pnl.isRevenueUnconfirmed) {
    return null;
  }

  const badgeElement = (
    <>
      <span>{statusLabel}</span>
      {entity.pnl.dataSnapshotPeriod && <span className="term-num hidden text-term-label sm:inline">{entity.pnl.dataSnapshotPeriod}</span>}
    </>
  );

  const opexDetail = opexUnknown
    ? null
    : [
        opexObj.serverAndApi ? `サーバー ${formatMoney(opexObj.serverAndApi)}` : null,
        opexObj.advertising ? `広告 ${formatMoney(opexObj.advertising)}` : null,
        opexObj.subcontracting ? `外注 ${formatMoney(opexObj.subcontracting)}` : null,
        opexObj.toolsAndSaaS ? `ツール ${formatMoney(opexObj.toolsAndSaaS)}` : null,
      ].filter(Boolean).join(' / ');

  const rows: Array<{ key: string; label: string; unknown: boolean; value: number; shown: string; pct: number; tone: 'rev' | 'cost' | 'profit'; negative?: boolean; note?: string | null }> = [
    { key: 'rev', label: '売上高', unknown: false, value: rev, shown: formatMoney(rev), pct: 100, tone: 'rev', note: '本業の総売上' },
    { key: 'cogs', label: '売上原価', unknown: cogsUnknown, value: cogs, shown: `−${formatMoney(cogs)}`, pct: actualCogsPct, tone: 'cost', note: '売上に直接対応する原価' },
    { key: 'gross', label: '粗利益', unknown: grossProfitUnknown, value: grossProfit, shown: formatMoney(grossProfit), pct: grossProfitPct, tone: 'profit', negative: grossProfit < 0, note: '売上高 − 売上原価' },
    { key: 'opex', label: '販管費', unknown: opexUnknown, value: totalOpex, shown: `−${formatMoney(totalOpex)}`, pct: opexPct, tone: 'cost', note: opexDetail || '人件費・インフラ・マーケティング' },
    { key: 'op', label: '営業利益', unknown: profitUnknown, value: profit, shown: formatMoney(profit), pct: actualProfitPct, tone: 'profit', negative: isLoss, note: '粗利益 − 販管費（税引前）' },
  ];
  const barClass = { rev: 'bg-term-muted', cost: 'bg-term-dim', profit: 'bg-term-fg-strong' } as const;

  return (
    <InspectorSectionCard
      id="section-cash-anatomy"
      index="02"
      categoryEn="FINANCIAL DOSSIER"
      titleJa={isHazardMode ? '損失と撤退要因' : '月次損益（月額換算）'}
      badge={badgeElement}
      isHazardMode={isHazardMode}
    >
      <table role="presentation" className="w-full border-collapse text-left text-[13px]">
        <tbody>
          {rows.map((row) => {
            const width = Math.min(Math.max(Math.abs(row.pct), 0), 100);
            return (
              <tr role="presentation" key={row.key} className="border-b border-term-line-soft last:border-b-0" title={row.note || undefined}>
                <td className="w-[84px] py-1.5 pr-2 text-xs text-term-label">{row.label}</td>
                <td className="py-1.5 pr-3">
                  {!row.unknown && (
                    <div aria-hidden="true" className="h-1.5 w-full bg-term-head">
                      <div className={`h-full ${row.negative ? 'bg-term-danger' : barClass[row.tone]}`} style={{ width: `${width}%` }} />
                    </div>
                  )}
                </td>
                <td className={`term-num w-[104px] whitespace-nowrap py-1.5 text-right ${row.unknown ? 'text-term-dim' : row.negative ? 'text-term-danger' : 'text-term-fg-strong'}`}>
                  {row.unknown ? <span className="font-sans text-xs">未確認</span> : row.shown}
                </td>
                <td className="term-num w-[44px] py-1.5 pl-2 text-right text-xs text-term-label">{row.unknown ? '' : `${row.pct}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {opexDetail && <p className="border-t border-term-line-soft py-1.5 text-xs text-term-label">販管費の内訳: {opexDetail}</p>}
    </InspectorSectionCard>
  );
}
