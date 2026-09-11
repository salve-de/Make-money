'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  ColorType,
  LineSeries,
  AreaSeries,
  IChartApi,
  ISeriesApi,
  LineData,
  AreaData,
} from 'lightweight-charts';
import { ToolTrendItem } from '@/lib/intelligence/macro-aggregator';

export type TimeRangeKey = '3M' | '6M' | '1Y' | 'ALL';

interface TradingViewMigrationChartProps {
  timeline: string[]; // e.g. ['2025.10', ..., '2026.09']
  tools: ToolTrendItem[];
  categoryLabel?: string;
}

const SERIES_PALETTE = [
  {
    line: '#22d3ee', // cyan (Leader)
    areaTop: 'rgba(34, 211, 238, 0.24)',
    areaBottom: 'rgba(34, 211, 238, 0.00)',
    badgeBg: 'bg-cyan-500/10',
    badgeBorder: 'border-cyan-500/30',
    text: 'text-cyan-400',
  },
  {
    line: '#f43f5e', // rose
    areaTop: 'rgba(244, 63, 94, 0.16)',
    areaBottom: 'rgba(244, 63, 94, 0.00)',
    badgeBg: 'bg-rose-500/10',
    badgeBorder: 'border-rose-500/30',
    text: 'text-rose-400',
  },
  {
    line: '#a855f7', // purple
    areaTop: 'rgba(168, 85, 247, 0.16)',
    areaBottom: 'rgba(168, 85, 247, 0.00)',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30',
    text: 'text-purple-400',
  },
  {
    line: '#eab308', // amber
    areaTop: 'rgba(234, 179, 8, 0.16)',
    areaBottom: 'rgba(234, 179, 8, 0.00)',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30',
    text: 'text-amber-400',
  },
];

const TIME_RANGES: { key: TimeRangeKey; label: string; count: number }[] = [
  { key: '3M', label: '3ヶ月', count: 3 },
  { key: '6M', label: '6ヶ月', count: 6 },
  { key: '1Y', label: '1年', count: 12 },
  { key: 'ALL', label: '全期間', count: 999 },
];

export const TradingViewMigrationChart: React.FC<TradingViewMigrationChartProps> = ({
  timeline,
  tools,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // 選択された時間軸レンジ（デフォルト1年）
  const [selectedRange, setSelectedRange] = useState<TimeRangeKey>('1Y');

  // ホバー時のリアルタイム値
  const [legendValues, setLegendValues] = useState<{ [toolName: string]: number }>({});
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // 期間に応じたスライスインデックスの計算
  const sliceStartIndex = useMemo(() => {
    const rangeMeta = TIME_RANGES.find((r) => r.key === selectedRange);
    const count = rangeMeta ? rangeMeta.count : 12;
    if (count >= timeline.length) return 0;
    return Math.max(0, timeline.length - count);
  }, [selectedRange, timeline]);

  const visibleTimeline = useMemo(() => {
    return timeline.slice(sliceStartIndex);
  }, [timeline, sliceStartIndex]);

  // 各ツールの期間内増減率（Delta）を計算
  const periodDeltas = useMemo(() => {
    const deltas: { [toolName: string]: number } = {};
    tools.forEach((tool) => {
      const shares = tool.historyShares || [];
      const startShare = shares[sliceStartIndex] ?? shares[0] ?? tool.currentShare;
      const endShare = shares[shares.length - 1] ?? tool.currentShare;
      deltas[tool.name] = Number((endShare - startShare).toFixed(1));
    });
    return deltas;
  }, [tools, sliceStartIndex]);

  // チャート初期化および更新
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 既存チャートをクリーンアップ
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 600;
    const height = 360; // 視認性極大化のため260pxから360pxへ拡大

    // TradingView チャートインスタンス生成
    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#060709' },
        textColor: '#a1a1aa',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(34, 211, 238, 0.5)',
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: '#0f172a',
        },
        horzLine: {
          color: 'rgba(34, 211, 238, 0.5)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0f172a',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.14,
          bottom: 0.12,
        },
        entireTextOnly: false,
        alignLabels: true,
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        fixLeftEdge: true,
        fixRightEdge: true,
        rightOffset: 1,
        timeVisible: true,
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    // timeline 日付の変換 ('2025.10' ➔ '2025-10-01')
    const formattedDates = visibleTimeline.map((d) => {
      const parts = d.split('.');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-01`;
    });

    // シリーズの追加
    const currentSeriesList: { name: string; series: ISeriesApi<'Line' | 'Area'> }[] = [];

    tools.forEach((tool, idx) => {
      const palette = SERIES_PALETTE[idx % SERIES_PALETTE.length];
      const toolVisibleShares = (tool.historyShares || []).slice(sliceStartIndex);

      // 1位のトップシェアツールにはエリアグラデーション（AreaSeries）で高級感と視認性を付与
      if (idx === 0) {
        const areaSeries = chart.addSeries(AreaSeries, {
          lineColor: palette.line,
          topColor: palette.areaTop,
          bottomColor: palette.areaBottom,
          lineWidth: 3,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 5,
          crosshairMarkerBorderColor: '#060709',
          crosshairMarkerBackgroundColor: palette.line,
          lastValueVisible: true,
          priceLineVisible: false,
          priceFormat: {
            type: 'custom',
            formatter: (price: number) => `${price.toFixed(1)}%`,
          },
        });

        const seriesData: AreaData[] = toolVisibleShares.map((share, i) => ({
          time: formattedDates[i] || `2026-0${i + 1}-01`,
          value: share,
        }));

        areaSeries.setData(seriesData);
        currentSeriesList.push({ name: tool.name, series: areaSeries });
      } else {
        // 2位以降はくっきりとした折れ線
        const lineSeries = chart.addSeries(LineSeries, {
          color: palette.line,
          lineWidth: 2,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          crosshairMarkerBorderColor: '#060709',
          crosshairMarkerBackgroundColor: palette.line,
          lastValueVisible: true,
          priceLineVisible: false,
          priceFormat: {
            type: 'custom',
            formatter: (price: number) => `${price.toFixed(1)}%`,
          },
        });

        const seriesData: LineData[] = toolVisibleShares.map((share, i) => ({
          time: formattedDates[i] || `2026-0${i + 1}-01`,
          value: share,
        }));

        lineSeries.setData(seriesData);
        currentSeriesList.push({ name: tool.name, series: lineSeries });
      }
    });

    // 初期レジェンド値（最新月）
    const initialLegend: { [toolName: string]: number } = {};
    tools.forEach((t) => {
      const shares = t.historyShares || [];
      initialLegend[t.name] = shares[shares.length - 1] ?? t.currentShare;
    });
    setLegendValues(initialLegend);
    setHoveredDate(visibleTimeline[visibleTimeline.length - 1]);

    // クロスヘア移動時のリアルタイムトラッキング
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setLegendValues(initialLegend);
        setHoveredDate(visibleTimeline[visibleTimeline.length - 1]);
        return;
      }

      const updatedLegend: { [toolName: string]: number } = {};
      currentSeriesList.forEach(({ name, series }) => {
        const data = param.seriesData.get(series) as LineData | AreaData | undefined;
        if (data && typeof data.value === 'number') {
          updatedLegend[name] = data.value;
        } else {
          updatedLegend[name] = initialLegend[name] || 0;
        }
      });

      setLegendValues(updatedLegend);
      const timeStr = String(param.time);
      setHoveredDate(timeStr.replace(/-/g, '.').slice(0, 7));
    });

    chart.timeScale().fitContent();

    // リサイズ対応
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [visibleTimeline, tools, sliceStartIndex]);

  return (
    <div className="flex flex-col w-full bg-[#060709]">
      {/* ─── Bloomberg HUD ツールバー（期間セレクター ＆ リアルタイム数値表示） ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 bg-[#090A0F] border-b border-white/[0.08] font-mono text-xs">
        {/* 左側: 観測時点 ＆ メタ */}
        <div className="flex items-center gap-2.5">
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold tracking-wide">
            TradingView Core
          </span>
          <div className="flex items-center gap-1.5 text-zinc-400 text-[11px]">
            <span>観測:</span>
            <span className="text-white font-bold">{hoveredDate || visibleTimeline[visibleTimeline.length - 1]}</span>
          </div>
          <span className="text-zinc-600 hidden sm:inline">|</span>
          <span className="text-zinc-500 text-[11px] hidden sm:inline">
            期間: {visibleTimeline[0]} 〜 {visibleTimeline[visibleTimeline.length - 1]}
          </span>
        </div>

        {/* 右側: 期間セレクターピル（3M / 6M / 1Y / ALL） */}
        <div className="flex items-center gap-1 bg-[#050608] p-1 rounded-md border border-white/[0.08] self-start md:self-auto">
          <span className="text-[10px] text-zinc-500 uppercase px-1.5 font-bold">期間:</span>
          {TIME_RANGES.map((range) => {
            const isActive = selectedRange === range.key;
            return (
              <button
                key={range.key}
                onClick={() => setSelectedRange(range.key)}
                className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
                }`}
              >
                {range.key}
                <span className="ml-1 text-[9px] font-normal text-zinc-500">({range.label})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── ツール別リアルタイム数値＆増減ストリップ ─── */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-4 py-2.5 bg-[#07080C] border-b border-white/[0.04] text-xs font-mono">
        <span className="text-[10px] uppercase text-zinc-500 tracking-wider">配分推移:</span>
        {tools.map((tool, idx) => {
          const palette = SERIES_PALETTE[idx % SERIES_PALETTE.length];
          const currentVal = legendValues[tool.name] ?? tool.currentShare;
          const delta = periodDeltas[tool.name] ?? 0;
          return (
            <div
              key={tool.name}
              className={`flex items-center gap-2 px-2.5 py-1 rounded border ${palette.badgeBg} ${palette.badgeBorder}`}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: palette.line }} />
              <span className="text-zinc-300 text-[11px] font-semibold">{tool.name.split(' ')[0]}</span>
              <span className="font-bold text-white text-xs">{currentVal.toFixed(1)}%</span>
              <span
                className={`text-[10px] font-mono font-bold ${
                  delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-zinc-400'
                }`}
              >
                {delta > 0 ? `+${delta}%` : `${delta}%`}
              </span>
            </div>
          );
        })}
      </div>

      {/* ─── チャート Canvas マウント領域（360pxの高密度・高視認性ビュー） ─── */}
      <div ref={chartContainerRef} className="w-full relative h-[360px] bg-[#060709]" />
    </div>
  );
};
