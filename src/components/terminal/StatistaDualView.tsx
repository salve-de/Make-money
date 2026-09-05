'use client';

import React, { useState } from 'react';
import { FinancialPeriodRow } from '../../types/terminal';

interface StatistaDualViewProps {
  financials: FinancialPeriodRow[];
  companyName: string;
  actionHeadline: string;
}

export const StatistaDualView: React.FC<StatistaDualViewProps> = ({
  financials,
  companyName,
  actionHeadline
}) => {
  const [viewMode, setViewMode] = useState<'CHART' | 'TABLE'>('CHART');

  const formatYen = (val: number) => {
    if (Math.abs(val) >= 1000000000000) {
      return `¥${(val / 1000000000000).toFixed(2)}兆`;
    }
    if (Math.abs(val) >= 100000000) {
      return `¥${(val / 100000000).toFixed(1)}億`;
    }
    if (Math.abs(val) >= 10000) {
      return `¥${(val / 10000).toFixed(0)}万`;
    }
    return `¥${val.toLocaleString()}`;
  };

  const maxRevenue = Math.max(...financials.map((f) => f.revenueJpy), 1);

  return (
    <div className="bg-[#121419] border border-white/[0.08] rounded-lg p-4 select-none font-sans">
      {/* 上部ヘッダー ＆ 切替セグメントコントロール */}
      <div className="mb-3 pb-3 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">
            EXECUTIVE ACTION HEADLINE
          </div>
          <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 leading-snug">
            {actionHeadline}
          </h4>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="h-6 bg-[#0B0C0E] p-0.5 rounded border border-white/[0.08] flex items-center">
            <button
              onClick={() => setViewMode('CHART')}
              className={`px-2.5 h-full text-xs font-medium rounded transition-all ${
                viewMode === 'CHART'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              推移チャート
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 h-full text-xs font-medium rounded transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              生数値表
            </button>
          </div>
        </div>
      </div>

      {/* 表示コンテンツ本体 */}
      {viewMode === 'CHART' ? (
        <div className="pt-2">
          {/* 凡例（落ち着いたモノトーンとアクセント） */}
          <div className="flex items-center gap-4 text-xs font-mono mb-2 text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-zinc-600"></span>
              <span>売上高</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-zinc-400"></span>
              <span>粗利益</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm bg-white"></span>
              <span>営業利益</span>
            </div>
          </div>

          {/* 細く引き締まったバーグラフ */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[440px] h-44 flex items-end justify-around gap-6 pt-4 pb-2 border-b border-white/[0.08]">
              {financials.map((fin, idx) => {
                const revHeightPercent = Math.max((fin.revenueJpy / maxRevenue) * 100, 4);
                const grossHeightPercent = Math.max((fin.grossProfitJpy / maxRevenue) * 100, 3);
                const opHeightPercent = Math.max((Math.max(fin.operatingProfitJpy, 0) / maxRevenue) * 100, 2);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-32">
                      {/* 売上高バー */}
                      <div
                        style={{ height: `${revHeightPercent}%` }}
                        className="w-3 bg-zinc-600/70 rounded-t group-hover:bg-zinc-500 transition-all relative flex justify-center"
                      >
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-mono bg-black text-zinc-200 px-1.5 py-0.5 rounded border border-white/10 whitespace-nowrap z-10 transition-opacity">
                          売上: {formatYen(fin.revenueJpy)}
                        </span>
                      </div>

                      {/* 粗利バー */}
                      <div
                        style={{ height: `${grossHeightPercent}%` }}
                        className="w-3 bg-zinc-400/80 rounded-t group-hover:bg-zinc-300 transition-all relative flex justify-center"
                      >
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-mono bg-black text-zinc-200 px-1.5 py-0.5 rounded border border-white/10 whitespace-nowrap z-10 transition-opacity">
                          粗利: {formatYen(fin.grossProfitJpy)} ({fin.grossMarginPercent}%)
                        </span>
                      </div>

                      {/* 営業利益バー */}
                      <div
                        style={{ height: `${opHeightPercent}%` }}
                        className="w-3 bg-white/90 rounded-t group-hover:bg-white transition-all relative flex justify-center"
                      >
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-6 text-[10px] font-mono bg-black text-zinc-200 px-1.5 py-0.5 rounded border border-white/10 whitespace-nowrap z-10 transition-opacity">
                          営利: {formatYen(fin.operatingProfitJpy)} ({fin.operatingMarginPercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="text-center font-mono">
                      <div className="text-xs text-zinc-300">{fin.period}</div>
                      <div className="text-[10px] text-zinc-500">利益率 {fin.operatingMarginPercent}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 高密度テーブル（等幅数字） */
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="text-zinc-500 border-b border-white/[0.08] text-[11px]">
                <th className="py-2 text-left font-medium">決算期</th>
                <th className="py-2 text-right font-medium">売上高</th>
                <th className="py-2 text-right font-medium">売上原価</th>
                <th className="py-2 text-right font-medium">粗利益</th>
                <th className="py-2 text-right font-medium">粗利率</th>
                <th className="py-2 text-right font-medium">販売管理費</th>
                <th className="py-2 text-right font-medium">営業利益</th>
                <th className="py-2 text-right font-medium">営業利益率</th>
                <th className="py-2 text-right font-medium">当期純利益</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {financials.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] text-zinc-300">
                  <td className="py-2 font-medium text-zinc-200 text-left">{row.period}</td>
                  <td className="py-2 text-right">{formatYen(row.revenueJpy)}</td>
                  <td className="py-2 text-right text-zinc-400">{formatYen(row.cogsJpy)}</td>
                  <td className="py-2 text-right font-medium text-zinc-200">{formatYen(row.grossProfitJpy)}</td>
                  <td className="py-2 text-right text-zinc-300">{row.grossMarginPercent.toFixed(1)}%</td>
                  <td className="py-2 text-right text-zinc-400">{formatYen(row.opexJpy)}</td>
                  <td className={`py-2 text-right font-medium ${row.operatingProfitJpy >= 0 ? 'text-zinc-100' : 'text-red-400'}`}>
                    {formatYen(row.operatingProfitJpy)}
                  </td>
                  <td className="py-2 text-right text-emerald-400">
                    {row.operatingMarginPercent.toFixed(1)}%
                  </td>
                  <td className="py-2 text-right text-zinc-200">{formatYen(row.netIncomeJpy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
