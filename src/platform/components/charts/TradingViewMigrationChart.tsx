'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineSeries, IChartApi, ISeriesApi, LineData } from 'lightweight-charts';
import { ToolTrendItem } from '@/lib/intelligence/macro-aggregator';

interface TradingViewMigrationChartProps {
  timeline: string[]; // ['2026.04', '2026.06', '2026.08', '2026.09']
  tools: ToolTrendItem[];
}

const LINE_COLORS = [
  { stroke: '#22d3ee', label: 'text-cyan-400' },    // cyan
  { stroke: '#f43f5e', label: 'text-rose-400' },    // rose
  { stroke: '#a855f7', label: 'text-purple-400' },  // purple
  { stroke: '#eab308', label: 'text-amber-400' },   // amber
];

export const TradingViewMigrationChart: React.FC<TradingViewMigrationChartProps> = ({
  timeline,
  tools,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  // ホバー時のリアルタイム値
  const [legendValues, setLegendValues] = useState<{ [toolName: string]: number }>({});
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 初期化前の古いチャートを破棄
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 600;
    const height = 260;

    // TradingView チャートインスタンス生成
    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: '#060709' },
        textColor: '#71717a',
        fontFamily: 'monospace, -apple-system, sans-serif',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
      },
      crosshair: {
        vertLine: {
          color: 'rgba(34, 211, 238, 0.4)',
          width: 1,
          style: 3, // dashed
          labelBackgroundColor: '#0e1015',
        },
        horzLine: {
          color: 'rgba(34, 211, 238, 0.4)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#0e1015',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        scaleMargins: {
          top: 0.15,
          bottom: 0.15,
        },
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.08)',
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: false,
      handleScale: false,
    });

    chartRef.current = chart;

    // timeline 日付の変換 ('2026.04' ➔ '2026-04-01')
    const formattedDates = timeline.map((d) => {
      const parts = d.split('.');
      return `${parts[0]}-${parts[1].padStart(2, '0')}-01`;
    });

    // シリーズの追加
    const seriesList: { name: string; series: ISeriesApi<'Line'> }[] = [];

    tools.forEach((tool, idx) => {
      const color = LINE_COLORS[idx % LINE_COLORS.length];
      const lineSeries = chart.addSeries(LineSeries, {
        color: color.stroke,
        lineWidth: 2,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        crosshairMarkerBorderColor: '#060709',
        crosshairMarkerBackgroundColor: color.stroke,
        priceFormat: {
          type: 'custom',
          formatter: (price: number) => `${price.toFixed(1)}%`,
        },
      });

      const seriesData: LineData[] = tool.historyShares.map((share, i) => ({
        time: formattedDates[i] || `2026-0${i + 1}-01`,
        value: share,
      }));

      lineSeries.setData(seriesData);
      seriesList.push({ name: tool.name, series: lineSeries });
    });

    // 初期レジェンド値
    const initialLegend: { [toolName: string]: number } = {};
    tools.forEach((t) => {
      initialLegend[t.name] = t.currentShare;
    });
    setLegendValues(initialLegend);
    setHoveredDate(timeline[timeline.length - 1]);

    // クロスヘア移動時のリアルタイムトラッキング
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !param.seriesData) {
        setLegendValues(initialLegend);
        setHoveredDate(timeline[timeline.length - 1]);
        return;
      }

      const updatedLegend: { [toolName: string]: number } = {};
      seriesList.forEach(({ name, series }) => {
        const data = param.seriesData.get(series) as LineData | undefined;
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

    // リサイズ監視
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
  }, [timeline, tools]);

  return (
    <div className="flex flex-col w-full">
      {/* TradingView レジェンド（リアルタイム数値表示バー） */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 bg-[#08090D] border-b border-white/[0.06] text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
            TradingView Canvas
          </span>
          <span className="text-zinc-500 text-[11px]">観測時点:</span>
          <span className="text-zinc-200 font-bold">{hoveredDate || timeline[timeline.length - 1]}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {tools.map((tool, idx) => {
            const color = LINE_COLORS[idx % LINE_COLORS.length];
            const currentVal = legendValues[tool.name] ?? tool.currentShare;
            return (
              <div key={tool.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.stroke }} />
                <span className="text-zinc-400 text-[11px]">{tool.name.split(' ')[0]}:</span>
                <span className="font-bold text-white text-xs">{currentVal.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* チャートCanvasマウントコンテナ */}
      <div ref={chartContainerRef} className="w-full relative h-[260px] bg-[#060709]" />
    </div>
  );
};
