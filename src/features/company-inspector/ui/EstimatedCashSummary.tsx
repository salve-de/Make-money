import React from 'react';
import type { InspectorSectionProps } from '../model/section-props';
import { InspectorSectionCard } from './InspectorSectionCard';
import { MoneyText } from './MoneyText';

function statusLabel(sourceClass: string | undefined): string {
  if (sourceClass === 'PRIMARY') return '一次情報を入力に含む推計';
  if (sourceClass === 'INDEPENDENT_SECONDARY') return '独立第三者情報を入力に含む推計';
  if (sourceClass === 'COMMUNITY') return 'コミュニティ情報を入力に含む推計';
  if (sourceClass === 'MODEL') return 'モデル推計';
  return '推計';
}

function confirmedEstimate(
  isUnconfirmed: boolean | undefined,
  value: number,
  formatMoney: (value: number) => string,
): string {
  // Legacy ESTIMATED records often use numeric zero as a missing-data sentinel
  // while omitting the unconfirmed flags. Only an explicit false is sufficient
  // to present a numeric estimate; absent/true flags fail closed to 未確認.
  return isUnconfirmed === false ? formatMoney(value) : '未確認';
}

export function EstimatedCashSummary({
  entity,
  formatMoney,
}: Pick<InspectorSectionProps, 'entity' | 'formatMoney'>) {
  const pnl = entity.pnl;
  const opex = pnl.operatingExpenses;
  const totalOpex = (opex.serverAndApi || 0)
    + (opex.advertising || 0)
    + (opex.subcontracting || 0)
    + (opex.toolsAndSaaS || 0)
    + (opex.other || 0);
  const confidence = typeof pnl.confidenceScore === 'number'
    ? `${Math.round(pnl.confidenceScore * 100)}%`
    : null;
  const range = pnl.estimationRange
    ? `${formatMoney(pnl.estimationRange.min)} 〜 ${formatMoney(pnl.estimationRange.max)}`
    : null;

  const rows = [
    {
      label: '推計売上（月額換算）',
      value: confirmedEstimate(pnl.isRevenueUnconfirmed, pnl.monthlyRevenue, formatMoney),
    },
    {
      label: '推計売上原価',
      value: confirmedEstimate(pnl.isCogsUnconfirmed, pnl.cogs, formatMoney),
    },
    {
      label: '推計販管費',
      value: confirmedEstimate(pnl.isCostsUnconfirmed, totalOpex, formatMoney),
    },
    {
      label: '推計営業利益（月額換算）',
      value: confirmedEstimate(pnl.isOperatingProfitUnconfirmed, pnl.operatingProfit, formatMoney),
    },
  ];

  return (
    <InspectorSectionCard
      id="section-cash-anatomy"
      index="02"
      categoryEn="ESTIMATED P&L"
      titleJa="推計P&L：確認できた入力からの逆算"
      badge={<span className="text-term-accent">ESTIMATED</span>}
    >
      <p className="border-b border-term-line-soft py-1.5 text-xs leading-5 text-term-label">
        これは推計P&amp;Lです。通帳着金・創業者の個人手取り・実際の口座残高を意味しません。
      </p>

      <dl>
        {rows.map((row) => (
          <div key={row.label} className="flex min-h-[30px] items-center justify-between gap-3 border-b border-term-line-soft py-1">
            <dt className="text-xs text-term-label">{row.label}</dt>
            <dd className={`term-num text-[15px] ${row.value === '未確認' ? 'text-term-dim' : 'text-term-accent'}`}>
              {row.value === '未確認' ? <span className="font-sans text-xs">未確認</span> : <MoneyText text={row.value} />}
            </dd>
          </div>
        ))}
      </dl>

      <div className="py-1.5">
        <div className="mb-1 text-xs text-term-accent">推計の根拠・観測条件</div>
        <dl className="text-xs leading-5">
          {[
            ['区分', statusLabel(pnl.sourceClass)],
            ['観測時点', pnl.dataSnapshotPeriod || '未確認'],
            ['参照資料', pnl.sourceDoc || '未確認'],
            ['計算ロジック', pnl.estimationLogic || '推計ロジックの詳細は未登録'],
            ...(confidence ? [['確信度', confidence]] : []),
            ...(range ? [['推計レンジ', range]] : []),
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 border-b border-term-line-soft py-1 last:border-b-0">
              <dt className="text-term-label">{label}</dt>
              <dd className={`whitespace-pre-wrap break-words ${value === '未確認' || value === '推計ロジックの詳細は未登録' ? 'text-term-dim' : 'text-term-fg'}`}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="border-t border-term-line-soft py-1.5 text-xs leading-5 text-term-label">
        推計値は意思決定の仮説材料です。VERIFIED / REPORTED の実績値と同列には扱いません。
      </p>
    </InspectorSectionCard>
  );
}
