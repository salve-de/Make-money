import React from 'react';
import { Calculator, FileSearch, ShieldAlert } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

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
      label: '推計月商',
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
      label: '推計営業利益',
      value: confirmedEstimate(pnl.isOperatingProfitUnconfirmed, pnl.operatingProfit, formatMoney),
    },
  ];

  return (
    <section
      id="section-cash-anatomy"
      className="rounded-xl border border-amber-500/25 bg-[#0A0D14] p-4 sm:p-5 shadow-2xl space-y-4"
    >
      <div className="flex items-start gap-3 border-b border-white/[0.08] pb-3">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 shrink-0">
          <Calculator className="w-4 h-4 text-amber-300" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-100">
              推計P&amp;L：確認できた入力からの逆算
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-300">
              ESTIMATED
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 leading-relaxed">
            これは推計P&amp;Lです。通帳着金・創業者の個人手取り・実際の口座残高を意味しません。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg border border-white/[0.06] bg-black/25 p-3">
            <div className="text-[10px] font-mono text-zinc-500 mb-1">{row.label}</div>
            <div className="text-xs font-mono font-bold text-zinc-100 tabular-nums">{row.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/[0.07] bg-[#0D1118] p-3.5 space-y-2.5">
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-zinc-300">
          <FileSearch className="w-3.5 h-3.5 text-zinc-400" />
          <span>推計の根拠・観測条件</span>
        </div>
        <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 text-[11px] leading-relaxed">
          <dt className="text-zinc-500 font-mono">区分</dt>
          <dd className="text-zinc-300">{statusLabel(pnl.sourceClass)}</dd>
          <dt className="text-zinc-500 font-mono">観測時点</dt>
          <dd className="text-zinc-300">{pnl.dataSnapshotPeriod || '未確認'}</dd>
          <dt className="text-zinc-500 font-mono">参照資料</dt>
          <dd className="text-zinc-300">{pnl.sourceDoc || '未確認'}</dd>
          <dt className="text-zinc-500 font-mono">計算ロジック</dt>
          <dd className="text-zinc-300 whitespace-pre-wrap">{pnl.estimationLogic || '推計ロジックの詳細は未登録'}</dd>
          {confidence && (
            <>
              <dt className="text-zinc-500 font-mono">確信度</dt>
              <dd className="text-zinc-300">{confidence}</dd>
            </>
          )}
          {range && (
            <>
              <dt className="text-zinc-500 font-mono">推計レンジ</dt>
              <dd className="text-zinc-300">{range}</dd>
            </>
          )}
        </dl>
      </div>

      <div className="flex items-start gap-2 text-[10px] leading-relaxed text-zinc-500">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
        <p>推計値は意思決定の仮説材料です。VERIFIED / REPORTED の実績値と同列には扱いません。</p>
      </div>
    </section>
  );
}
