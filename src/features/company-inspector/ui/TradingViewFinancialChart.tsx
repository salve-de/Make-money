'use client';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { PieChart } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function TradingViewFinancialChart({
  entity,
  isHazardMode,
  formatMoney
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const rev = entity.pnl?.monthlyRevenue || 1;
  const cogs = Math.max(entity.pnl?.cogs || 0, 0);
  const serverCost = entity.pnl?.operatingExpenses?.serverAndApi || 0;
  const adCost = entity.pnl?.operatingExpenses?.advertising || 0;
  const subCost = entity.pnl?.operatingExpenses?.subcontracting || 0;
  const saasCost = entity.pnl?.operatingExpenses?.toolsAndSaaS || 0;
  const otherCost = entity.pnl?.operatingExpenses?.other || 0;

  const totalOpex = Math.max(serverCost + adCost + subCost + saasCost + otherCost, 0);
  const profit = entity.pnl?.operatingProfit ?? (rev - cogs - totalOpex);
  const isLoss = profit < 0 || isHazardMode;

  const cogsPct = rev > 0 ? Math.round((cogs / rev) * 100) : 0;
  const serverPct = rev > 0 ? Math.round((serverCost / rev) * 100) : 0;
  const adPct = rev > 0 ? Math.round((adCost / rev) * 100) : 0;
  const subPct = rev > 0 ? Math.round((subCost / rev) * 100) : 0;
  const saasPct = rev > 0 ? Math.round((saasCost / rev) * 100) : 0;
  const profitPct = rev > 0 ? Math.round((profit / rev) * 100) : 0;

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    let myChart = chartInstance.current;
    if (!myChart) {
      myChart = echarts.init(el, 'dark');
      chartInstance.current = myChart;
    }

    // ドーナツチャートのデータ構築（0円の項目は除外してすっきり見せる）
    const pieData: Array<{ name: string; value: number; itemStyle: { color: string } }> = [];

    if (!isLoss && profit > 0) {
      pieData.push({
        name: '純手残り（営業利益）',
        value: profit,
        itemStyle: { color: '#10b981' }
      });
    }

    if (cogs > 0) {
      pieData.push({
        name: '売上原価 (COGS)',
        value: cogs,
        itemStyle: { color: '#f43f5e' }
      });
    }

    if (serverCost > 0) {
      pieData.push({
        name: 'サーバー / 推論API',
        value: serverCost,
        itemStyle: { color: '#06b6d4' }
      });
    }

    if (adCost > 0) {
      pieData.push({
        name: '広告宣伝費',
        value: adCost,
        itemStyle: { color: '#f59e0b' }
      });
    }

    if (subCost > 0) {
      pieData.push({
        name: '外注・委託費',
        value: subCost,
        itemStyle: { color: '#a855f7' }
      });
    }

    if (saasCost > 0) {
      pieData.push({
        name: '業務ツール・SaaS',
        value: saasCost,
        itemStyle: { color: '#64748b' }
      });
    }

    if (isLoss) {
      pieData.push({
        name: '赤字出血 (純流出)',
        value: Math.abs(profit),
        itemStyle: { color: '#ef4444' }
      });
    }

    // 項目が1つもない場合のフォールバック
    if (pieData.length === 0) {
      pieData.push({
        name: '純手残り（営業利益）',
        value: rev,
        itemStyle: { color: '#10b981' }
      });
    }

    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(10, 13, 20, 0.95)',
        borderColor: 'rgba(255, 255, 255, 0.15)',
        textStyle: { color: '#f1f5f9', fontFamily: 'monospace', fontSize: 11 },
        formatter: (params: unknown) => {
          const p = params as { name?: string; value?: number; percent?: number };
          const val = typeof p.value === 'number' ? formatMoney(p.value) : '';
          return `
            <div style="font-weight:bold;margin-bottom:2px;">${p.name || ''}</div>
            <div style="color:#38bdf8;">金額: ${val}</div>
            <div style="color:#94a3b8;">月商比: ${p.percent ?? 0}%</div>
          `;
        }
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
        itemWidth: 10,
        itemHeight: 10,
        icon: 'circle'
      },
      series: [
        {
          name: '損益配分',
          type: 'pie',
          radius: ['45%', '72%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#0b0f17',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 12,
              fontWeight: 'bold',
              color: '#ffffff',
              formatter: '{b}\n{d}%'
            }
          },
          labelLine: {
            show: false
          },
          data: pieData
        }
      ]
    };

    myChart.setOption(option);

    const handleResize = () => {
      myChart?.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      myChart?.dispose();
      chartInstance.current = null;
    };
  }, [rev, cogs, serverCost, adCost, subCost, saasCost, profit, isLoss, formatMoney]);

  return (
    <div id="section-tradingview" className="rounded-xl border border-white/[0.10] bg-[#0A0D14] overflow-hidden shadow-xl">
      {/* タイトルバー */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.08] bg-[#0E131F]">
        <div className="flex items-center gap-2">
          <div className={`w-1 h-3.5 rounded-full ${isLoss ? 'bg-red-500' : 'bg-emerald-400'}`} />
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/[0.1] text-zinc-300 bg-white/[0.05]">
            ANATOMY
          </span>
          <div className="flex items-center gap-1.5">
            <PieChart className="w-3.5 h-3.5 text-cyan-400" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
              損益構造レントゲン（PROFIT & COST BREAKDOWN）
            </h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            isLoss
              ? 'text-red-300 bg-red-950/40 border-red-500/30'
              : 'text-emerald-300 bg-emerald-950/40 border-emerald-500/30'
          }`}>
            {isLoss ? '赤字出血' : `純手残り率 ${profitPct}%`}
          </span>
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* 左側: ECharts ドーナツチャート (7カラム) */}
        <div className="lg:col-span-7 h-[200px] relative">
          <div ref={chartRef} className="w-full h-full" />
        </div>

        {/* 右側: 主要コスト＆利益率サマリー (5カラム) */}
        <div className="lg:col-span-5 space-y-2 font-mono text-xs">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-white/[0.06]">
              <span className="text-zinc-400">月商 (100%)</span>
              <span className="text-white font-bold">{formatMoney(rev)}</span>
            </div>

            <div className="space-y-1 text-[10px]">
              <div className="flex justify-between items-center text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>純手残り営業利益</span>
                </span>
                <span className={`font-bold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                  {formatMoney(profit)} ({profitPct}%)
                </span>
              </div>

              {cogs > 0 && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    <span>売上原価</span>
                  </span>
                  <span>{formatMoney(cogs)} ({cogsPct}%)</span>
                </div>
              )}

              {serverCost > 0 && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>サーバー/API費</span>
                  </span>
                  <span>{formatMoney(serverCost)} ({serverPct}%)</span>
                </div>
              )}

              {adCost > 0 && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>広告宣伝費</span>
                  </span>
                  <span>{formatMoney(adCost)} ({adPct}%)</span>
                </div>
              )}

              {subCost > 0 && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>外注費</span>
                  </span>
                  <span>{formatMoney(subCost)} ({subPct}%)</span>
                </div>
              )}

              {saasCost > 0 && (
                <div className="flex justify-between items-center text-zinc-400">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>ツール/SaaS</span>
                  </span>
                  <span>{formatMoney(saasCost)} ({saasPct}%)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
