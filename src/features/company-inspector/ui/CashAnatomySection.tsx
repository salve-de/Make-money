'use client';

import { inspectFinancialIntegrity } from '@/shared/financial-integrity';
import * as echarts from 'echarts';
import { Banknote, GitBranch, Table, TrendingDown } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import type { InspectorSectionProps } from '../model/section-props';
import { IncompleteCashSummary } from './IncompleteCashSummary';

type CashViewMode = 'WATERFALL' | 'SANKEY' | 'TABLE';

const chartFont = 'Inter, "Noto Sans JP", system-ui, sans-serif';

function percentOf(value: number, revenue: number): number {
  return revenue > 0 ? Math.round((value / revenue) * 100) : 0;
}

export function CashAnatomySection({
  entity,
  isHazardMode,
  formatMoney,
  isFinancialUnavailable
}: Pick<
  InspectorSectionProps,
  'entity' | 'isHazardMode' | 'formatMoney' | 'isFinancialUnavailable'
>) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  const rev = Math.max(entity.pnl?.monthlyRevenue ?? 0, 0);
  const cogs = Math.max(entity.pnl?.cogs ?? 0, 0);
  const opexObj = entity.pnl?.operatingExpenses ?? {
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
  const profit = entity.pnl?.operatingProfit ?? 0;
  const grossProfit = rev - cogs;
  const isLoss = profit < 0;
  const actualCogsPct = percentOf(cogs, rev);
  const opexPct = percentOf(totalOpex, rev);
  const actualProfitPct = percentOf(profit, rev);
  const grossProfitPct = percentOf(grossProfit, rev);
  const canRenderSankey = grossProfit >= 0;
  const integrity = inspectFinancialIntegrity(entity.pnl);
  const hasConflict = integrity.profitConflict || integrity.grossConflict || integrity.marginConflict;
  const incompleteInputs = Boolean(
    entity.pnl.isRevenueUnconfirmed ||
      entity.pnl.isOperatingProfitUnconfirmed ||
      entity.pnl.isCostsUnconfirmed ||
      entity.pnl.isCogsUnconfirmed ||
      rev <= 0
  );

  const defaultMode: CashViewMode = canRenderSankey && (actualCogsPct >= 20 || opexPct >= 20)
    ? 'SANKEY'
    : 'WATERFALL';
  const [viewMode, setViewMode] = useState<CashViewMode>(defaultMode);
  const effectiveViewMode: CashViewMode = viewMode === 'SANKEY' && !canRenderSankey
    ? 'WATERFALL'
    : viewMode;

  useEffect(() => {
    const el = chartRef.current;
    if (
      !el ||
      effectiveViewMode === 'TABLE' ||
      isFinancialUnavailable ||
      incompleteInputs ||
      hasConflict
    ) {
      return;
    }

    let myChart = chartInstance.current;
    if (!myChart) {
      myChart = echarts.init(el, 'dark');
      chartInstance.current = myChart;
    }

    const financialSummary = `売上高 ${formatMoney(rev)}、売上原価 ${formatMoney(cogs)}、粗利益 ${formatMoney(grossProfit)}、販管費 ${formatMoney(totalOpex)}、営業利益 ${formatMoney(profit)}。`;

    const renderChart = () => {
      if (!el || !myChart || el.clientWidth <= 0 || el.clientHeight <= 0) return;

      let option: echarts.EChartsOption;

      if (effectiveViewMode === 'SANKEY' && canRenderSankey) {
        const revenueNode = '売上高 100%';
        const cogsNode = `売上原価 ${actualCogsPct}%`;
        const grossNode = `粗利益 ${grossProfitPct}%`;
        const opexNode = `販管費 ${opexPct}%`;
        const profitNode = `営業利益 ${actualProfitPct}%`;
        const lossFundingNode = `営業損失 ${Math.abs(actualProfitPct)}%`;

        const nodes = [
          {
            name: revenueNode,
            itemStyle: { color: '#60a5fa', borderColor: '#93c5fd', borderWidth: 1 }
          },
          ...(cogs > 0
            ? [{
                name: cogsNode,
                itemStyle: { color: '#64748b', borderColor: '#94a3b8', borderWidth: 1 }
              }]
            : []),
          {
            name: grossNode,
            itemStyle: { color: '#3b82f6', borderColor: '#60a5fa', borderWidth: 1 }
          },
          ...(totalOpex > 0
            ? [{
                name: opexNode,
                itemStyle: { color: '#475569', borderColor: '#64748b', borderWidth: 1 }
              }]
            : []),
          ...(profit > 0
            ? [{
                name: profitNode,
                itemStyle: { color: '#22c55e', borderColor: '#4ade80', borderWidth: 1 }
              }]
            : []),
          ...(profit < 0
            ? [{
                name: lossFundingNode,
                itemStyle: { color: '#dc2626', borderColor: '#f87171', borderWidth: 1 }
              }]
            : [])
        ];

        const links = [
          ...(cogs > 0 ? [{ source: revenueNode, target: cogsNode, value: cogs }] : []),
          { source: revenueNode, target: grossNode, value: grossProfit },
          ...(profit >= 0 && totalOpex > 0
            ? [{ source: grossNode, target: opexNode, value: totalOpex }]
            : []),
          ...(profit > 0 ? [{ source: grossNode, target: profitNode, value: profit }] : []),
          ...(profit < 0 && grossProfit > 0
            ? [{ source: grossNode, target: opexNode, value: grossProfit }]
            : []),
          ...(profit < 0
            ? [{ source: lossFundingNode, target: opexNode, value: Math.abs(profit) }]
            : [])
        ];

        option = {
          backgroundColor: 'transparent',
          aria: {
            enabled: true,
            decal: { show: true },
            description: `月次損益フロー。${financialSummary}`
          },
          tooltip: {
            trigger: 'item',
            triggerOn: 'mousemove',
            backgroundColor: '#111827',
            borderColor: '#334155',
            borderWidth: 1,
            textStyle: { color: '#f8fafc', fontSize: 12, fontFamily: chartFont },
            formatter: (params: unknown) => {
              const p = params as {
                dataType?: string;
                name?: string;
                value?: number;
                data?: { source?: string; target?: string };
              };
              if (p.dataType === 'edge' && p.data && typeof p.value === 'number') {
                return `<strong>${p.data.source} → ${p.data.target}</strong><br/>${formatMoney(p.value)} / 売上比 ${percentOf(p.value, rev)}%`;
              }
              return `<strong>${p.name || ''}</strong>`;
            }
          },
          series: [
            {
              type: 'sankey',
              top: 18,
              bottom: 18,
              left: 16,
              right: el.clientWidth < 640 ? 105 : 150,
              nodeWidth: 12,
              nodeGap: 20,
              draggable: false,
              emphasis: { focus: 'adjacency' },
              data: nodes,
              links,
              label: {
                color: '#e2e8f0',
                fontFamily: chartFont,
                fontSize: el.clientWidth < 520 ? 10 : 11,
                fontWeight: 600,
                position: 'right'
              },
              itemStyle: { borderWidth: 1 },
              lineStyle: {
                color: 'source',
                opacity: 0.34,
                curveness: 0.48
              }
            }
          ]
        };
      } else {
        const categories = ['売上高', '売上原価', '粗利益', '販管費', '営業利益'];

        if (!isLoss && grossProfit >= 0) {
          option = {
            backgroundColor: 'transparent',
            aria: {
              enabled: true,
              decal: { show: true },
              description: `月次損益ブリッジ。${financialSummary}`
            },
            tooltip: {
              trigger: 'axis',
              axisPointer: { type: 'shadow' },
              backgroundColor: '#111827',
              borderColor: '#334155',
              textStyle: { color: '#f8fafc', fontFamily: chartFont },
              formatter: (params: unknown) => {
                const arr = params as Array<{ seriesName?: string; name?: string; value?: number }>;
                const visible = arr.find((item) => item.seriesName === '損益');
                if (!visible) return '';
                return `<strong>${visible.name || ''}</strong><br/>${formatMoney(Math.abs(visible.value || 0))}`;
              }
            },
            grid: { top: 24, bottom: 40, left: 64, right: 20 },
            xAxis: {
              type: 'category',
              data: categories,
              axisLine: { lineStyle: { color: '#475569' } },
              axisLabel: { color: '#cbd5e1', fontFamily: chartFont, fontSize: 10 }
            },
            yAxis: {
              type: 'value',
              splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.10)' } },
              axisLabel: {
                color: '#94a3b8',
                fontFamily: chartFont,
                formatter: (value: number) => formatMoney(value)
              }
            },
            series: [
              {
                name: '基準位置',
                type: 'bar',
                stack: 'cash',
                silent: true,
                itemStyle: { color: 'transparent', borderColor: 'transparent' },
                emphasis: { itemStyle: { color: 'transparent', borderColor: 'transparent' } },
                data: [0, grossProfit, 0, profit, 0]
              },
              {
                name: '損益',
                type: 'bar',
                stack: 'cash',
                barMaxWidth: 48,
                label: {
                  show: true,
                  position: 'top',
                  color: '#e2e8f0',
                  fontFamily: chartFont,
                  fontSize: 10,
                  formatter: (p: { value?: unknown }) => formatMoney(Math.abs(Number(p.value) || 0))
                },
                data: [
                  { value: rev, itemStyle: { color: '#60a5fa' } },
                  { value: cogs, itemStyle: { color: '#64748b' } },
                  { value: grossProfit, itemStyle: { color: '#3b82f6' } },
                  { value: totalOpex, itemStyle: { color: '#475569' } },
                  { value: profit, itemStyle: { color: '#22c55e' } }
                ]
              }
            ]
          };
        } else {
          option = {
            backgroundColor: 'transparent',
            aria: {
              enabled: true,
              decal: { show: true },
              description: `赤字を含む符号付き損益ブリッジ。${financialSummary}`
            },
            tooltip: {
              trigger: 'axis',
              axisPointer: { type: 'shadow' },
              backgroundColor: '#111827',
              borderColor: '#334155',
              textStyle: { color: '#f8fafc', fontFamily: chartFont },
              formatter: (params: unknown) => {
                const arr = params as Array<{ name?: string; value?: number }>;
                const item = arr?.[0];
                return item ? `<strong>${item.name || ''}</strong><br/>${formatMoney(item.value || 0)}` : '';
              }
            },
            grid: { top: 24, bottom: 40, left: 64, right: 20 },
            xAxis: {
              type: 'category',
              data: categories,
              axisLine: { lineStyle: { color: '#475569' } },
              axisLabel: { color: '#cbd5e1', fontFamily: chartFont, fontSize: 10 }
            },
            yAxis: {
              type: 'value',
              splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.10)' } },
              axisLabel: {
                color: '#94a3b8',
                fontFamily: chartFont,
                formatter: (value: number) => formatMoney(value)
              }
            },
            series: [
              {
                name: '損益',
                type: 'bar',
                barMaxWidth: 48,
                label: {
                  show: true,
                  position: 'top',
                  color: '#e2e8f0',
                  fontFamily: chartFont,
                  fontSize: 10,
                  formatter: (p: { value?: unknown }) => formatMoney(Number(p.value) || 0)
                },
                data: [
                  { value: rev, itemStyle: { color: '#60a5fa' } },
                  { value: -cogs, itemStyle: { color: '#64748b' } },
                  { value: grossProfit, itemStyle: { color: grossProfit < 0 ? '#dc2626' : '#3b82f6' } },
                  { value: -totalOpex, itemStyle: { color: '#475569' } },
                  { value: profit, itemStyle: { color: '#dc2626' } }
                ]
              }
            ]
          };
        }
      }

      try {
        myChart.setOption(option, true);
        myChart.resize();
      } catch (error) {
        console.error('[CashAnatomySection] ECharts rendering suppressed:', error);
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
  }, [
    effectiveViewMode,
    rev,
    cogs,
    grossProfit,
    totalOpex,
    profit,
    isLoss,
    actualCogsPct,
    grossProfitPct,
    opexPct,
    actualProfitPct,
    canRenderSankey,
    formatMoney,
    isFinancialUnavailable,
    incompleteInputs,
    hasConflict
  ]);

  useEffect(() => {
    return () => {
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
  }, []);

  if (isFinancialUnavailable) {
    return (
      <section id="section-cash-anatomy" className="rounded-lg border border-white/[0.10] bg-[#11151d] p-4 text-xs">
        <p className="font-semibold text-zinc-200">財務データは未確認です。</p>
        <p className="mt-1 text-zinc-400">月商・原価・営業利益の確認が揃うまで、フロー図を生成しません。</p>
      </section>
    );
  }

  if (incompleteInputs) return <IncompleteCashSummary entity={entity} formatMoney={formatMoney} />;

  if (hasConflict) {
    return (
      <section id="section-cash-anatomy" className="rounded-lg border border-amber-500/30 bg-[#11151d] p-4 text-xs">
        <p className="font-semibold text-amber-200">財務数値に不整合があるため、図示を停止しています。</p>
        <p className="mt-1 text-zinc-400">
          売上−原価−販管費と記録された粗利益・営業利益の照合が通るまで、線幅や利益率を描画しません。
        </p>
      </section>
    );
  }

  const statusLabel = {
    VERIFIED: '一次確認',
    REPORTED: '報道・取材',
    ESTIMATED: '推定',
    POST_MORTEM: '事後検証',
    UNAVAILABLE: '未確認'
  }[entity.pnl.financialStatus || 'UNAVAILABLE'];

  return (
    <section
      id="section-cash-anatomy"
      className={`rounded-lg border bg-[#11151d] p-4 sm:p-5 ${
        isHazardMode ? 'border-red-500/30' : 'border-white/[0.10]'
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <Banknote className={`mt-0.5 h-4 w-4 shrink-0 ${isHazardMode ? 'text-red-400' : 'text-blue-400'}`} />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-zinc-100">月次損益の流れ</h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-400">
              売上が、原価・販管費・営業利益へどう分かれるかを同じ数値で表示します。
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400">
          <span className="rounded border border-white/[0.10] bg-white/[0.03] px-2 py-1">{statusLabel}</span>
          {entity.pnl.dataSnapshotPeriod && (
            <span className="rounded border border-white/[0.10] bg-white/[0.03] px-2 py-1">{entity.pnl.dataSnapshotPeriod}</span>
          )}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="売上高" value={formatMoney(rev)} tone="blue" />
        <Metric label="売上原価" value={formatMoney(cogs)} suffix={`${actualCogsPct}%`} />
        <Metric label="販管費" value={formatMoney(totalOpex)} suffix={`${opexPct}%`} />
        <Metric
          label="営業利益"
          value={formatMoney(profit)}
          suffix={`${actualProfitPct > 0 ? '+' : ''}${actualProfitPct}%`}
          tone={isLoss ? 'red' : 'green'}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-md border border-white/[0.10] bg-[#0b0f15] p-0.5 text-[11px]">
          <ViewButton
            active={effectiveViewMode === 'WATERFALL'}
            onClick={() => setViewMode('WATERFALL')}
            icon={<TrendingDown className="h-3.5 w-3.5" />}
            label="損益ブリッジ"
          />
          <ViewButton
            active={effectiveViewMode === 'SANKEY'}
            onClick={() => setViewMode('SANKEY')}
            icon={<GitBranch className="h-3.5 w-3.5" />}
            label="資金フロー"
            disabled={!canRenderSankey}
          />
          <ViewButton
            active={effectiveViewMode === 'TABLE'}
            onClick={() => setViewMode('TABLE')}
            icon={<Table className="h-3.5 w-3.5" />}
            label="明細"
          />
        </div>
        {!canRenderSankey && (
          <span className="text-[10px] text-zinc-500">粗利益が負のため、Sankey は表示しません。</span>
        )}
      </div>

      {effectiveViewMode === 'TABLE' ? (
        <div className="overflow-x-auto rounded-md border border-white/[0.08] bg-[#0b0f15]">
          <table className="w-full min-w-[620px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[10px] text-zinc-500">
                <th className="px-3 py-2 font-medium">勘定科目</th>
                <th className="px-3 py-2 text-right font-medium">月次金額</th>
                <th className="px-3 py-2 text-right font-medium">売上比</th>
                <th className="px-3 py-2 font-medium">意味</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              <FinancialRow label="売上高" value={formatMoney(rev)} ratio="100%" detail="本業の総売上" tone="blue" />
              <FinancialRow label="売上原価" value={`-${formatMoney(cogs)}`} ratio={`${actualCogsPct}%`} detail="売上に直接対応する原価" />
              <FinancialRow label="粗利益" value={formatMoney(grossProfit)} ratio={`${grossProfitPct}%`} detail="売上高 − 売上原価" tone={grossProfit < 0 ? 'red' : 'blue'} strong />
              <FinancialRow label="販管費" value={`-${formatMoney(totalOpex)}`} ratio={`${opexPct}%`} detail={`サーバー ${formatMoney(opexObj.serverAndApi || 0)} / 広告 ${formatMoney(opexObj.advertising || 0)} / 外注 ${formatMoney(opexObj.subcontracting || 0)} / ツール ${formatMoney(opexObj.toolsAndSaaS || 0)}`} />
              <FinancialRow label="営業利益" value={formatMoney(profit)} ratio={`${actualProfitPct > 0 ? '+' : ''}${actualProfitPct}%`} detail="粗利益 − 販管費（税引前）" tone={isLoss ? 'red' : 'green'} strong />
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-md border border-white/[0.08] bg-[#0b0f15] p-2">
          <div
            ref={chartRef}
            className="h-[280px] w-full sm:h-[320px]"
            role="img"
            aria-label={`月次損益図。売上高 ${formatMoney(rev)}、売上原価 ${formatMoney(cogs)}、粗利益 ${formatMoney(grossProfit)}、販管費 ${formatMoney(totalOpex)}、営業利益 ${formatMoney(profit)}。`}
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-2 text-[10px] leading-relaxed text-zinc-500">
        <p>売上高 {formatMoney(rev)} → 粗利益 {formatMoney(grossProfit)} → 営業利益 {formatMoney(profit)}。</p>
        <p>営業利益は税引後キャッシュや創業者の手取りではありません。</p>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  suffix,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: 'neutral' | 'blue' | 'green' | 'red';
}) {
  const valueClass = {
    neutral: 'text-zinc-100',
    blue: 'text-blue-300',
    green: 'text-emerald-300',
    red: 'text-red-300'
  }[tone];

  return (
    <div className="rounded-md border border-white/[0.07] bg-[#151a23] px-3 py-2.5">
      <span className="block text-[10px] text-zinc-500">{label}</span>
      <span className={`mt-0.5 block font-mono text-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
        {suffix && <span className="ml-1.5 text-[10px] font-medium text-zinc-500">{suffix}</span>}
      </span>
    </div>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  label,
  disabled = false
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/80 ${
        active
          ? 'bg-blue-500/15 text-blue-200'
          : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function FinancialRow({
  label,
  value,
  ratio,
  detail,
  tone = 'neutral',
  strong = false
}: {
  label: string;
  value: string;
  ratio: string;
  detail: string;
  tone?: 'neutral' | 'blue' | 'green' | 'red';
  strong?: boolean;
}) {
  const valueClass = {
    neutral: 'text-zinc-300',
    blue: 'text-blue-300',
    green: 'text-emerald-300',
    red: 'text-red-300'
  }[tone];

  return (
    <tr className={strong ? 'bg-white/[0.02]' : undefined}>
      <td className={`px-3 py-2.5 ${strong ? 'font-semibold text-zinc-100' : 'text-zinc-300'}`}>{label}</td>
      <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${valueClass}`}>{value}</td>
      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-zinc-400">{ratio}</td>
      <td className="px-3 py-2.5 text-[11px] text-zinc-500">{detail}</td>
    </tr>
  );
}
