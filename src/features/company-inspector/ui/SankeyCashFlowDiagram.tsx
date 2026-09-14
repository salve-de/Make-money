import React from 'react';
import { Droplets, Flame } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function SankeyCashFlowDiagram({
  entity,
  isHazardMode,
  formatMoney
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
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

  // 各要素のパーセンテージ計算（最小幅1%を担保）
  const cogsPct = Math.max(Math.round((cogs / rev) * 100), cogs > 0 ? 3 : 0);
  const opexPct = Math.max(Math.round((totalOpex / rev) * 100), totalOpex > 0 ? 3 : 0);
  const profitPct = isLoss
    ? Math.abs(Math.round((profit / rev) * 100))
    : Math.max(100 - cogsPct - opexPct, 5);

  // SVGサンキー曲線の座標計算 (ViewBox: 800 x 260)
  const width = 800;
  const height = 260;
  const startX = 135;
  const endX = 635;
  const midX1 = 300;
  const midX2 = 470;

  // 左端（売上流入）
  const inTop = 30;
  const inBottom = 230;
  const inH = inBottom - inTop; // 200px

  // 右端の高さ配分（比率に応じて高さを割り当て）
  const totalRatio = cogsPct + opexPct + (isLoss ? 0 : profitPct) || 100;
  const cogsH = Math.max(Math.min((cogsPct / totalRatio) * inH, inH * 0.7), cogs > 0 ? 16 : 0);
  const opexH = Math.max(Math.min((opexPct / totalRatio) * inH, inH * 0.7), totalOpex > 0 ? 16 : 0);
  const profitH = isLoss ? Math.min((profitPct / totalRatio) * inH, inH * 0.8) : Math.max(inH - cogsH - opexH, 20);

  // 右端各ブロックのY座標
  // 1. 原価（上部へ流出）
  const cogsTop = 25;
  const cogsBottom = cogsTop + cogsH;

  // 2. 販管費（中央下へ流出）
  const opexTop = cogsBottom + 20;
  const opexBottom = opexTop + opexH;

  // 3. 利益（右端下または中央右へ着金）
  const profitTop = isLoss ? 180 : Math.max(opexBottom + 15, 140);
  const profitBottom = profitTop + profitH;

  // SVG三次ベジェ曲線（Sankeyリボンパス）
  const createSankeyRibbon = (y1Top: number, y1Bottom: number, y2Top: number, y2Bottom: number) => {
    return `M ${startX} ${y1Top}
            C ${midX1} ${y1Top}, ${midX2} ${y2Top}, ${endX} ${y2Top}
            L ${endX} ${y2Bottom}
            C ${midX2} ${y2Bottom}, ${midX1} ${y1Bottom}, ${startX} ${y1Bottom}
            Z`;
  };

  const cogsRibbon = cogsH > 0 ? createSankeyRibbon(inTop, inTop + (cogsH / inH) * inH, cogsTop, cogsBottom) : '';
  const opexRibbon = opexH > 0 ? createSankeyRibbon(inTop + (cogsH / inH) * inH, inTop + ((cogsH + opexH) / inH) * inH, opexTop, opexBottom) : '';
  const profitRibbon = profitH > 0 && !isLoss
    ? createSankeyRibbon(inTop + ((cogsH + opexH) / inH) * inH, inBottom, profitTop, profitBottom)
    : '';
  const lossRibbon = isLoss
    ? createSankeyRibbon(inTop + (cogsH > 0 ? (cogsH / inH) * inH : 0), inBottom, profitTop, Math.max(profitBottom, profitTop + 30))
    : '';

  return (
    <div id="section-sankey" className={`rounded-xl border p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0E121B] border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.06)]'
        : 'bg-[#0E121B] border-white/[0.12] shadow-[0_0_30px_rgba(0,0,0,0.5)]'
    }`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          {isHazardMode ? (
            <Flame className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Droplets className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? '現金の流出・出血サンキー図 (CASH BLEED FLOW)' : '現金の滝：損益分岐サンキー図 (SANKEY CASH WATERFALL)'}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400/80 inline-block" /> 流入
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400/80 inline-block" /> 原価・流出
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full inline-block ${isLoss ? 'bg-red-500' : 'bg-emerald-400'}`} />
            {isLoss ? '出血赤字' : '手残り純益'}
          </span>
        </div>
      </div>

      {/* サンキー図本体 (SVG) */}
      <div className="relative w-full overflow-hidden bg-black/40 rounded-lg border border-white/[0.04] p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[280px] drop-shadow-md select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* 流入グラデーション */}
            <linearGradient id="cogsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#fb7185" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.7" />
            </linearGradient>
            <linearGradient id="opexGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#fbbf24" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.6" />
            </linearGradient>
            <linearGradient id="profitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="50%" stopColor="#34d399" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="lossGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#991b1b" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* サンキーリボン（流路） */}
          {cogsRibbon && (
            <path
              d={cogsRibbon}
              fill="url(#cogsGrad)"
              className="transition-all hover:opacity-100 opacity-80 cursor-pointer"
            >
              <title>{`売上原価: ${formatMoney(cogs)} (${cogsPct}%)`}</title>
            </path>
          )}

          {opexRibbon && (
            <path
              d={opexRibbon}
              fill="url(#opexGrad)"
              className="transition-all hover:opacity-100 opacity-80 cursor-pointer"
            >
              <title>{`販管費・固定費: ${formatMoney(totalOpex)} (${opexPct}%)`}</title>
            </path>
          )}

          {profitRibbon && (
            <path
              d={profitRibbon}
              fill="url(#profitGrad)"
              className="transition-all hover:opacity-100 opacity-85 cursor-pointer filter drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]"
            >
              <title>{`営業利益: ${formatMoney(profit)} (${profitPct}%)`}</title>
            </path>
          )}

          {lossRibbon && (
            <path
              d={lossRibbon}
              fill="url(#lossGrad)"
              className="transition-all hover:opacity-100 opacity-85 cursor-pointer filter drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]"
            >
              <title>{`出血赤字: ${formatMoney(profit)} (${profitPct}%)`}</title>
            </path>
          )}

          {/* ---------------- 左端：月商バー ---------------- */}
          <rect
            x={startX - 14}
            y={inTop}
            width={14}
            height={inH}
            rx={3}
            fill="#38bdf8"
            className="drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
          />
          <text
            x={startX - 22}
            y={inTop + 16}
            textAnchor="end"
            fill="#e0f2fe"
            fontSize="12"
            fontWeight="bold"
            fontFamily="monospace"
          >
            月商流入
          </text>
          <text
            x={startX - 22}
            y={inTop + 36}
            textAnchor="end"
            fill="#ffffff"
            fontSize="14"
            fontWeight="900"
            fontFamily="monospace"
          >
            {formatMoney(rev)}
          </text>
          <text
            x={startX - 22}
            y={inTop + 54}
            textAnchor="end"
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            100%
          </text>

          {/* ---------------- 右端上：売上原価バー ---------------- */}
          {cogsH > 0 && (
            <g>
              <rect
                x={endX}
                y={cogsTop}
                width={12}
                height={cogsH}
                rx={2}
                fill="#f43f5e"
                className="drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]"
              />
              <text
                x={endX + 18}
                y={cogsTop + Math.min(cogsH / 2 + 4, 14)}
                fill="#fecdd3"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                売上原価: {formatMoney(cogs)}
              </text>
              <text
                x={endX + 18}
                y={cogsTop + Math.min(cogsH / 2 + 20, 30)}
                fill="#fda4af"
                fontSize="10"
                fontFamily="monospace"
              >
                原価率 {cogsPct}%
              </text>
            </g>
          )}

          {/* ---------------- 右端中：販管費・インフラバー ---------------- */}
          {opexH > 0 && (
            <g>
              <rect
                x={endX}
                y={opexTop}
                width={12}
                height={opexH}
                rx={2}
                fill="#f59e0b"
                className="drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]"
              />
              <text
                x={endX + 18}
                y={opexTop + Math.min(opexH / 2 + 4, 14)}
                fill="#fef3c7"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                固定費・販管: {formatMoney(totalOpex)}
              </text>
              <text
                x={endX + 18}
                y={opexTop + Math.min(opexH / 2 + 20, 30)}
                fill="#fde68a"
                fontSize="10"
                fontFamily="monospace"
              >
                経費率 {opexPct}%
              </text>
            </g>
          )}

          {/* ---------------- 右端下：営業利益（着金）バー ---------------- */}
          {!isLoss && profitH > 0 && (
            <g>
              <rect
                x={endX}
                y={profitTop}
                width={14}
                height={profitH}
                rx={3}
                fill="#10b981"
                className="drop-shadow-[0_0_12px_rgba(16,185,129,0.7)] animate-pulse"
              />
              <text
                x={endX + 20}
                y={profitTop + 16}
                fill="#a7f3d0"
                fontSize="12"
                fontWeight="bold"
                fontFamily="monospace"
              >
                創業者手残り (営業利益)
              </text>
              <text
                x={endX + 20}
                y={profitTop + 38}
                fill="#ffffff"
                fontSize="16"
                fontWeight="900"
                fontFamily="monospace"
              >
                {formatMoney(profit)}
              </text>
              <text
                x={endX + 20}
                y={profitTop + 56}
                fill="#34d399"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                利益率 +{profitPct}%
              </text>
            </g>
          )}

          {/* 赤字破綻時の表示 */}
          {isLoss && (
            <g>
              <rect
                x={endX}
                y={profitTop}
                width={14}
                height={Math.max(profitH, 30)}
                rx={3}
                fill="#ef4444"
                className="drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]"
              />
              <text
                x={endX + 20}
                y={profitTop + 16}
                fill="#fecaca"
                fontSize="12"
                fontWeight="bold"
                fontFamily="monospace"
              >
                出血赤字・資金流出
              </text>
              <text
                x={endX + 20}
                y={profitTop + 38}
                fill="#ef4444"
                fontSize="15"
                fontWeight="900"
                fontFamily="monospace"
              >
                {formatMoney(profit)}
              </text>
              <text
                x={endX + 20}
                y={profitTop + 54}
                fill="#f87171"
                fontSize="10"
                fontFamily="monospace"
              >
                赤字率 {profitPct}%
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
