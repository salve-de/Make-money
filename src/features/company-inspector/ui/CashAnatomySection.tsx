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

  const statusLabel = {
    VERIFIED: '一次確認済',
    REPORTED: '創業者公表',
    ESTIMATED: '逆算推計',
    POST_MORTEM: '撤退・失敗の検証',
    UNAVAILABLE: '未確認',
  }[entity.pnl.financialStatus || 'UNAVAILABLE'];

  // 財務データがない場合
  if (isFinancialUnavailable || rev <= 0 || entity.pnl.isRevenueUnconfirmed) {
    return (
      <InspectorSectionCard
        id="section-cash-anatomy"
        index="02"
        categoryEn="FINANCIAL DOSSIER"
        titleJa="財務データ・損益状況"
        badge={
          <span className="rounded border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-zinc-400 font-mono text-[11px]">
            非公開
          </span>
        }
        isHazardMode={isHazardMode}
      >
        <div className="p-4 sm:p-5 text-zinc-400 text-xs leading-relaxed">
          財務数値は未公開です。定性的な事業モデル・現場証拠を優先して検証しています。
        </div>
      </InspectorSectionCard>
    );
  }

  const badgeElement = (
    <div className="flex items-center gap-1.5 font-mono text-[11px]">
      <span className="rounded border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-zinc-300">
        {statusLabel}
      </span>
      {entity.pnl.dataSnapshotPeriod && (
        <span className="rounded border border-white/[0.10] bg-white/[0.04] px-2 py-0.5 text-zinc-400 hidden sm:inline">
          {entity.pnl.dataSnapshotPeriod}
        </span>
      )}
    </div>
  );

  const leadText = isHazardMode
    ? '見栄の売上成長の裏で、毎月いくらの現金が流出し破綻に至ったかの【致命的出血点（ユニットエコノミクスの崩壊）】を解剖する。'
    : '見栄の売上ではなく、売上原価および販管費（API・インフラ・広告・外注）を差し引いた後の【創業者個人の手残り現金実額（営業利益）】を解剖する。';

  return (
    <InspectorSectionCard
      id="section-cash-anatomy"
      index="02"
      categoryEn="FINANCIAL DOSSIER"
      titleJa={isHazardMode ? '月次損益・致死出血点' : '月次損益計算書 (P&L)'}
      badge={badgeElement}
      isHazardMode={isHazardMode}
    >
      {/* セクション・リード文 */}
      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-white/[0.02] border-b border-white/[0.06] text-xs sm:text-[13px] text-zinc-300 leading-relaxed font-sans">
        <span className={`text-[10px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded border mr-2 ${
          isHazardMode
            ? 'bg-red-500/10 text-red-300 border-red-500/30'
            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
        }`}>
          {isHazardMode ? 'BURN RATE / 出血解剖' : 'CASH WATERFALL / 手残り構造'}
        </span>
        {leadText}
      </div>

      {/* 4大財務サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-white/[0.07] bg-[#090d13]">
        <div className="p-3.5 sm:px-4 sm:py-3">
          <div className="text-[11px] font-mono text-zinc-400 font-medium">売上高</div>
          <div className="mt-1 font-mono text-sm sm:text-base font-bold tabular-nums text-zinc-100">
            {formatMoney(rev)}
          </div>
        </div>
        <div className="p-3.5 sm:px-4 sm:py-3 border-l border-white/[0.06]">
          <div className="text-[11px] font-mono text-zinc-400 font-medium">
            売上原価 <span className="text-[10px] text-zinc-500">({actualCogsPct}%)</span>
          </div>
          <div className="mt-1 font-mono text-sm sm:text-base font-bold tabular-nums text-zinc-100">
            {formatMoney(cogs)}
          </div>
        </div>
        <div className="p-3.5 sm:px-4 sm:py-3 border-t sm:border-t-0 border-l sm:border-l border-white/[0.06]">
          <div className="text-[11px] font-mono text-zinc-400 font-medium">
            販管費 <span className="text-[10px] text-zinc-500">({opexPct}%)</span>
          </div>
          <div className="mt-1 font-mono text-sm sm:text-base font-bold tabular-nums text-zinc-100">
            {formatMoney(totalOpex)}
          </div>
        </div>
        <div className="p-3.5 sm:px-4 sm:py-3 border-t sm:border-t-0 border-l border-white/[0.06]">
          <div className="text-[11px] font-mono text-zinc-400 font-medium">
            営業利益 <span className="text-[10px] text-zinc-500">({actualProfitPct}%)</span>
          </div>
          <div className={`mt-1 font-mono text-sm sm:text-base font-bold tabular-nums ${
            isLoss ? 'text-red-400' : 'text-emerald-400'
          }`}>
            {formatMoney(profit)}
          </div>
        </div>
      </div>

      {/* 損益明細テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[580px] border-collapse text-left text-xs font-sans">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.02] text-[11px] font-mono text-zinc-400">
              <th className="px-4 py-2.5 font-semibold">勘定科目</th>
              <th className="px-4 py-2.5 text-right font-semibold">月次金額</th>
              <th className="px-4 py-2.5 text-right font-semibold">売上比</th>
              <th className="px-4 py-2.5 font-semibold">内訳・意味</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            <tr className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-2.5 font-medium text-zinc-200">売上高</td>
              <td className="px-4 py-2.5 text-right font-mono font-bold text-zinc-100 tabular-nums">
                {formatMoney(rev)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-zinc-400 tabular-nums">100%</td>
              <td className="px-4 py-2.5 text-zinc-400 text-[11px]">本業の総売上</td>
            </tr>

            <tr className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-2.5 font-medium text-zinc-300">売上原価</td>
              <td className="px-4 py-2.5 text-right font-mono text-zinc-300 tabular-nums">
                -{formatMoney(cogs)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-zinc-400 tabular-nums">{actualCogsPct}%</td>
              <td className="px-4 py-2.5 text-zinc-400 text-[11px]">売上に直接対応する原価</td>
            </tr>

            <tr className="bg-white/[0.015] font-semibold hover:bg-white/[0.03] transition-colors">
              <td className="px-4 py-2.5 text-zinc-100">粗利益</td>
              <td className={`px-4 py-2.5 text-right font-mono font-bold tabular-nums ${
                grossProfit < 0 ? 'text-red-400' : 'text-cyan-400'
              }`}>
                {formatMoney(grossProfit)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-zinc-300 tabular-nums">{grossProfitPct}%</td>
              <td className="px-4 py-2.5 text-zinc-400 text-[11px]">売上高 − 売上原価</td>
            </tr>

            <tr className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-2.5 font-medium text-zinc-300">販管費 (SGA)</td>
              <td className="px-4 py-2.5 text-right font-mono text-zinc-300 tabular-nums">
                -{formatMoney(totalOpex)}
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-zinc-400 tabular-nums">{opexPct}%</td>
              <td className="px-4 py-2.5 text-zinc-400 text-[11px]">
                {[
                  opexObj.serverAndApi ? `サーバー ${formatMoney(opexObj.serverAndApi)}` : null,
                  opexObj.advertising ? `広告 ${formatMoney(opexObj.advertising)}` : null,
                  opexObj.subcontracting ? `外注 ${formatMoney(opexObj.subcontracting)}` : null,
                  opexObj.toolsAndSaaS ? `ツール ${formatMoney(opexObj.toolsAndSaaS)}` : null,
                ].filter(Boolean).join(' / ') || '人件費・インフラ・マーケティング'}
              </td>
            </tr>

            <tr className="bg-white/[0.02] font-bold hover:bg-white/[0.04] transition-colors border-t border-white/[0.08]">
              <td className="px-4 py-3 text-zinc-100">営業利益（税引前）</td>
              <td className={`px-4 py-3 text-right font-mono text-sm tabular-nums ${
                isLoss ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {formatMoney(profit)}
              </td>
              <td className={`px-4 py-3 text-right font-mono tabular-nums ${
                isLoss ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {actualProfitPct}%
              </td>
              <td className="px-4 py-3 text-zinc-400 text-[11px] font-normal">
                粗利益 − 販管費
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </InspectorSectionCard>
  );
}
