'use client';

import { legacyText } from '../model/legacy-fields';

import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { RotateCw, AlertTriangle } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

function describedGraphNodes(
  nodes: Array<NonNullable<echarts.GraphSeriesOption['data']>[number] & { desc?: string }>,
): NonNullable<echarts.GraphSeriesOption['data']> {
  return nodes;
}

function cleanNodeTitle(text: string | undefined, fallback: string): string {
  if (!text) return fallback;
  const res = text
    .replace(/^【.*?】/, '')
    .replace(/^【.*?】/, '')
    .replace(/^#\d+\s*/, '')
    .replace(/^キレイゴト抜きの.*?構造/u, '')
    .replace(/^大企業が.*?死角/u, '')
    .trim();
  return res.length >= 4 ? res : fallback;
}

export function FlywheelEngineDiagram({
  entity,
  isHazardMode
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const cards = entity.evidenceCards || [];
  const hasVerifiedEvidence = cards.some((card) => card.evidenceStatus === 'VERIFIED');
  const opMargin = hasVerifiedEvidence && entity.pnl?.isOperatingProfitUnconfirmed !== true && entity.pnl?.isRevenueUnconfirmed !== true && entity.pnl?.operatingProfit && entity.pnl?.monthlyRevenue
    ? Math.round((entity.pnl.operatingProfit / entity.pnl.monthlyRevenue) * 100)
    : 0;

  const node1 = isHazardMode
    ? cleanNodeTitle(cards[0]?.title || entity.architecturePattern, '巨額資本調達による急拡大')
    : cleanNodeTitle(cards[0]?.title || entity.architecturePattern, 'コア提供価値の確立と初期顧客獲得');

  const node2 = isHazardMode
    ? cleanNodeTitle(cards[1]?.title || entity.targetPainWallet, '逆ザヤ・値引き施策による顧客維持難')
    : cleanNodeTitle(cards[1]?.title || entity.targetPainWallet, 'スイッチングコストと顧客囲い込み');

  const node3 = isHazardMode
    ? cleanNodeTitle(cards[2]?.title, '固定費膨張とキャッシュバーン加速')
    : cleanNodeTitle(cards[2]?.title, hasVerifiedEvidence && opMargin > 0 ? `営業利益率 ${opMargin}%` : '営業利益率・キャッシュ創出は未確認');

  const node4 = isHazardMode
    ? cleanNodeTitle(cards[3]?.title, '追加調達環境悪化による資金枯渇')
    : cleanNodeTitle(cards[3]?.title || (hasVerifiedEvidence ? legacyText(entity.strategy, 'moat') : ''), hasVerifiedEvidence ? '独自アセットへの再投資' : '再現性・防御要因は未確認');

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
      const width = el.clientWidth;
      const height = el.clientHeight;
      if (width <= 0 || height <= 0) return;

      const cx = width / 2;
      const cy = height / 2;
      const rx = Math.min(width * 0.36, 180);
      const ry = Math.min(height * 0.36, 110);

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          backgroundColor: 'rgba(10, 13, 20, 0.95)',
          borderColor: 'rgba(255, 255, 255, 0.15)',
          textStyle: { color: '#f8fafc', fontSize: 12, fontFamily: 'monospace' },
          formatter: (params: unknown) => {
            const p = params as { dataType?: string; data?: { source?: string; target?: string; name?: string; desc?: string } };
            if (p.dataType === 'edge' && p.data) {
              return `<div style="color:#38bdf8;">自己強化サイクル: ${p.data.source} ➔ ${p.data.target}</div>`;
            }
            if (p.data) {
              return `<div style="font-weight:bold;margin-bottom:2px;">${p.data.name || ''}</div>` +
                     `<div style="color:#cbd5e1;font-size:11px;">${p.data.desc || ''}</div>`;
            }
            return '';
          }
        },
        series: [
          {
            type: 'graph',
            layout: 'none',
            roam: false,
            symbolSize: 45,
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [4, 10],
            label: {
              show: true,
              position: 'bottom',
              color: '#f1f5f9',
              fontSize: 11,
              fontWeight: 'bold',
              fontFamily: 'monospace',
              formatter: '{b}'
            },
            data: describedGraphNodes([
              {
                name: hasVerifiedEvidence ? '① コア価値確立' : '① 提供内容（観測）',
                desc: node1,
                x: cx,
                y: cy - ry,
                itemStyle: { color: '#06b6d4', borderColor: '#22d3ee', borderWidth: 2 },
                label: { position: 'top', distance: 6 }
              },
              {
                name: hasVerifiedEvidence ? '② スイッチングコスト' : '② 切替摩擦（未確認）',
                desc: node2,
                x: cx + rx,
                y: cy,
                itemStyle: { color: '#f59e0b', borderColor: '#fbbf24', borderWidth: 2 },
                label: { position: 'right', distance: 6 }
              },
              {
                name: hasVerifiedEvidence ? '③ 超過利潤創出' : '③ 収益性（未確認）',
                desc: node3,
                x: cx,
                y: cy + ry,
                itemStyle: { color: '#10b981', borderColor: '#34d399', borderWidth: 2 },
                label: { position: 'bottom', distance: 6 }
              },
              {
                name: hasVerifiedEvidence ? '④ 独自資産再投資' : '④ 再現性（未確認）',
                desc: node4,
                x: cx - rx,
                y: cy,
                itemStyle: { color: '#a855f7', borderColor: '#c084fc', borderWidth: 2 },
                label: { position: 'left', distance: 6 }
              },
              {
                name: isHazardMode ? '資本効率破綻' : hasVerifiedEvidence ? 'モート自己強化' : '監査待ち',
                desc: isHazardMode ? '規模拡大に伴う赤字増殖' : hasVerifiedEvidence ? '規模拡大に伴う参入障壁強化' : '因果関係・モートは未確認',
                x: cx,
                y: cy,
                symbolSize: 64,
                itemStyle: {
                  color: isHazardMode ? '#7f1d1d' : hasVerifiedEvidence ? '#0e3a47' : '#3f3f46',
                  borderColor: isHazardMode ? '#ef4444' : '#06b6d4',
                  borderWidth: 2,
                  shadowBlur: 20,
                  shadowColor: isHazardMode ? 'rgba(239,68,68,0.5)' : 'rgba(6,182,212,0.5)'
                },
                label: {
                  show: true,
                  position: 'inside',
                  color: '#ffffff',
                  fontSize: 10,
                  fontWeight: 900
                }
              }
            ]),
            links: [
              {
                source: hasVerifiedEvidence ? '① コア価値確立' : '① 提供内容（観測）',
                target: hasVerifiedEvidence ? '② スイッチングコスト' : '② 切替摩擦（未確認）',
                lineStyle: { curveness: 0.25, color: '#06b6d4', width: 2.5 }
              },
              {
                source: hasVerifiedEvidence ? '② スイッチングコスト' : '② 切替摩擦（未確認）',
                target: hasVerifiedEvidence ? '③ 超過利潤創出' : '③ 収益性（未確認）',
                lineStyle: { curveness: 0.25, color: '#f59e0b', width: 2.5 }
              },
              {
                source: hasVerifiedEvidence ? '③ 超過利潤創出' : '③ 収益性（未確認）',
                target: hasVerifiedEvidence ? '④ 独自資産再投資' : '④ 再現性（未確認）',
                lineStyle: { curveness: 0.25, color: '#10b981', width: 2.5 }
              },
              {
                source: hasVerifiedEvidence ? '④ 独自資産再投資' : '④ 再現性（未確認）',
                target: hasVerifiedEvidence ? '① コア価値確立' : '① 提供内容（観測）',
                lineStyle: { curveness: 0.25, color: '#a855f7', width: 2.5 }
              }
            ],
            lineStyle: {
              opacity: 0.85
            }
          }
        ]
      };

      try {
        myChart.setOption(option, true);
        myChart.resize();
      } catch (err) {
        console.error('[FlywheelEngineDiagram] ECharts rendering suppressed:', err);
      }
    };

    // 初期描画（要素サイズ確定時）
    renderChart();

    // ResizeObserver でモーダルアニメーション中やウィンドウ変更時にも自動再計算
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
  }, [node1, node2, node3, node4, isHazardMode, hasVerifiedEvidence]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  return (
    <div id="section-flywheel" className={`rounded-xl border p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0A0D14] border-red-500/25 shadow-[0_0_40px_rgba(239,68,68,0.08)]'
        : 'bg-[#0A0D14] border-white/[0.10] shadow-[0_0_40px_rgba(0,0,0,0.6)]'
    }`}>
      {/* 背景の微細なアンビエント光 */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[110px] pointer-events-none ${
        isHazardMode ? 'bg-red-500/10' : 'bg-cyan-500/8'
      }`} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5">
          {isHazardMode ? (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <RotateCw className="w-4 h-4 text-cyan-400 shrink-0 animate-[spin_10s_linear_infinite]" />
          )}
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? '資本効率の崩壊サイクル (DEATH SPIRAL ANALYSIS)' : '自己強化型成長サイクル：構造的モートのフライホイール (APACHE ECHARTS)'}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.08]">
          <span className={`w-1.5 h-1.5 rounded-full ${isHazardMode ? 'bg-red-500 animate-ping' : 'bg-cyan-400 animate-pulse'}`} />
          <span>360° GRAPH NETWORK</span>
        </div>
      </div>

      {/* ECharts グラフコンテナ */}
      <div className="relative w-full bg-[#07090F]/90 rounded-xl border border-white/[0.08] p-2 shadow-inner">
        <div ref={chartRef} className="w-full h-[320px]" />
      </div>
    </div>
  );
}
