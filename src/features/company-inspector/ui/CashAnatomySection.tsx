'use client';

import React from 'react';

import { inspectFinancialIntegrity } from '@/shared/financial-integrity';
import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';
import { snapshotPeriodLabel } from '@/shared/display-text';

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
  const pnl = entity.pnl;
  const profit = pnl?.operatingProfit ?? 0;
  // 記録された数値どうしが合わないときは、黙って計算し直さず「要照合」として示す
  // 仮の値（0）のまま未確認になっている項目は食い違いとみなさない
  const checked = inspectFinancialIntegrity(pnl);
  const integrity = {
    ...checked,
    profitConflict: checked.profitConflict && (pnl.operatingProfit !== 0 || pnl.isOperatingProfitUnconfirmed === false),
    grossConflict: checked.grossConflict && (pnl.grossProfit !== 0 || pnl.isGrossProfitUnconfirmed === false),
    marginConflict: checked.marginConflict && pnl.operatingMargin !== 0,
  };
  const hasConflict = integrity.profitConflict || integrity.grossConflict || integrity.marginConflict;
  const isLoss = profit < 0;
  const actualCogsPct = percentOf(cogs, rev);
  const opexPct = percentOf(totalOpex, rev);
  const actualProfitPct = percentOf(profit, rev);

  // 明示的に「確認済み（false）」の値は、他の項目が未確認でも表示する。0円は確認済みのときだけ0円として出す。
  const cogsFlag = pnl.isCogsUnconfirmed ?? pnl.isCostsUnconfirmed;
  const cogsUnknown = cogsFlag === true || (cogsFlag !== false && cogs === 0 && rev > 0);
  const opexUnknown = pnl.isCostsUnconfirmed === true || (pnl.isCostsUnconfirmed !== false && totalOpex === 0 && rev > 0);
  const grossProfit = pnl.isGrossProfitUnconfirmed === false ? pnl.grossProfit : rev - cogs;
  const grossProfitPct = percentOf(grossProfit, rev);
  const grossProfitUnknown = integrity.grossConflict || pnl.isGrossProfitUnconfirmed === true || (pnl.isGrossProfitUnconfirmed !== false && cogsUnknown);
  const profitUnknown = integrity.profitConflict || integrity.grossConflict || pnl.isOperatingProfitUnconfirmed === true
    || (pnl.isOperatingProfitUnconfirmed !== false && profit === 0 && rev > 0);
  const grossPctUnknown = grossProfitUnknown || pnl.isGrossMarginUnconfirmed === true;
  const profitPctUnknown = profitUnknown || pnl.isMarginUnconfirmed === true || integrity.marginConflict;

  const statusLabel = {
    VERIFIED: '一次資料',
    REPORTED: '報道・取材',
    ESTIMATED: '推計',
    POST_MORTEM: '事後資料',
    UNAVAILABLE: '未確認',
  }[pnl.financialStatus || 'UNAVAILABLE'];

  // 財務データがない場合
  if (isFinancialUnavailable || rev <= 0 || entity.pnl.isRevenueUnconfirmed) {
    return null;
  }

  const badgeElement = (
    <>
      <span className={hasConflict ? 'text-term-accent' : undefined}>{hasConflict ? '要照合' : statusLabel}</span>
      {snapshotPeriodLabel(entity.pnl.dataSnapshotPeriod) && <span className="term-num hidden text-term-label sm:inline">{snapshotPeriodLabel(entity.pnl.dataSnapshotPeriod)}</span>}
    </>
  );

  const opexDetail = opexUnknown
    ? null
    : [
        opexObj.serverAndApi ? `サーバー ${formatMoney(opexObj.serverAndApi)}` : null,
        opexObj.advertising ? `広告 ${formatMoney(opexObj.advertising)}` : null,
        opexObj.subcontracting ? `外注 ${formatMoney(opexObj.subcontracting)}` : null,
        opexObj.toolsAndSaaS ? `ツール ${formatMoney(opexObj.toolsAndSaaS)}` : null,
        opexObj.other ? `その他 ${formatMoney(opexObj.other)}` : null,
      ].filter(Boolean).join(' / ');

  const rows: Array<{ key: string; label: string; unknown: boolean; pctUnknown?: boolean; value: number; shown: string; pct: number; tone: 'rev' | 'cost' | 'profit'; negative?: boolean; note?: string | null }> = [
    { key: 'rev', label: '売上高', unknown: false, value: rev, shown: formatMoney(rev), pct: 100, tone: 'rev', note: '本業の総売上' },
    { key: 'cogs', label: '売上原価', unknown: cogsUnknown, value: cogs, shown: `−${formatMoney(cogs)}`, pct: actualCogsPct, tone: 'cost', note: '売上に直接対応する原価' },
    { key: 'gross', label: '粗利益', unknown: grossProfitUnknown, pctUnknown: grossPctUnknown, value: grossProfit, shown: formatMoney(grossProfit), pct: grossProfitPct, tone: 'profit', negative: grossProfit < 0, note: '売上高 − 売上原価' },
    { key: 'opex', label: '販管費', unknown: opexUnknown, value: totalOpex, shown: `−${formatMoney(totalOpex)}`, pct: opexPct, tone: 'cost', note: opexDetail || '人件費・インフラ・マーケティング' },
    { key: 'op', label: '営業利益', unknown: profitUnknown, pctUnknown: profitPctUnknown, value: profit, shown: formatMoney(profit), pct: actualProfitPct, tone: 'profit', negative: isLoss, note: '粗利益 − 販管費（税引前）' },
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
                <td className="term-num w-[44px] py-1.5 pl-2 text-right text-xs text-term-label">{row.unknown || row.pctUnknown ? '' : `${row.pct}%`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {opexDetail && <p className="border-t border-term-line-soft py-1.5 text-xs text-term-label">販管費の内訳: {opexDetail}</p>}
      {hasConflict && (
        <p className="border-t border-term-accent-line bg-term-accent-bg px-2 py-1.5 text-xs leading-5 text-term-sub">
          <span className="font-semibold text-term-accent">財務データ要照合</span>
          {integrity.profitConflict && <>　記録の営業利益 <span className="term-num">{formatMoney(pnl.operatingProfit)}</span> と、粗利益−経費の計算値 <span className="term-num">{formatMoney(integrity.calculatedProfit)}</span> が一致しません。</>}
          {integrity.grossConflict && '　売上−原価と粗利益が一致しません。'}
          {integrity.marginConflict && '　記録の利益率と、売上・利益からの計算値が一致しません。'}
        </p>
      )}
    </InspectorSectionCard>
  );
}
