import React from 'react';

import type { CasePage } from '@/shared/case-page';
import { seriesFor, type Series } from '@/shared/case-page-series';
import { UI } from '@/shared/ui-strings';
import { formatYen } from '@/platform/utils/moneyDisplay';

/**
 * 事例の詳しい画面に出す図。材料は事例の「時間順の流れ」に書いてある日付と円の額だけ（AIは呼ばない・数字は作らない）。
 * 外部の部品は使わず SVG で描く。色は端末型のトークンだけ（確認＝白、推定＝橙）。
 */

const W = 320;
const H = 168;
const PAD_X = 34;
const PAD_TOP = 26;
const PAD_BOTTOM = 26;

const yearOf = (when: string) => when.match(/\d{4}年/)?.[0] ?? when;

/** 推移の折れ線。推定の点は白抜き、その点につながる線は点線。 */
function LineChart({ series }: { series: Series }) {
  const pts = series.points;
  const xs = pts.map((p) => p.x);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMax = Math.max(...pts.map((p) => p.yen)) * 1.08;
  const px = (x: number) => PAD_X + ((x - xMin) / (xMax - xMin)) * (W - PAD_X * 2);
  const py = (yen: number) => H - PAD_BOTTOM - (yen / yMax) * (H - PAD_BOTTOM - PAD_TOP);
  const baseY = H - PAD_BOTTOM;
  const label = `${series.title}の推移：${pts.map((p) => `${p.when} ${formatYen(p.yen, { approx: true })}`).join('、')}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} className="block w-full max-w-[420px]" data-chart="line">
      <line x1={PAD_X - 14} x2={W - PAD_X + 14} y1={baseY} y2={baseY} className="stroke-term-line" strokeWidth={1} />
      {pts.slice(1).map((p, i) => {
        const a = pts[i];
        const dashed = a.estimated || p.estimated;
        return (
          <line
            key={`${a.when}-${p.when}`}
            x1={px(a.x)} y1={py(a.yen)} x2={px(p.x)} y2={py(p.yen)}
            className={dashed ? 'stroke-term-accent' : 'stroke-term-fg-strong'}
            strokeWidth={1.5}
            strokeDasharray={dashed ? '4 3' : undefined}
          />
        );
      })}
      {pts.map((p, i) => {
        const x = px(p.x);
        const y = py(p.yen);
        const anchor = i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle';
        const tx = i === 0 ? x - 6 : i === pts.length - 1 ? x + 6 : x;
        return (
          <g key={`${p.when}-${p.yen}`}>
            <rect
              x={x - 3} y={y - 3} width={6} height={6}
              className={p.estimated ? 'fill-term-bg stroke-term-accent' : 'fill-term-fg-strong stroke-term-fg-strong'}
              strokeWidth={1.5}
            />
            <text x={tx} y={y - 8} textAnchor={anchor} className={`term-num ${p.estimated ? 'fill-term-accent' : 'fill-term-fg-strong'}`} fontSize={12}>
              {formatYen(p.yen, { approx: true })}
            </text>
            {(pts.length <= 5 || i === 0 || i === pts.length - 1) && (
              <text x={tx} y={H - 8} textAnchor={anchor} className="term-num fill-term-label" fontSize={12}>
                {yearOf(p.when)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** 1回ごとの値を横棒で。長さはゼロからの比例。 */
function BarChart({ series }: { series: Series }) {
  const max = Math.max(...series.points.map((p) => p.yen));
  return (
    <ol className="grid max-w-[560px] grid-cols-1 gap-1.5" data-chart="bar">
      {series.points.map((p) => (
        <li key={`${p.when}-${p.yen}`} className="grid grid-cols-[5.5rem_minmax(0,1fr)_4.5rem] items-center gap-x-2 text-xs">
          <span className="term-num text-term-label">{p.when}</span>
          <span className="block h-3 bg-term-line-soft" aria-hidden="true">
            <span className={`block h-full ${p.estimated ? 'border border-dashed border-term-accent' : 'bg-term-fg-strong'}`} style={{ width: `${Math.max(2, (p.yen / max) * 100)}%` }} />
          </span>
          <span className={`term-num text-right ${p.estimated ? 'text-term-accent' : 'text-term-fg-strong'}`}>{formatYen(p.yen, { approx: true })}</span>
        </li>
      ))}
    </ol>
  );
}

/** 稼ぎの推移。2点以上そろった種類だけ出し、無ければ null（章ごと出さない）。 */
export function EarningsCharts({ timeline }: { timeline: CasePage['timeline'] }) {
  const all = seriesFor(timeline);
  if (all.length === 0) return null;
  const anyEstimated = all.some((s) => s.points.some((p) => p.estimated));
  return (
    <div className="grid grid-cols-1 gap-4" data-case-charts="earnings">
      {all.map((s) => (
        <figure key={s.kind} className="m-0" data-series={s.kind}>
          <figcaption className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs text-term-label">
            <span className="text-sm font-semibold text-term-fg-strong">{s.title}</span>
          </figcaption>
          {s.shape === 'line' ? <LineChart series={s} /> : <BarChart series={s} />}
        </figure>
      ))}
      {anyEstimated && <p className="text-xs leading-relaxed text-term-sub">
        <span className="text-term-accent">{UI.CHART_LEGEND_ESTIMATED}</span>
      </p>}
    </div>
  );
}

type Flow = NonNullable<CasePage['flows']>[number];
interface Node { name: string; layer: number; order: number; x: number; y: number; w: number; h: number; lines: string[] }

const charPx = (c: string) => (/[\u0020-\u007e]/.test(c) ? 7 : 12);
function wrap(text: string, maxPx: number, maxLines = 5): string[] {
  const width = (t: string) => [...t].reduce((n, c) => n + charPx(c), 0);
  // 金額や括弧の途中で折らないよう、句点・括弧の切れ目でまとめて送る
  const chunks = text.split(/(?<=[。、）・])|(?=（)/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  const push = (chunk: string) => {
    if (cur && width(cur + chunk) > maxPx) { lines.push(cur); cur = ''; }
    if (width(chunk) <= maxPx) { cur += chunk; return; }
    for (const c of chunk) {
      if (cur && width(cur + c) > maxPx) { lines.push(cur); cur = ''; }
      cur += c;
    }
  };
  chunks.forEach(push);
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines);
}

/** 登場者を1回ずつ箱にする。層は「払う側ほど左（上）」。同じ層の並びは、つながる相手の並びの平均で決める。 */
function layoutNodes(flows: Flow[], boxW: number): Node[] {
  const names: string[] = [];
  for (const f of flows) for (const n of [f.from, f.to]) if (!names.includes(n)) names.push(n);
  const layer = new Map<string, number>(names.map((n) => [n, 0]));
  for (let pass = 0; pass < names.length; pass++) {
    for (const f of flows) layer.set(f.to, Math.max(layer.get(f.to)!, layer.get(f.from)! + 1));
  }
  // 払うだけの登場者（受け取りが無い）が遠い層へ線を引くと箱をまたぐので、受け取り側のすぐ手前の層に置く
  for (const n of names) {
    if (flows.some((f) => f.to === n)) continue;
    const next = Math.min(...flows.filter((f) => f.from === n).map((f) => layer.get(f.to)!));
    if (Number.isFinite(next)) layer.set(n, next - 1);
  }
  const maxLayer = Math.max(...layer.values());
  const nodes = new Map<string, Node>();
  for (let l = 0; l <= maxLayer; l++) {
    const inLayer = names.filter((n) => layer.get(n) === l);
    const score = (n: string) => {
      const preds = flows.filter((f) => f.to === n).map((f) => nodes.get(f.from)?.order).filter((o): o is number => o !== undefined);
      return preds.length ? preds.reduce((a, b) => a + b, 0) / preds.length : 1e6 + names.indexOf(n);
    };
    inLayer.sort((a, b) => score(a) - score(b) || names.indexOf(a) - names.indexOf(b));
    inLayer.forEach((n, i) => {
      const lines = wrap(n, boxW - 12, 3);
      nodes.set(n, { name: n, layer: l, order: i, x: 0, y: 0, w: boxW, h: 12 + lines.length * 15, lines });
    });
  }
  return [...nodes.values()];
}

function FlowSvg({ flows, vertical, id }: { flows: Flow[]; vertical: boolean; id: string }) {
  const boxW = vertical ? 100 : 116;
  const nodes = layoutNodes(flows, boxW);
  const byName = new Map(nodes.map((n) => [n.name, n]));
  const layers = Math.max(...nodes.map((n) => n.layer)) + 1;
  const perLayer = Array.from({ length: layers }, (_, l) => nodes.filter((n) => n.layer === l));
  const maxPer = Math.max(...perLayer.map((a) => a.length));
  const labelW = vertical ? 200 : 156;
  const LH = 14;
  const labels = flows.map((f) => wrap(f.label, labelW, 4));
  const textW = (ls: string[]) => Math.max(...ls.map((l) => [...l].reduce((n, c) => n + charPx(c), 0)));
  const outCount = (n: string) => flows.filter((f) => f.from === n).length;
  const inCount = (n: string) => flows.filter((f) => f.to === n).length;
  let W: number;
  let H: number;
  const laneY = new Map<number, number>();
  if (!vertical) {
    const gap = 190;
    const pitch = 96;
    W = layers * boxW + (layers - 1) * gap;
    H = Math.max(maxPer * pitch, 96);
    perLayer.forEach((arr, l) => arr.forEach((n, i) => {
      n.x = l * (boxW + gap);
      n.y = (H - arr.length * pitch) / 2 + i * pitch + (pitch - n.h) / 2;
    }));
  } else {
    W = 320;
    let y = 0;
    perLayer.forEach((arr, l) => {
      const rowH = Math.max(...arr.map((n) => n.h));
      arr.forEach((n, i) => {
        const slot = W / arr.length;
        n.x = slot * i + (slot - boxW) / 2;
        n.y = y + (rowH - n.h) / 2;
      });
      y += rowH;
      // この層から出る線に、1本ずつ自分の高さ（レーン）を割り当てる。ラベルはその線の上に載せる
      const out = flows.map((f, i) => i).filter((i) => byName.get(flows[i].from)!.layer === l);
      if (l < layers - 1) {
        out.sort((p, q) => byName.get(flows[p].from)!.x - byName.get(flows[q].from)!.x);
        y += 14;
        out.forEach((i) => { const h = labels[i].length * LH + 8; laneY.set(i, y + h / 2); y += h; });
        y += 22;
      }
    });
    H = y;
  }
  const padTop = vertical ? 0 : Math.max(0, Math.max(...labels.map((l) => l.length)) * LH + 18 - Math.min(...nodes.map((n) => n.y + n.h / 2)));
  return (
    <svg viewBox={`0 ${-padTop} ${W} ${H + padTop}`} className={`${vertical ? 'sm:hidden' : 'hidden sm:block'} block w-full`} style={{ maxWidth: vertical ? 420 : W * 1.25 }} role="img" aria-label={flows.map((f) => `${f.from}から${f.to}へ ${f.label}`).join('。')} data-flow-svg={vertical ? 'vertical' : 'horizontal'}>
      <defs>
        <marker id={id} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" className="fill-term-fg" />
        </marker>
      </defs>
      {flows.map((f, i) => {
        const a = byName.get(f.from)!;
        const b = byName.get(f.to)!;
        const ls = labels[i];
        let d: string;
        let cx: number;
        let cy: number;
        if (!vertical) {
          const x1 = a.x + a.w; const y1 = a.y + a.h / 2; const x2 = b.x; const y2 = b.y + b.h / 2;
          // 出る線が1本ならその根もと、無ければ入る線の手前の水平な区間にラベルを載せる（区間ごとに高さが違うので重ならない）
          const onSource = outCount(f.from) === 1 || inCount(f.to) !== 1;
          const xv = onSource ? x2 - 28 : x1 + 28;
          d = `M${x1} ${y1} H${xv} V${y2} H${x2 - 1}`;
          cx = onSource ? (x1 + xv) / 2 : (xv + x2) / 2;
          cy = (onSource ? y1 : y2) - 14 - (ls.length - 1) * LH;
          cy += 0;
        } else {
          const x1 = a.x + a.w / 2; const y1 = a.y + a.h; const x2 = b.x + b.w / 2; const y2 = b.y;
          const ly = laneY.get(i) ?? (y1 + y2) / 2;
          d = `M${x1} ${y1} V${ly} H${x2} V${y2 - 1}`;
          cx = (x1 + x2) / 2;
          cy = ly - ((ls.length - 1) * LH) / 2 - 1;
        }
        const w = textW(ls);
        const tx = Math.min(Math.max(cx, w / 2 + 2), W - w / 2 - 2);
        const ty = vertical ? cy + 4 : cy + 11;
        return (
          <g key={`${f.from}${f.to}${i}`} data-flow-edge={i + 1}>
            <path d={d} fill="none" className="stroke-term-fg" strokeWidth={1.25} markerEnd={`url(#${id})`} />
            <text x={tx} y={ty} textAnchor="middle" fontSize={12} className="fill-term-sub" stroke="var(--term-bg)" strokeWidth={vertical ? 5 : 0} strokeLinejoin="round" paintOrder="stroke">
              {ls.map((l, k) => <tspan key={k} x={tx} dy={k === 0 ? 0 : LH}>{l}</tspan>)}
            </text>
          </g>
        );
      })}
      {nodes.map((n) => (
        <g key={n.name} data-flow-node={n.name}>
          <rect x={n.x} y={n.y} width={n.w} height={n.h} className="fill-term-head stroke-term-line" strokeWidth={1} />
          <text x={n.x + n.w / 2} y={n.y + 17} textAnchor="middle" fontSize={12} fontWeight={600} className="fill-term-fg-strong">
            {n.lines.map((l, k) => <tspan key={k} x={n.x + n.w / 2} dy={k === 0 ? 0 : 15}>{l}</tspan>)}
          </text>
        </g>
      ))}
    </svg>
  );
}

/**
 * お金の流れの図。登場者は1回だけ箱にして、払う側を左（スマホでは上）、受け取る側を右（下）に並べ、
 * お金の向きを矢印で結び、矢印に何の代金・いくらかを添える。
 */
export function MoneyFlow({ flows }: { flows: NonNullable<CasePage['flows']> }) {
  if (flows.length === 0) return null;
  return (
    <div data-case-flow="money">
      <FlowSvg flows={flows} vertical={false} id="flow-arrow-h" />
      <FlowSvg flows={flows} vertical id="flow-arrow-v" />
    </div>
  );
}
