'use client';

import * as echarts from 'echarts';
import { AlertTriangle, RotateCw } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

import type { InspectorSectionProps } from '../model/section-props';

const chartFont = 'Inter, "Noto Sans JP", system-ui, sans-serif';
const supportedEvidence = new Set(['VERIFIED', 'REPORTED', 'POST_MORTEM']);

function compactText(value: string | undefined, fallback: string): string {
  const normalized = (value || '')
    .replace(/^【.*?】/u, '')
    .replace(/^#\d+\s*/u, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return fallback;
  return normalized.length > 64 ? `${normalized.slice(0, 61)}…` : normalized;
}

export function FlywheelEngineDiagram({
  entity,
  isHazardMode
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode'>) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const cards = entity.evidenceCards || [];
  const structuralCards = cards.filter(
    (card) =>
      supportedEvidence.has(card.evidenceStatus) &&
      ['THE_CRIME', 'SMOKING_GUN', 'ASYMMETRIC_LEVERAGE', 'INCUMBENT_TRAP', 'FATAL_BLEED'].includes(card.type)
  );
  const verifiedCount = structuralCards.filter((card) => card.evidenceStatus === 'VERIFIED').length;
  const hasEnoughEvidence = structuralCards.length >= 2;
  const hasConfirmedMargin = !entity.pnl.isMarginUnconfirmed && !entity.pnl.isOperatingProfitUnconfirmed && entity.pnl.monthlyRevenue > 0;
  const margin = hasConfirmedMargin ? entity.pnl.operatingMargin : null;

  const node1 = compactText(
    isHazardMode
      ? structuralCards.find((card) => card.type === 'FATAL_BLEED')?.punchline || entity.architecturePattern
      : entity.essence?.whatItDoes || entity.architecturePattern,
    isHazardMode ? '悪化の起点は未特定' : '提供価値の起点は未確認'
  );
  const node2 = compactText(
    isHazardMode
      ? entity.targetPainWallet
      : entity.meta?.lockInMechanism?.switchingFriction || entity.strategy.moatDescription,
    isHazardMode ? '継続要因は未確認' : '継続・切替摩擦は未確認'
  );
  const node3 = margin === null
    ? '収益性は未確認'
    : margin < 0
      ? `営業利益率 ${margin}%`
      : `営業利益率 +${margin}%`;
  const node4 = compactText(
    isHazardMode
      ? structuralCards.find((card) => card.type === 'INCUMBENT_TRAP')?.punchline
      : entity.meta?.capitalEfficiency?.workingCapitalStrategy || entity.strategy.moatDescription,
    isHazardMode ? '悪化を増幅する要因は未確認' : '再投資・防御要因は未確認'
  );

  useEffect(() => {
    const el = chartRef.current;
    if (!el || !hasEnoughEvidence) return;

    let myChart = chartInstance.current;
    if (!myChart) {
      myChart = echarts.init(el, 'dark');
      chartInstance.current = myChart;
    }

    const descriptions: Record<string, string> = {
      '① 提供価値': node1,
      '② 継続・切替摩擦': node2,
      '③ 収益性': node3,
      '④ 再投資・防御': node4,
      [isHazardMode ? '悪化ループ仮説' : '強化ループ仮説']:
        '矢印は検証済みの因果を断定するものではありません。'
    };

    const renderChart = () => {
      if (!el || !myChart || el.clientWidth <= 0 || el.clientHeight <= 0) return;

      const width = el.clientWidth;
      const height = el.clientHeight;
      const cx = width / 2;
      const cy = height / 2;
      const rx = Math.min(width * 0.32, 170);
      const ry = Math.min(height * 0.30, 92);
      const marginColor = margin !== null && margin < 0
        ? '#dc2626'
        : margin !== null && margin > 0
          ? '#22c55e'
          : '#64748b';
      const centerName = isHazardMode ? '悪化ループ仮説' : '強化ループ仮説';

      const option: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        aria: {
          enabled: true,
          decal: { show: true },
          description: `${entity.name}の構造的な強化ループ仮説。提供価値、継続・切替摩擦、収益性、再投資・防御の4要素を表示。因果関係そのものは仮説として扱う。`
        },
        tooltip: {
          trigger: 'item',
          backgroundColor: '#111827',
          borderColor: '#334155',
          borderWidth: 1,
          textStyle: { color: '#f8fafc', fontSize: 12, fontFamily: chartFont },
          formatter: (params: unknown) => {
            const p = params as {
              dataType?: string;
              name?: string;
              data?: { source?: string; target?: string; name?: string };
            };
            if (p.dataType === 'edge' && p.data) {
              return `<strong>${p.data.source} → ${p.data.target}</strong><br/><span style="color:#94a3b8">因果関係は仮説。根拠カードで確認してください。</span>`;
            }
            const name = p.name || p.data?.name || '';
            return `<strong>${name}</strong><br/><span style="color:#cbd5e1">${descriptions[name] || ''}</span>`;
          }
        },
        series: [
          {
            type: 'graph',
            layout: 'none',
            roam: false,
            symbolSize: width < 520 ? 38 : 44,
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 8],
            label: {
              show: true,
              color: '#e2e8f0',
              fontSize: width < 520 ? 9 : 10,
              fontWeight: 600,
              fontFamily: chartFont
            },
            data: [
              {
                name: '① 提供価値',
                x: cx,
                y: cy - ry,
                itemStyle: { color: '#2563eb', borderColor: '#60a5fa', borderWidth: 1.5 },
                label: { position: 'top', distance: 7 }
              },
              {
                name: '② 継続・切替摩擦',
                x: cx + rx,
                y: cy,
                itemStyle: { color: '#334155', borderColor: '#94a3b8', borderWidth: 1.5 },
                label: { position: 'right', distance: 7 }
              },
              {
                name: '③ 収益性',
                x: cx,
                y: cy + ry,
                itemStyle: { color: marginColor, borderColor: marginColor, borderWidth: 1.5 },
                label: { position: 'bottom', distance: 7 }
              },
              {
                name: '④ 再投資・防御',
                x: cx - rx,
                y: cy,
                itemStyle: { color: '#1e3a5f', borderColor: '#60a5fa', borderWidth: 1.5 },
                label: { position: 'left', distance: 7 }
              },
              {
                name: centerName,
                x: cx,
                y: cy,
                symbolSize: width < 520 ? 56 : 64,
                itemStyle: {
                  color: isHazardMode ? '#3f1719' : '#172033',
                  borderColor: isHazardMode ? '#f87171' : '#60a5fa',
                  borderWidth: 1.5
                },
                label: {
                  show: true,
                  position: 'inside',
                  color: '#f8fafc',
                  fontSize: 9,
                  fontWeight: 700,
                  fontFamily: chartFont
                }
              }
            ],
            links: [
              { source: '① 提供価値', target: '② 継続・切替摩擦' },
              { source: '② 継続・切替摩擦', target: '③ 収益性' },
              { source: '③ 収益性', target: '④ 再投資・防御' },
              { source: '④ 再投資・防御', target: '① 提供価値' }
            ],
            lineStyle: {
              color: isHazardMode ? '#ef4444' : '#60a5fa',
              width: 1.75,
              opacity: 0.55,
              curveness: 0.23
            },
            emphasis: { focus: 'adjacency' }
          }
        ]
      };

      try {
        myChart.setOption(option, true);
        myChart.resize();
      } catch (error) {
        console.error('[FlywheelEngineDiagram] ECharts rendering suppressed:', error);
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
  }, [entity.name, hasEnoughEvidence, isHazardMode, margin, node1, node2, node3, node4]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  if (!hasEnoughEvidence) {
    return (
      <section id="section-flywheel" className="rounded-lg border border-white/[0.10] bg-[#11151d] p-4">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">強化ループは未確定</h3>
            <p className="mt-1 text-xs leading-relaxed text-zinc-400">
              構造に関係する VERIFIED / REPORTED / POST_MORTEM の根拠が2件未満です。一般的な「フライホイール」を自動生成して埋めません。
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="section-flywheel"
      className={`rounded-lg border bg-[#11151d] p-4 sm:p-5 ${isHazardMode ? 'border-red-500/30' : 'border-white/[0.10]'}`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex items-start gap-2.5">
          <RotateCw className={`mt-0.5 h-4 w-4 shrink-0 ${isHazardMode ? 'text-red-400' : 'text-blue-400'}`} />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {isHazardMode ? '悪化ループの構造仮説' : '強化ループの構造仮説'}
            </h3>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              4要素のつながりを仮説として可視化。矢印は因果を断定しません。
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="rounded border border-white/[0.10] bg-white/[0.03] px-2 py-1">構造根拠 {structuralCards.length}件</span>
          <span className="rounded border border-white/[0.10] bg-white/[0.03] px-2 py-1">VERIFIED {verifiedCount}件</span>
        </div>
      </div>

      <div className="rounded-md border border-white/[0.08] bg-[#0b0f15] p-2">
        <div
          ref={chartRef}
          className="h-[300px] w-full sm:h-[340px]"
          role="img"
          aria-label={`${entity.name}の構造仮説。提供価値: ${node1}。継続・切替摩擦: ${node2}。収益性: ${node3}。再投資・防御: ${node4}。因果関係は未確定。`}
        />
      </div>

      <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
        <HypothesisLine index="01" label="提供価値" text={node1} />
        <HypothesisLine index="02" label="継続・切替摩擦" text={node2} />
        <HypothesisLine index="03" label="収益性" text={node3} />
        <HypothesisLine index="04" label="再投資・防御" text={node4} />
      </div>

      <div className="mt-3 border-t border-white/[0.06] pt-3 text-[10px] leading-relaxed text-zinc-500">
        <span className="font-medium text-zinc-400">参照根拠:</span>{' '}
        {structuralCards.slice(0, 3).map((card, index) => (
          <React.Fragment key={card.id}>
            {index > 0 && ' / '}
            <span>{card.title} [{card.evidenceStatus}]</span>
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

function HypothesisLine({ index, label, text }: { index: string; label: string; text: string }) {
  return (
    <div className="rounded-md border border-white/[0.07] bg-[#151a23] px-3 py-2.5">
      <div className="flex items-center gap-2 text-[10px] text-zinc-500">
        <span className="font-mono tabular-nums">{index}</span>
        <span>{label}</span>
      </div>
      <p className="mt-1 leading-relaxed text-zinc-300">{text}</p>
    </div>
  );
}
