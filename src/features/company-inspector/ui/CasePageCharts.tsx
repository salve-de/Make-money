'use client';

import React, { useEffect, useRef, useState } from 'react';

import type { CasePage } from '@/shared/case-page';
import { seriesFor } from '@/shared/case-page-series';
import { formatYen } from '@/platform/utils/moneyDisplay';
import { earningsOption, sankeyOption, type ChartTheme } from './case-chart-options';

/**
 * 事例の詳しい画面の図。お金の流れ＝ECharts のサンキー図、稼ぎの推移＝ECharts の折れ線（募集額は棒）。
 * ECharts は図が画面に入る時だけ、使う部品（サンキー・折れ線・棒・散布・格子・SVG描画）だけを後から読み込む。
 * 読み込む前と、文字だけで読む人のために、図の中身を aria-label に入れる。決め方は docs/design/CASE_CHARTS.md。
 */

type EChartsCore = typeof import('echarts/core');
let loader: Promise<EChartsCore> | null = null;
function loadECharts(): Promise<EChartsCore> {
  loader ??= Promise.all([
    import('echarts/core'),
    import('echarts/charts'),
    import('echarts/components'),
    import('echarts/renderers'),
  ]).then(([core, charts, components, renderers]) => {
    core.use([charts.SankeyChart, charts.LineChart, charts.BarChart, charts.ScatterChart, components.GridComponent, renderers.SVGRenderer]);
    return core;
  });
  return loader;
}

function readTheme(): ChartTheme {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    bg: v('--term-bg'), line: v('--term-line'), lineSoft: v('--term-line-soft'), strong: v('--term-fg-strong'), fg: v('--term-fg'),
    sub: v('--term-sub'), label: v('--term-label'), muted: v('--term-muted'), accent: v('--term-accent'),
    sans: getComputedStyle(document.body).fontFamily, mono: v('--font-mono') || 'monospace',
  };
}

/** 枠の幅に合わせて設定を作り直して描く。幅が変わったら描き直す。 */
function EChart({ build, dataKey, label, minHeight, kind }: {
  build: (theme: ChartTheme, width: number) => { option: Record<string, unknown>; height: number };
  /** 中身が変わった時だけ描き直すための鍵 */
  dataKey: string;
  label: string;
  minHeight: number;
  kind: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(minHeight);
  const buildRef = useRef(build);
  useEffect(() => {
    buildRef.current = build;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let chart: ReturnType<EChartsCore['init']> | null = null;
    let disposed = false;
    let lastWidth = 0;
    const draw = (core: EChartsCore) => {
      const width = el.clientWidth;
      if (!width || width === lastWidth) return;
      lastWidth = width;
      const { option, height: h } = buildRef.current(readTheme(), width);
      setHeight(h);
      el.style.height = `${h}px`;
      chart ??= core.init(el, undefined, { renderer: 'svg' });
      chart.setOption(option, true);
      chart.resize({ width, height: h });
    };
    let observer: ResizeObserver | null = null;
    const start = () => loadECharts().then((core) => {
      if (disposed) return;
      draw(core);
      observer = new ResizeObserver(() => draw(core));
      observer.observe(el);
    });
    // 画面に入る少し前に読み込む
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); void start(); }
    }, { rootMargin: '400px 0px' });
    io.observe(el);
    return () => { disposed = true; io.disconnect(); observer?.disconnect(); chart?.dispose(); };
  }, [dataKey]);
  return <div ref={ref} role="img" aria-label={label} data-chart={kind} className="w-full" style={{ height }} />;
}

/** お金の流れ。払う人 → 間に入る所 → その会社 → 払う先 を帯で結ぶ。 */
export function MoneyFlow({ flows, about = '' }: { flows: NonNullable<CasePage['flows']>; about?: string }) {
  if (flows.length === 0) return null;
  const label = flows.map((f) => `${f.from}から${f.to}へ ${f.label}`).join('。');
  return (
    <div data-case-flow="money" className="max-w-[880px]">
      <EChart build={(t, w) => sankeyOption(flows, t, w, about)} dataKey={JSON.stringify(flows)} label={label} minHeight={240} kind="sankey" />
    </div>
  );
}

/** 稼ぎの推移。2点以上そろった種類だけ出し、無ければ null（章ごと出さない）。 */
export function EarningsCharts({ timeline }: { timeline: CasePage['timeline'] }) {
  const all = seriesFor(timeline);
  if (all.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-5" data-case-charts="earnings">
      {all.map((s) => {
        const label = `${s.title}の推移：${s.points.map((p) => `${p.when} ${formatYen(p.yen, { approx: true })}`).join('、')}`;
        return (
          <figure key={s.kind} className="m-0 max-w-[640px]" data-series={s.kind}>
            <figcaption className="mb-1 text-sm font-semibold text-term-fg-strong">{s.title}</figcaption>
            <EChart build={(t, w) => ({ option: earningsOption(s, t, w), height: w < 560 ? 200 : 220 })} dataKey={JSON.stringify(s.points)} label={label} minHeight={220} kind={s.shape} />
          </figure>
        );
      })}
    </div>
  );
}
