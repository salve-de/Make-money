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
    <div className="border-y border-slate-200 bg-white py-5 select-none font-sans">
      {/* 上部ヘッダー ＆ 切替セグメントコントロール */}
      <div className="mb-4 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-0.5 font-bold">
            EXECUTIVE ACTION HEADLINE
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
            {actionHeadline}
          </h4>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <div className="h-7 bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex items-center">
            <button
              onClick={() => setViewMode('CHART')}
              className={`px-3 h-full text-xs font-bold rounded-md transition-all ${
                viewMode === 'CHART'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              推移チャート
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 h-full text-xs font-bold rounded-md transition-all ${
                viewMode === 'TABLE'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
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
          {/* 凡例（モダン・エメラルド・インディゴ） */}
          <div className="flex items-center gap-4 text-xs font-mono mb-3 text-slate-600 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-slate-300"></span>
              <span>売上高</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500"></span>
              <span>粗利益</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span>
              <span>営業利益</span>
            </div>
          </div>

          {/* バーグラフ */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[440px] h-44 flex items-end justify-around gap-6 pt-4 pb-2 border-b border-slate-100">
              {financials.map((fin, idx) => {
                const revHeightPercent = Math.max((fin.revenueJpy / maxRevenue) * 100, 4);
                const grossHeightPercent = Math.max((fin.grossProfitJpy / maxRevenue) * 100, 3);
                const opHeightPercent = Math.max((Math.max(fin.operatingProfitJpy, 0) / maxRevenue) * 100, 2);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1.5 h-32">
                      {/* 売上高バー */}
                      <div
                        style={{ height: `${revHeightPercent}%` }}
                        className="w-3.5 bg-slate-300 rounded-t group-hover:bg-slate-400 transition-all relative flex justify-center cursor-pointer"
                      >
                        <span className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-7 text-[10px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded shadow-md whitespace-nowrap z-10 transition-opacity">
                          売上: {formatYen(fin.revenueJpy)}
                        </span>
                      </div>

                      {/* 粗利バー */}
                      <div
                        style={{ height: `${grossHeightPercent}%` }}
                        className="w-3.5 bg-indigo-500 rounded-t group-hover:bg-indigo-600 transition-all relative flex justify-center cursor-pointer"
                      >
                        <span className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-7 text-[10px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded shadow-md whitespace-nowrap z-10 transition-opacity">
                          粗利: {formatYen(fin.grossProfitJpy)} ({fin.grossMarginPercent}%)
                        </span>
                      </div>

                      {/* 営業利益バー */}
                      <div
                        style={{ height: `${opHeightPercent}%` }}
                        className="w-3.5 bg-emerald-500 rounded-t group-hover:bg-emerald-600 transition-all relative flex justify-center cursor-pointer"
                      >
                        <span className="opacity-0 group-hover:opacity-100 pointer-events-none absolute -top-7 text-[10px] font-mono bg-slate-900 text-white px-2 py-0.5 rounded shadow-md whitespace-nowrap z-10 transition-opacity">
                          営利: {formatYen(fin.operatingProfitJpy)} ({fin.operatingMarginPercent}%)
                        </span>
                      </div>
                    </div>

                    <div className="text-center font-mono">
                      <div className="text-xs font-bold text-slate-800">{fin.period}</div>
                      <div className="text-[10px] text-emerald-700 font-bold">利益率 {fin.operatingMarginPercent}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* 高密度テーブル（等幅数字） */
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-xs font-mono border-collapse">
            <thead>
              <tr className="text-slate-600 border-b border-slate-200 bg-slate-50 text-[11px] font-bold">
                <th className="py-2.5 px-3 text-left font-bold">決算期</th>
                <th className="py-2.5 px-3 text-right font-bold">売上高</th>
                <th className="py-2.5 px-3 text-right font-bold">売上原価</th>
                <th className="py-2.5 px-3 text-right font-bold">粗利益</th>
                <th className="py-2.5 px-3 text-right font-bold">粗利率</th>
                <th className="py-2.5 px-3 text-right font-bold">販売管理費</th>
                <th className="py-2.5 px-3 text-right font-bold">営業利益</th>
                <th className="py-2.5 px-3 text-right font-bold">営業利益率</th>
                <th className="py-2.5 px-3 text-right font-bold">当期純利益</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {financials.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 text-slate-700">
                  <td className="py-2 px-3 font-bold text-slate-900 text-left">{row.period}</td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900">{formatYen(row.revenueJpy)}</td>
                  <td className="py-2 px-3 text-right text-slate-500">{formatYen(row.cogsJpy)}</td>
                  <td className="py-2 px-3 text-right font-bold text-indigo-700">{formatYen(row.grossProfitJpy)}</td>
                  <td className="py-2 px-3 text-right text-slate-600">{row.grossMarginPercent.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right text-slate-500">{formatYen(row.opexJpy)}</td>
                  <td className={`py-2 px-3 text-right font-bold ${row.operatingProfitJpy >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatYen(row.operatingProfitJpy)}
                  </td>
                  <td className="py-2 px-3 text-right text-emerald-700 font-bold">
                    {row.operatingMarginPercent.toFixed(1)}%
                  </td>
                  <td className="py-2 px-3 text-right text-slate-800 font-bold">{formatYen(row.netIncomeJpy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
