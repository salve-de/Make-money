'use client';

import React, { useEffect, useRef, useState } from 'react';
import { IncompleteCashSummary } from './IncompleteCashSummary';
import * as echarts from 'echarts';
import type { InspectorSectionProps } from '../model/section-props';

type CashViewMode = 'WATERFALL' | 'SANKEY' | 'TABLE';

export function CashAnatomySection({
  entity,
  isHazardMode,
  formatMoney,
  isFinancialUnavailable
}: Pick<
  InspectorSectionProps,
  | 'entity'
  | 'isHazardMode'
  | 'formatMoney'
  | 'isFinancialUnavailable'
>) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const rev = entity.pnl?.monthlyRevenue || 1;
  const cogs = Math.max(entity.pnl?.cogs || 0, 0);
  const opexObj = entity.pnl?.operatingExpenses || {
    serverAndApi: 0,
    advertising: 0,
    subcontracting: 0,
    toolsAndSaaS: 0,
    other: 0
  };
  const totalOpex = Math.max(
    (opexObj.serverAndApi || 0) +
    (opexObj.advertising || 0) +
    (opexObj.subcontracting || 0) +
    (opexObj.toolsAndSaaS || 0) +
    (opexObj.other || 0),
    0
  );
  const profit = entity.pnl?.operatingProfit ?? (rev - cogs - totalOpex);
  const isLoss = profit < 0 || isHazardMode;

  const actualCogsPct = Math.max(Math.round((cogs / rev) * 100), cogs > 0 ? 3 : 0);
  const opexPct = Math.max(Math.round((totalOpex / rev) * 100), totalOpex > 0 ? 3 : 0);
  const actualProfitPct = isLoss
    ? Math.abs(Math.round((profit / rev) * 100))
    : Math.max(100 - actualCogsPct - opexPct, 5);

  // 原価率が20%未満（粗利80%超）の超高利益モデルは「通帳引き算バー」をデフォルト推奨
  // 複数原価がある場合は「サンキー図」を推奨
  const defaultMode: CashViewMode = actualCogsPct < 20 && opexPct < 20 ? 'WATERFALL' : 'SANKEY';
  const [viewMode, setViewMode] = useState<CashViewMode>(defaultMode);
  const incompleteInputs = Boolean(entity.pnl.isOperatingProfitUnconfirmed || entity.pnl.isCostsUnconfirmed);

  useEffect(() => {
    const el = chartRef.current;
    if (!el || viewMode === 'TABLE' || isFinancialUnavailable || incompleteInputs) return;

    let myChart = chartInstance.current;
    if (!myChart) {
      myChart = echarts.init(el, 'dark');
      chartInstance.current = myChart;
    }

    const renderChart = () => {
      if (!el || !myChart) return;
      if (el.clientWidth <= 0 || el.clientHeight <= 0) return;

      let option: echarts.EChartsOption;

      if (viewMode === 'WATERFALL') {
        const grossProfit = rev - cogs;
        option = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            backgroundColor: 'rgba(10, 13, 20, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            textStyle: { color: '#f1f5f9', fontFamily: 'monospace' },
            formatter: (params: unknown) => {
              const arr = params as Array<{ name?: string; value?: number }>;
              const tar = arr?.[1];
              if (!tar) return '';
              return (
                `<div style="font-weight:bold;">${tar.name || ''}</div>` +
                `<div style="color:#38bdf8;">金額: ${formatMoney(Math.abs(tar.value || 0))}</div>`
              );
            }
          },
          grid: {
            top: 25,
            bottom: 25,
            left: 55,
            right: 25
          },
          xAxis: {
            type: 'category',
            data: ['① 月商', '② 原価控除', '③ 粗利益', '④ 販管費控除', '⑤ 純手残り'],
            axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.15)' } },
            axisLabel: { color: '#94a3b8', fontFamily: 'monospace', fontSize: 10 }
          },
          yAxis: {
            type: 'value',
            splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.06)' } },
            axisLabel: {
              color: '#64748b',
              fontFamily: 'monospace',
              formatter: (v: number) => formatMoney(v)
            }
          },
          series: [
            {
              name: 'プレースホルダー',
              type: 'bar',
              stack: 'Total',
              itemStyle: { borderColor: 'transparent', color: 'transparent' },
              emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } },
              data: [0, grossProfit, 0, Math.max(profit, 0), 0]
            },
            {
              name: '損益推移',
              type: 'bar',
              stack: 'Total',
              label: {
                show: true,
                position: 'top',
                color: '#f8fafc',
                fontFamily: 'monospace',
                fontSize: 10,
                formatter: (p: { value?: unknown }) => formatMoney(Math.abs(Number(p.value) || 0))
              },
              data: [
                { value: rev, itemStyle: { color: '#06b6d4', borderRadius: [4, 4, 0, 0] } },
                { value: cogs, itemStyle: { color: '#f43f5e', borderRadius: [4, 4, 0, 0] } },
                { value: grossProfit, itemStyle: { color: '#38bdf8', borderRadius: [4, 4, 0, 0] } },
                { value: totalOpex, itemStyle: { color: '#f59e0b', borderRadius: [4, 4, 0, 0] } },
                {
                  value: Math.abs(profit),
                  itemStyle: {
                    color: isLoss ? '#ef4444' : '#10b981',
                    borderRadius: [4, 4, 0, 0]
                  }
                }
              ]
            }
          ]
        };
      } else {
        // SANKEY MODE
        option = {
          backgroundColor: 'transparent',
          tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            backgroundColor: 'rgba(10, 13, 20, 0.95)',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 1,
            textStyle: { color: '#f1f5f9', fontSize: 12, fontFamily: 'monospace' },
            formatter: (params: unknown) => {
              const p = params as {
                dataType?: string;
                name?: string;
                value?: number;
                data?: { source?: string; target?: string };
              };
              if (p.dataType === 'edge' && p.data && typeof p.value === 'number') {
                const pct = rev > 0 ? Math.round((p.value / rev) * 100) : 0;
                return (
                  `<div style="font-weight:bold;margin-bottom:4px;">${p.data.source} ➔ ${p.data.target}</div>` +
                  `<div style="color:#38bdf8;">金額: ${formatMoney(p.value)} (${pct}%)</div>`
                );
              }
              return `<div style="font-weight:bold;">${p.name || ''}</div>`;
            }
          },
          series: [
            {
              type: 'sankey',

              top: 20,
              bottom: 20,
              left: 30,
              right: 140,
              nodeWidth: 18,
              nodeGap: 24,
              draggable: false,
              emphasis: {
                focus: 'adjacency',
                lineStyle: { opacity: 0.85 }
              },
              data: [
                {
                  name: '月商 (100%)',
                  itemStyle: { color: '#06b6d4', borderColor: '#22d3ee', borderWidth: 1 }
                },
                ...(cogs > 0
                  ? [
                      {
                        name: `原価 (${actualCogsPct}%)`,
                        itemStyle: { color: '#f43f5e', borderColor: '#fb7185', borderWidth: 1 }
                      }
                    ]
                  : []),
                ...(totalOpex > 0
                  ? [
                      {
                        name: `販管費 (${opexPct}%)`,
                        itemStyle: { color: '#f59e0b', borderColor: '#fbbf24', borderWidth: 1 }
                      }
                    ]
                  : []),
                {
                  name: isLoss ? `営業赤字 (-${actualProfitPct}%)` : `純手残り (+${actualProfitPct}%)`,
                  itemStyle: {
                    color: isLoss ? '#ef4444' : '#10b981',
                    borderColor: isLoss ? '#f87171' : '#34d399',
                    borderWidth: 1.5
                  }
                }
              ],
              links: [
                ...(cogs > 0
                  ? [
                      {
                        source: '月商 (100%)',
                        target: `原価 (${actualCogsPct}%)`,
                        value: cogs,
                        lineStyle: {
                          color: 'gradient',
                          opacity: 0.45,
                          curveness: 0.5
                        }
                      }
                    ]
                  : []),
                ...(totalOpex > 0
                  ? [
                      {
                        source: '月商 (100%)',
                        target: `販管費 (${opexPct}%)`,
                        value: totalOpex,
                        lineStyle: {
                          color: 'gradient',
                          opacity: 0.45,
                          curveness: 0.5
                        }
                      }
                    ]
                  : []),
                {
                  source: '月商 (100%)',
                  target: isLoss ? `営業赤字 (-${actualProfitPct}%)` : `純手残り (+${actualProfitPct}%)`,
                  value: Math.max(Math.abs(profit), rev * 0.05),
                  lineStyle: {
                    color: 'gradient',
                    opacity: 0.65,
                    curveness: 0.5
                  }
                }
              ],
              label: {
                color: '#cbd5e1',
                fontFamily: 'monospace',
                fontSize: 11,
                fontWeight: 'bold',
                position: 'right'
              },
              lineStyle: {
                color: 'gradient',
                curveness: 0.5
              }
            }
          ]
        };
      }

      try {
        myChart.setOption(option, true);
        myChart.resize();
      } catch (err) {
        console.error('[CashAnatomySection] ECharts rendering suppressed:', err);
      }
    };

    renderChart();

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          myChart?.resize();
          renderChart();
        }
      }
    });
    resizeObserver.observe(el);

    return () => {
      resizeObserver.disconnect();
      myChart?.dispose();
      if (chartInstance.current === myChart) chartInstance.current = null;
    };
  }, [viewMode, rev, cogs, totalOpex, profit, isLoss, actualCogsPct, opexPct, actualProfitPct, formatMoney, isFinancialUnavailable, incompleteInputs]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  if (isFinancialUnavailable) {
    return (
      <div id="section-cash-anatomy" className="rounded-xl border border-white/[0.08] bg-[#0A0D14] p-4 text-xs">
        <span className="font-bold text-zinc-300">財務データ未確認:</span>
        <span className="text-zinc-500 ml-2">通帳実額・原価内訳は非公開または未確認です。</span>
      </div>
    );
  }

  if (incompleteInputs) return <IncompleteCashSummary entity={entity} formatMoney={formatMoney} />;

  return (
    <section id="section-cash-anatomy" className="scroll-mt-4">
      {/* 統合財務アナトミー調書サーフェス */}
      <div className={`rounded-md border bg-[#0A0D15] overflow-hidden ${
        isHazardMode ? 'border-red-500/30' : 'border-white/[0.08]'
      }`}>
        {/* セクションヘッダー ＆ 切替トグル */}
        <div className={`flex items-center justify-between px-4 py-2.5 border-b gap-2 flex-wrap ${
          isHazardMode ? 'bg-red-950/25 border-red-500/20' : 'bg-white/[0.02] border-white/[0.06]'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`font-mono text-[11px] font-bold tracking-wider uppercase ${
              isHazardMode ? 'text-red-400' : 'text-zinc-400'
            }`}>
              FINANCIAL ANATOMY // {isHazardMode ? '致死出血点 ＆ 赤字解剖' : '現金解剖 ＆ 損益レントゲン'}
            </span>
          </div>

          {/* 3大切替トグル */}
          <div className="inline-flex rounded p-0.5 bg-white/[0.04] border border-white/[0.08] font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setViewMode('WATERFALL')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                viewMode === 'WATERFALL'
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              通帳引き算バー
            </button>
            <button
              type="button"
              onClick={() => setViewMode('SANKEY')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                viewMode === 'SANKEY'
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              現金の滝 (Sankey)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                viewMode === 'TABLE'
                  ? 'bg-white text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              損益明細 (P&L)
            </button>
          </div>
        </div>

        {/* 4大KPI水平ストリップ（カードではなく等間隔バー） */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-white/[0.06] border-b border-white/[0.06] bg-white/[0.01]">
          <div className="p-3">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">月商規模</span>
            <span className="text-sm font-bold font-mono text-zinc-100 tabular-nums">{formatMoney(rev)}</span>
          </div>
          <div className="p-3">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">売上原価 (COGS)</span>
            <span className="text-sm font-bold font-mono text-zinc-300 tabular-nums">
              {formatMoney(cogs)}
              <span className="text-[10px] text-zinc-500 ml-1 font-normal">({actualCogsPct}%)</span>
            </span>
          </div>
          <div className="p-3">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">月間販管費 (Opex)</span>
            <span className="text-sm font-bold font-mono text-zinc-300 tabular-nums">
              {formatMoney(totalOpex)}
              <span className="text-[10px] text-zinc-500 ml-1 font-normal">({opexPct}%)</span>
            </span>
          </div>
          <div className="p-3">
            <span className="text-[10px] font-mono text-zinc-400 block uppercase">営業利益 (純手残り)</span>
            <span className={`text-sm font-bold font-mono tabular-nums ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
              {formatMoney(profit)}
              <span className="text-[10px] ml-1">
                ({isLoss ? `-${actualProfitPct}%` : `+${actualProfitPct}%`})
              </span>
            </span>
          </div>
        </div>

        {/* メイン可視化コンテンツ */}
        <div className="p-4">

      {/* メイン可視化コンテンツ */}
      {viewMode === 'TABLE' ? (
        <div className="rounded-lg border border-white/[0.08] overflow-hidden bg-[#07090F] font-mono text-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] bg-white/[0.02] text-[10px] text-zinc-400">
                <th className="py-2 px-3">勘定科目</th>
                <th className="py-2 px-3 text-right">月次実額</th>
                <th className="py-2 px-3 text-right">構成比</th>
                <th className="py-2 px-3 text-left">内訳・正体</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <tr className="hover:bg-white/[0.02]">
                <td className="py-2 px-3 font-bold text-white">① 売上高 (Revenue)</td>
                <td className="py-2 px-3 text-right font-bold text-cyan-300">{formatMoney(rev)}</td>
                <td className="py-2 px-3 text-right text-zinc-400">100.0%</td>
                <td className="py-2 px-3 text-zinc-400 text-[11px]">本業の総現金流入</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-2 px-3 text-rose-300">② 売上原価 (COGS)</td>
                <td className="py-2 px-3 text-right text-rose-400">-{formatMoney(cogs)}</td>
                <td className="py-2 px-3 text-right text-rose-400">{actualCogsPct}%</td>
                <td className="py-2 px-3 text-zinc-400 text-[11px]">仕入れ・API従量課金・直接インフラ</td>
              </tr>
              <tr className="bg-white/[0.02] font-bold">
                <td className="py-2 px-3 text-sky-300">③ 売上総利益 (Gross Profit)</td>
                <td className="py-2 px-3 text-right text-sky-300">{formatMoney(rev - cogs)}</td>
                <td className="py-2 px-3 text-right text-sky-300">{100 - actualCogsPct}%</td>
                <td className="py-2 px-3 text-zinc-400 text-[11px]">粗利益（事業の本質的価格決定力）</td>
              </tr>
              <tr className="hover:bg-white/[0.02]">
                <td className="py-2 px-3 text-amber-300">④ 販管費合計 (SGA / Opex)</td>
                <td className="py-2 px-3 text-right text-amber-400">-{formatMoney(totalOpex)}</td>
                <td className="py-2 px-3 text-right text-amber-400">{opexPct}%</td>
                <td className="py-2 px-3 text-zinc-400 text-[11px]">
                  サーバー {formatMoney(opexObj.serverAndApi || 0)} / 広告 {formatMoney(opexObj.advertising || 0)} / 外注 {formatMoney(opexObj.subcontracting || 0)} / ツール {formatMoney(opexObj.toolsAndSaaS || 0)}
                </td>
              </tr>
              <tr className={`border-t-2 border-white/[0.15] font-black ${isLoss ? 'bg-red-950/20 text-red-300' : 'bg-emerald-950/20 text-emerald-300'}`}>
                <td className="py-2.5 px-3 text-sm">⑤ 営業利益 (手残り現金)</td>
                <td className="py-2.5 px-3 text-right text-sm">{formatMoney(profit)}</td>
                <td className="py-2.5 px-3 text-right text-sm">{isLoss ? `-${actualProfitPct}%` : `+${actualProfitPct}%`}</td>
                <td className="py-2.5 px-3 text-[11px] font-normal text-zinc-300">創業者口座への実質手残りキャッシュ</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="w-full h-[260px] bg-[#07090F]/90 rounded border border-white/[0.08] relative overflow-hidden">
          <div ref={chartRef} className="w-full h-full" />
        </div>
      )}
        </div>
      </div>
    </section>
  );
}
