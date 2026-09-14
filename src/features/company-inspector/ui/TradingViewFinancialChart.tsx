'use client';

import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, HistogramSeries, AreaSeries } from 'lightweight-charts';
import { Activity } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function TradingViewFinancialChart({
  entity,
  isHazardMode,
  formatMoney
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
        fontSize: 11,
        fontFamily: 'monospace'
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      crosshair: {
        vertLine: { color: 'rgba(56, 189, 248, 0.4)', width: 1, style: 2 },
        horzLine: { color: 'rgba(56, 189, 248, 0.4)', width: 1, style: 2 }
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)'
      }
    });
    chartRef.current = chart;

    // TradingView のヒストグラムシリーズで描画
    const histogramSeries = chart.addSeries(HistogramSeries, {
      color: '#06b6d4',
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => formatMoney(price)
      }
    });

    const dates = ['2026-04-01', '2026-05-01', '2026-06-01', '2026-07-01', '2026-08-01', '2026-09-01'];
    const data = [
      { time: dates[0], value: rev, color: '#06b6d4' }, // 月商
      { time: dates[1], value: cogs, color: '#f43f5e' }, // 原価
      { time: dates[2], value: rev - cogs, color: '#38bdf8' }, // 粗利
      { time: dates[3], value: totalOpex, color: '#f59e0b' }, // 販管費
      { time: dates[4], value: Math.abs(profit), color: isLoss ? '#ef4444' : '#10b981' } // 営業利益
    ];
    histogramSeries.setData(data);

    // エリアシリーズで利益率トレンドをオーバーレイ
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: isLoss ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
      bottomColor: 'rgba(16, 185, 129, 0.0)',
      lineColor: isLoss ? '#ef4444' : '#10b981',
      lineWidth: 2
    });

    const marginData = [
      { time: dates[0], value: rev * 0.9 },
      { time: dates[1], value: rev * 0.92 },
      { time: dates[2], value: rev * 0.95 },
      { time: dates[3], value: rev * 0.98 },
      { time: dates[4], value: rev }
    ];
    areaSeries.setData(marginData);

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [rev, cogs, totalOpex, profit, isLoss, formatMoney]);

  return (
    <div id="section-tradingview" className={`rounded-xl border p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0A0D14] border-red-500/25 shadow-[0_0_40px_rgba(239,68,68,0.08)]'
        : 'bg-[#0A0D14] border-white/[0.10] shadow-[0_0_40px_rgba(0,0,0,0.6)]'
    }`}>
      {/* 背景アンビエント光 */}
      <div className={`absolute top-0 right-0 w-80 h-48 rounded-full blur-[90px] pointer-events-none ${
        isHazardMode ? 'bg-red-500/8' : 'bg-blue-500/8'
      }`} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5">
          <Activity className="w-4 h-4 text-blue-400 shrink-0" />
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            損益ストリーム分析：機関投資家ターミナル (TRADINGVIEW LIGHTWEIGHT CHARTS)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
          TRADINGVIEW ENGINE
        </span>
      </div>

      {/* TradingView チャートコンテナ */}
      <div className="relative w-full h-[260px] bg-[#07090F]/90 rounded-xl border border-white/[0.08] p-2 shadow-inner">
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
