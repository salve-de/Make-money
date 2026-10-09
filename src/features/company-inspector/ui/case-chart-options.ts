import type { CasePage } from '@/shared/case-page';
import type { Series } from '@/shared/case-page-series';
import { formatYen } from '@/platform/utils/moneyDisplay';

/**
 * 事例の図（お金の流れのサンキー図・稼ぎの推移）の ECharts 設定を作る。描く部品（CaseCharts.tsx）から切り離し、試験できる形にしてある。
 * 決め方の理由は docs/design/CASE_CHARTS.md。色は端末型のトークンを呼び出し側が読んで渡す（16進を書かない）。
 */

export type Flow = NonNullable<CasePage['flows']>[number];

export interface ChartTheme {
  bg: string; line: string; lineSoft: string; strong: string; fg: string; sub: string; label: string; muted: string; accent: string;
  sans: string; mono: string;
}

const ESTIMATED_RE = /推定|推測/;

/** 帯に添える文。ドルの額は落として円だけ残し、文の切れ目で行を分ける（「新作の先払い。例：134,553ドル（約2,018万円）」→「新作の先払い／例：約2,018万円」）。 */
export function shortFlowLabel(label: string): string {
  return label
    .replace(/約?[0-9][0-9,.]*(?:万|億)?ドル（(約?[^）]*?円)）/g, '$1')
    .replace(/（推定）|（推測）/g, '')
    .split('。')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}

const yenOf = (text: string): number | null => {
  const m = text.match(/約?([0-9][0-9,]*(?:\.[0-9]+)?)(億|万)?円/);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n * (m[2] === '億' ? 1e8 : m[2] === '万' ? 1e4 : 1) : null;
};

/**
 * 帯の太さを額で決めてよい時だけ、流れごとの円の額を返す。1本でも額が無い・1人あたりの値段・幅・割合が混ざる・期間（月／年）がそろわない・
 * 間に入る所で入る額と出る額が大きく食い違う時は null（太さを一定にする）。額を比べられない物を太さで並べると嘘の比率に見えるため。
 */
export function proportionalValues(flows: Flow[]): number[] | null {
  const values: number[] = [];
  const periods = new Set<string>();
  for (const f of flows) {
    const label = shortFlowLabel(f.label);
    if (/から|〜|～|例|あたり|1本|1回|1人|1件|％|%|利益率/.test(label)) return null;
    const lines = label.split('\n').filter((l) => yenOf(l) !== null);
    if (lines.length !== 1) return null;
    const yen = yenOf(lines[0])!;
    periods.add(lines[0].match(/^(月|年)/)?.[1] ?? '-');
    values.push(yen);
  }
  if (periods.size !== 1) return null;
  const names = [...new Set(flows.flatMap((f) => [f.from, f.to]))];
  for (const n of names) {
    const inSum = flows.reduce((s, f, i) => s + (f.to === n ? values[i] : 0), 0);
    const outSum = flows.reduce((s, f, i) => s + (f.from === n ? values[i] : 0), 0);
    if (inSum > 0 && outSum > 0 && Math.abs(inSum - outSum) / Math.max(inSum, outSum) > 0.25) return null;
  }
  return values;
}

/** 払う側ほど浅い段（一番長い道のりで数える）。払うだけの登場者（客）は必ず一番左の段に置き、客が左端にそろうようにする。 */
export function flowDepths(flows: Flow[]): Map<string, number> {
  const names = [...new Set(flows.flatMap((f) => [f.from, f.to]))];
  const depth = new Map(names.map((n) => [n, 0]));
  for (let pass = 0; pass < names.length; pass++) {
    for (const f of flows) depth.set(f.to, Math.max(depth.get(f.to)!, depth.get(f.from)! + 1));
  }
  return depth;
}

/**
 * 帯の文をどこに書くか。端の登場者（払うだけで1本だけ出す／受け取るだけで1本だけ入る）がいれば、その名前の下に書く（決算のサンキー図の作法）。
 * どちらも端でなければ、出る帯が1本だけの側（間に入る所）、入る帯が1本だけの側の順に寄せる。どれにも寄せられない時だけ帯の上に書く。
 */
export function labelPlacement(flows: Flow[]): ('from' | 'to' | 'edge')[] {
  const ins = (n: string) => flows.filter((f) => f.to === n).length;
  const outs = (n: string) => flows.filter((f) => f.from === n).length;
  return flows.map((f) => {
    if (ins(f.from) === 0 && outs(f.from) === 1) return 'from';
    if (outs(f.to) === 0 && ins(f.to) === 1) return 'to';
    if (outs(f.from) === 1) return 'from';
    if (ins(f.to) === 1) return 'to';
    return 'edge';
  });
}

const esc = (s: string) => s.replace(/[{}|]/g, '');

/**
 * 図の中の文を幅で折る（ECharts の自動の折り返しは装飾つきの文で行を崩すため、先に自分で折る）。
 * 金額（「約2,018万円」）と英語の語は途中で切らない。
 */
export function wrapText(text: string, maxPx: number, fontPx = 12): string[] {
  const cw = (c: string) => (/[\u0020-\u007e]/.test(c) ? fontPx * 0.62 : fontPx * 1.08);
  const tokens = text.match(/約?[0-9][0-9,.]*(?:万|億)?(?:円|ドル|%|％)?|[A-Za-z][A-Za-z0-9.'&-]*|./gu) ?? [];
  const lines: string[] = [];
  let cur = '';
  let curW = 0;
  for (const tok of tokens) {
    const w = [...tok].reduce((n, c) => n + cw(c), 0);
    if (cur && curW + w > maxPx && !/^[、。）」・：]$/.test(tok)) { lines.push(cur.trimEnd()); cur = ''; curW = 0; }
    if (!cur && tok === ' ') continue;
    cur += tok; curW += w;
  }
  if (cur) lines.push(cur.trimEnd());
  return lines;
}

export interface SankeyBuild { option: Record<string, unknown>; height: number }

/** お金の流れのサンキー図。width は描く枠の幅。560px 未満は上から下へ流す。 */
export function sankeyOption(flows: Flow[], t: ChartTheme, width: number, about = ''): SankeyBuild {
  const vertical = width < 560;
  const depth = flowDepths(flows);
  const maxDepth = Math.max(...depth.values());
  const values = proportionalValues(flows);
  const place = labelPlacement(flows);
  const names = [...depth.keys()];
  const degree = (n: string) => flows.filter((f) => f.from === n || f.to === n).length;
  // 白く目立たせるのは、その事例の会社1つ。事例の文に名前が一番多く出る登場者、無ければつながりが一番多い登場者
  const mentions = (n: string) => about.split(n).length - 1;
  const hub = names.reduce((a, b) => (mentions(b) > mentions(a) || (mentions(b) === mentions(a) && degree(b) > degree(a)) ? b : a));
  const perDepth = Array.from({ length: maxDepth + 1 }, (_, d) => names.filter((n) => depth.get(n) === d));
  const maxPer = Math.max(...perDepth.map((a) => a.length));

  const attached = new Map<string, { text: string; estimated: boolean }[]>();
  flows.forEach((f, i) => {
    if (place[i] === 'edge') return;
    const who = place[i] === 'from' ? f.from : f.to;
    attached.set(who, [...(attached.get(who) ?? []), { text: shortFlowLabel(f.label), estimated: ESTIMATED_RE.test(f.label) }]);
  });

  // 帯の太さ。額で決めない時は1本 FLOW_PX の一定、額で決める時は一番重い段が target に収まる縮尺
  const linkValue = (i: number) => (values ? values[i] : 1);
  const units = (n: string) => Math.max(
    flows.reduce((s, f, i) => s + (f.to === n ? linkValue(i) : 0), 0),
    flows.reduce((s, f, i) => s + (f.from === n ? linkValue(i) : 0), 0),
  );
  const columnUnits = perDepth.map((arr) => arr.reduce((s, n) => s + units(n), 0));
  const FLOW_PX = 16;
  const unitPx = values ? (vertical ? width * 0.5 : 140) / Math.max(...columnUnits) : FLOW_PX;
  const columnLen = (gap: number) => Math.max(...perDepth.map((arr, d) => columnUnits[d] * unitPx + (arr.length - 1) * gap));

  const position = (n: string) => {
    const d = depth.get(n)!;
    if (vertical) return d === 0 ? 'top' : d === maxDepth ? 'bottom' : 'right';
    return d === 0 ? 'left' : d === maxDepth ? 'right' : 'top';
  };

  // 縦向きは、一番多く横に並ぶ段で幅を等分し、各登場者をその区画の真ん中に置く（端の文が切れないように）
  const slot = Math.floor((width - 4) / maxPer);
  const verticalGap = Math.max(24, slot - FLOW_PX);
  const sideLabelW = Math.min(170, Math.max(120, Math.floor(width * 0.2)));
  const labelW = vertical ? slot - 10 : sideLabelW;
  const midW = vertical ? Math.max(90, Math.floor(verticalGap - 14)) : Math.max(110, Math.floor((width - sideLabelW * 2) / Math.max(1, maxDepth)) - 24);
  // 書体の実際の幅は見込みより少し広いので、折る幅には余白を残す
  const widthOf = (n: string) => ((position(n) === 'top' && !vertical) || (position(n) === 'right' && vertical) ? midW : labelW) - 14;
  const wrapped = new Map(names.map((n) => {
    const w = widthOf(n);
    const extra = (attached.get(n) ?? []).map((a) => ({ lines: a.text.split('\n').flatMap((l) => wrapText(l, w)), estimated: a.estimated }));
    return [n, { name: wrapText(n, w, 13.5), extra }];
  }));
  const labelLines = (n: string) => { const x = wrapped.get(n)!; return x.name.length + x.extra.reduce((s, a) => s + a.lines.length, 0); };
  const LINE = 17;

  const nodes = names.map((n) => {
    const x = wrapped.get(n)!;
    const pos = position(n);
    const parts = [
      ...x.name.map((l) => `{n|${esc(l)}}`),
      ...x.extra.flatMap((a) => a.lines.map((l) => `{${a.estimated ? 'e' : 'v'}|${esc(l)}}`)),
    ];
    return {
      name: n,
      depth: depth.get(n),
      itemStyle: { color: n === hub ? t.strong : t.muted, borderWidth: 0 },
      label: {
        position: pos,
        align: pos === 'left' ? 'right' : pos === 'right' ? 'left' : 'center',
        formatter: parts.join('\n'),
      },
    };
  });

  const links = flows.map((f, i) => {
    const est = ESTIMATED_RE.test(f.label);
    return {
      source: f.from,
      target: f.to,
      value: linkValue(i),
      lineStyle: { color: est ? t.accent : t.sub, opacity: est ? 0.36 : 0.24 },
      edgeLabel: place[i] === 'edge'
        ? { show: true, formatter: shortFlowLabel(f.label).split('\n').flatMap((l) => wrapText(l, midW)).join('\n'), color: est ? t.accent : t.sub, fontSize: 12, lineHeight: LINE, fontFamily: t.sans }
        : { show: false },
    };
  });

  const linesAt = (d: number) => Math.max(0, ...perDepth[d].map(labelLines));
  const midLines = Math.max(0, ...names.filter((n) => position(n) === 'top' && !vertical).map(labelLines));
  let nodeGap: number;
  let pad: { left: number; right: number; top: number; bottom: number };
  let height: number;
  if (!vertical) {
    // 縦のすき間＝左右の端の文と、途中の段の帯の上に載せる文が収まる高さ
    const sideH = Math.max(...names.filter((n) => position(n) !== 'top').map((n) => labelLines(n) * LINE - units(n) * unitPx));
    nodeGap = Math.max(22, midLines * LINE + 14, sideH + 12);
    pad = { left: sideLabelW + 12, right: sideLabelW + 12, top: Math.max(16, midLines * LINE + 12), bottom: 16 };
    // 帯が細く文が長い時（1本道など）は、文が収まる高さを取り、帯を上下の真ん中に置く
    const sideMax = Math.max(...names.filter((n) => position(n) !== 'top').map((n) => labelLines(n) * LINE));
    const len = columnLen(nodeGap);
    const need = Math.max(len, sideMax + 8);
    pad.top += Math.floor((need - len) / 2);
    pad.bottom += Math.ceil((need - len) / 2);
    height = Math.ceil(pad.top + pad.bottom + len);
  } else {
    nodeGap = verticalGap;
    const len = columnLen(nodeGap);
    const side = Math.max(2, Math.floor((width - len) / 2));
    const midRows = Array.from({ length: Math.max(0, maxDepth - 1) }, (_, k) => linesAt(k + 1));
    const rowGap = Math.max(84, ...midRows.map((l) => l * LINE + 48));
    pad = { left: side, right: side, top: linesAt(0) * LINE + 14, bottom: linesAt(maxDepth) * LINE + 14 };
    height = pad.top + pad.bottom + maxDepth * rowGap;
  }

  const rich = {
    n: { fontSize: 13, fontWeight: 600, lineHeight: 18, color: t.strong, fontFamily: t.sans },
    v: { fontSize: 12, lineHeight: 17, color: t.sub, fontFamily: t.sans },
    e: { fontSize: 12, lineHeight: 17, color: t.accent, fontFamily: t.sans },
  };

  return {
    height,
    option: {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { show: false },
      series: [{
        type: 'sankey',
        orient: vertical ? 'vertical' : 'horizontal',
        ...pad,
        nodeWidth: vertical ? 8 : 10,
        nodeGap,
        nodeAlign: 'justify',
        layoutIterations: 32,
        draggable: false,
        emphasis: { disabled: true },
        label: { show: true, rich, color: t.strong, distance: 8 },
        edgeLabel: { show: false },
        lineStyle: { curveness: 0.5 },
        data: nodes,
        links,
      }],
    },
  };
}

/** 軸の目盛りの円。端末の表記（「300万円」「1.5億円」）で、約は付けない。 */
const axisYen = (v: number) => (v === 0 ? '0' : formatYen(v));

/** 稼ぎの推移。推定の点は橙の白抜き、推定へつながる区間は点線。値の文字は点が少ない時だけ全部、多い時は最後だけ。 */
export function earningsOption(series: Series, t: ChartTheme, width: number): Record<string, unknown> {
  const pts = series.points;
  const narrow = width < 560;
  const xMin = Math.floor(Math.min(...pts.map((p) => p.x)));
  const xMax = Math.max(...pts.map((p) => p.x));
  const span = Math.max(1, xMax - xMin);
  const step = span <= (narrow ? 4 : 8) ? 1 : span <= (narrow ? 8 : 16) ? 2 : 5;
  const showAll = pts.length <= (narrow ? 4 : 6);
  const pointLabel = (i: number) => {
    const p = pts[i];
    if (!showAll && i !== pts.length - 1) return '';
    return `${formatYen(p.yen, { approx: true })}${p.estimated ? ' 推定' : ''}`;
  };
  const axisText = { color: t.label, fontSize: 12, fontFamily: t.mono };
  const common = { type: series.shape === 'bar' ? 'bar' : 'line', animation: false, z: 3 };

  // 隣の点と近い時は、低い方の値を点の下に書いて文字の重なりを避ける
  const below = (i: number) => [i - 1, i + 1].some((j) => pts[j] && Math.abs(pts[j].x - pts[i].x) / span < (narrow ? 0.3 : 0.15) && pts[j].yen > pts[i].yen);
  const markData = pts.map((p, i) => ({
    value: [p.x, p.yen],
    symbol: 'rect',
    symbolSize: 7,
    itemStyle: p.estimated ? { color: t.bg, borderColor: t.accent, borderWidth: 1.5 } : { color: t.strong },
    label: {
      show: pointLabel(i) !== '',
      formatter: pointLabel(i),
      position: below(i) ? 'bottom' : 'top',
      distance: 8,
      color: p.estimated ? t.accent : t.strong,
      fontSize: 12,
      fontFamily: t.mono,
      align: i === 0 ? 'left' : i === pts.length - 1 ? 'right' : 'center',
    },
  }));

  const seriesList = series.shape === 'bar'
    ? [{
        ...common,
        barMaxWidth: 28,
        data: pts.map((p, i) => ({
          value: p.yen,
          itemStyle: p.estimated ? { color: 'transparent', borderColor: t.accent, borderWidth: 1.5, borderType: 'dashed' } : { color: t.strong },
          label: { show: true, formatter: pointLabel(i) || formatYen(p.yen, { approx: true }), position: 'top', color: p.estimated ? t.accent : t.strong, fontSize: 12, fontFamily: t.mono },
        })),
      }]
    : [
        // 確認できた区間（実線）。推定の点は穴にして線をつながない
        { ...common, symbol: 'none', connectNulls: false, lineStyle: { color: t.strong, width: 1.5 }, data: pts.map((p) => [p.x, p.estimated ? '-' : p.yen]) },
        // 推定の点に触れる区間（点線）。区間ごとに1本ずつ引き、確認できた区間まで点線にしない
        ...pts.slice(1).flatMap((p, i) => (p.estimated || pts[i].estimated
          ? [{ ...common, symbol: 'none', lineStyle: { color: t.accent, width: 1.5, type: [4, 3] }, data: [[pts[i].x, pts[i].yen], [p.x, p.yen]] }]
          : [])),
        // 点と値の文字
        { ...common, type: 'scatter', z: 4, data: markData },
      ];

  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: { show: false },
    grid: { left: 10, right: narrow ? 58 : 72, top: 40, bottom: series.shape === 'bar' && narrow ? 40 : 26, containLabel: false },
    xAxis: series.shape === 'bar' ? {
      // 募集は1回ずつの出来事なので、時間の目盛りではなく回ごとに並べる
      type: 'category',
      data: pts.map((p) => p.when.replace(/頃|ごろ/g, '')),
      axisLine: { show: true, lineStyle: { color: t.line } },
      axisTick: { show: false },
      axisLabel: { ...axisText, interval: 0, lineHeight: 15, formatter: (v: string) => (narrow ? v.replace(/年/, '年\n') : v) },
    } : {
      type: 'value',
      min: xMin,
      max: xMax,
      interval: step,
      axisLine: { show: true, lineStyle: { color: t.line } },
      axisTick: { show: true, length: 4, lineStyle: { color: t.line } },
      splitLine: { show: false },
      axisLabel: { ...axisText, formatter: (v: number) => (Number.isInteger(v) ? `${v}年` : ''), hideOverlap: true },
    },
    yAxis: {
      type: 'value',
      position: 'right',
      min: 0,
      splitNumber: 3,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { show: true, lineStyle: { color: t.lineSoft, width: 1 } },
      axisLabel: { ...axisText, formatter: axisYen, margin: 8 },
    },
    series: seriesList,
  };
}
