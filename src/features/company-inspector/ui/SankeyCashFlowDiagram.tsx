'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { Droplets, Flame, BarChart3, GitFork } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function SankeyCashFlowDiagram({
  entity,
  isHazardMode,
  formatMoney
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [viewType, setViewType] = useState<'SANKEY' | 'WATERFALL'>('SANKEY');

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

  const cogsPct = Math.max(Math.round((cogs / rev) * 100), cogs > 0 ? 3 : 0);
  const opexPct = Math.max(Math.round((totalOpex / rev) * 100), totalOpex > 0 ? 3 : 0);
  const profitPct = isLoss
    ? Math.abs(Math.round((profit / rev) * 100))
    : Math.max(100 - cogsPct - opexPct, 5);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    let myChart = chartInstance.current;
    if (!myChart) {
      myChart = echarts.init(el, 'dark');
      chartInstance.current = myChart;
    }

    const renderChart = () => {
      if (!el || !myChart) return;
      if (el.clientWidth <= 0 || el.clientHeight <= 0) return;

      let option: echarts.EChartsOption;

      if (viewType === 'SANKEY') {
        // ----------------------------------------------------
        // 1. Apache ECharts 本格サンキー図オプション
        // ----------------------------------------------------
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
              const p = params as { dataType?: string; name?: string; value?: number; data?: { source?: string; target?: string } };
              if (p.dataType === 'edge' && p.data && typeof p.value === 'number') {
                const pct = rev > 0 ? Math.round((p.value / rev) * 100) : 0;
                return `<div style="font-weight:bold;margin-bottom:4px;">${p.data.source} ➔ ${p.data.target}</div>` +
                       `<div style="color:#38bdf8;">金額: ${formatMoney(p.value)} (${pct}%)</div>`;
              }
              return `<div style="font-weight:bold;">${p.name || ''}</div>`;
            }
          },
          series: [
            {
              type: 'sankey',
              layout: 'none',
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
                  name: '売上高 (100%)',
                  itemStyle: { color: '#06b6d4', borderColor: '#22d3ee', borderWidth: 1 }
                },
                ...(cogs > 0 ? [{
                  name: `売上原価 (${cogsPct}%)`,
                  itemStyle: { color: '#f43f5e', borderColor: '#fb7185', borderWidth: 1 }
                }] : []),
                ...(totalOpex > 0 ? [{
                  name: `販管費 (${opexPct}%)`,
                  itemStyle: { color: '#f59e0b', borderColor: '#fbbf24', borderWidth: 1 }
                }] : []),
                {
                  name: isLoss ? `営業赤字 (-${profitPct}%)` : `営業利益 (+${profitPct}%)`,
                  itemStyle: {
                    color: isLoss ? '#ef4444' : '#10b981',
                    borderColor: isLoss ? '#f87171' : '#34d399',
                    borderWidth: 1.5
                  }
                }
              ],
              links: [
                ...(cogs > 0 ? [{
                  source: '売上高 (100%)',
                  target: `売上原価 (${cogsPct}%)`,
                  value: cogs,
                  lineStyle: {
                    color: 'gradient',
                    opacity: 0.45,
                    curveness: 0.5
                  }
                }] : []),
                ...(totalOpex > 0 ? [{
                  source: '売上高 (100%)',
                  target: `販管費 (${opexPct}%)`,
                  value: totalOpex,
                  lineStyle: {
                    color: 'gradient',
                    opacity: 0.45,
                    curveness: 0.5
                  }
                }] : []),
                {
                  source: '売上高 (100%)',
                  target: isLoss ? `営業赤字 (-${profitPct}%)` : `営業利益 (+${profitPct}%)`,
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
      } else {
        // ----------------------------------------------------
        // 2. Apache ECharts ウォーターフォール階段グラフ
        // ----------------------------------------------------
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
              return `<div style="font-weight:bold;">${tar.name || ''}</div>` +
                     `<div style="color:#38bdf8;">金額: ${formatMoney(Math.abs(tar.value || 0))}</div>`;
            }
          },
          grid: {
            top: 30,
            bottom: 30,
            left: 60,
            right: 30
          },
          xAxis: {
            type: 'category',
            data: ['① 売上高', '② 原価控除', '③ 粗利益', '④ 販管費控除', '⑤ 営業利益'],
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
              name: '損益',
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
      }

      try {
        myChart.setOption(option, true);
        myChart.resize();
      } catch (err) {
        console.error('[SankeyCashFlowDiagram] ECharts rendering suppressed:', err);
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
    };
  }, [viewType, rev, cogs, totalOpex, profit, isLoss, cogsPct, opexPct, profitPct, formatMoney]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return (
    <div id="section-sankey" className={`rounded-xl border p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0A0D14] border-red-500/25 shadow-[0_0_40px_rgba(239,68,68,0.08)]'
        : 'bg-[#0A0D14] border-white/[0.10] shadow-[0_0_40px_rgba(0,0,0,0.6)]'
    }`}>
      {/* 背景アンビエント光 */}
      <div className={`absolute top-0 right-0 w-80 h-48 rounded-full blur-[90px] pointer-events-none ${
        isHazardMode ? 'bg-red-500/8' : 'bg-emerald-500/8'
      }`} />

      {/* ヘッダー ＆ モード切替タブ */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5">
          {isHazardMode ? (
            <Flame className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? 'キャッシュバーン構造：資本流出ウォーターフォール' : 'キャッシュ創出構造：損益分岐サンキー図 (APACHE ECHARTS)'}
          </h3>
        </div>

        {/* 表示切替（ECharts サンキー vs ECharts ウォーターフォール） */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setViewType('SANKEY')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
              viewType === 'SANKEY'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitFork className="w-3 h-3" />
            ECharts サンキー
          </button>
          <button
            type="button"
            onClick={() => setViewType('WATERFALL')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
              viewType === 'WATERFALL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            滝グラフ (Waterfall)
          </button>
        </div>
      </div>

      {/* Apache ECharts レンダリングコンテナ */}
      <div className="relative w-full bg-[#07090F]/90 rounded-xl border border-white/[0.08] p-2 shadow-inner">
        <div ref={chartRef} className="w-full h-[320px]" />
      </div>
    </div>
  );
}
