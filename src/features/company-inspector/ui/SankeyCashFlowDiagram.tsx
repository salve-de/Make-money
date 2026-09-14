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

  // 各要素のパーセンテージ計算
  const cogsPct = Math.max(Math.round((cogs / rev) * 100), cogs > 0 ? 3 : 0);
  const opexPct = Math.max(Math.round((totalOpex / rev) * 100), totalOpex > 0 ? 3 : 0);
  const profitPct = isLoss
    ? Math.abs(Math.round((profit / rev) * 100))
    : Math.max(100 - cogsPct - opexPct, 5);

  // SVGサンキー曲線の座標計算 (ViewBox: 840 x 280)
  const width = 840;
  const height = 280;
  const startX = 140;
  const endX = 640;
  const midX1 = 330;
  const midX2 = 470;

  // 左端（売上流入）
  const inTop = 35;
  const inBottom = 245;
  const inH = inBottom - inTop; // 210px

  // 右端の高さ配分（比率に応じて高さを割り当て）
  const totalRatio = cogsPct + opexPct + (isLoss ? 0 : profitPct) || 100;
  const cogsH = Math.max(Math.min((cogsPct / totalRatio) * inH, inH * 0.65), cogs > 0 ? 18 : 0);
  const opexH = Math.max(Math.min((opexPct / totalRatio) * inH, inH * 0.65), totalOpex > 0 ? 18 : 0);
  const profitH = isLoss ? Math.min((profitPct / totalRatio) * inH, inH * 0.75) : Math.max(inH - cogsH - opexH, 24);

  // 右端各ブロックのY座標
  const cogsTop = 25;
  const cogsBottom = cogsTop + cogsH;

  const opexTop = cogsBottom + 18;
  const opexBottom = opexTop + opexH;

  const profitTop = isLoss ? 190 : Math.max(opexBottom + 18, 145);
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
    ? createSankeyRibbon(inTop + (cogsH > 0 ? (cogsH / inH) * inH : 0), inBottom, profitTop, Math.max(profitBottom, profitTop + 35))
    : '';

  return (
    <div id="section-sankey" className={`rounded-xl border p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all ${
      isHazardMode
        ? 'bg-[#0A0D14] border-red-500/25 shadow-[0_0_40px_rgba(239,68,68,0.08)]'
        : 'bg-[#0A0D14] border-white/[0.10] shadow-[0_0_40px_rgba(0,0,0,0.6)]'
    }`}>
      {/* 背景アンビエント光 */}
      <div className={`absolute top-0 right-0 w-80 h-48 rounded-full blur-[90px] pointer-events-none ${
        isHazardMode ? 'bg-red-500/8' : 'bg-emerald-500/8'
      }`} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08] relative z-10">
        <div className="flex items-center gap-2.5">
          {isHazardMode ? (
            <Flame className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <Droplets className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <h3 className={`text-xs font-mono font-bold tracking-wider uppercase ${
            isHazardMode ? 'text-red-300' : 'text-zinc-100'
          }`}>
            {isHazardMode ? 'キャッシュバーン構造：資本流出ウォーターフォール' : 'キャッシュ創出構造：損益分岐サンキー図 (SANKEY CASH WATERFALL)'}
          </h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400/80 shadow-[0_0_6px_rgba(6,182,212,0.6)] inline-block" /> 売上流入
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-400/80 inline-block" /> 売上原価
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full inline-block ${isLoss ? 'bg-red-500' : 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'}`} />
            {isLoss ? '営業損失 (Burn)' : '営業利益 (EBIT)'}
          </span>
        </div>
      </div>

      {/* サンキー図本体 (SVG) */}
      <div className="relative w-full overflow-hidden bg-[#07090F]/80 rounded-xl border border-white/[0.06] p-3 shadow-inner">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-[300px] select-none"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* 流入 ➔ 原価グラデーション */}
            <linearGradient id="cogsGradModern" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.45" />
              <stop offset="60%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0.75" />
            </linearGradient>

            {/* 流入 ➔ 販管費グラデーション */}
            <linearGradient id="opexGradModern" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0.65" />
            </linearGradient>

            {/* 流入 ➔ 営業利益（手残り）グラデーション */}
            <linearGradient id="profitGradModern" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.85" />
            </linearGradient>

            {/* 赤字流出グラデーション */}
            <linearGradient id="lossGradModern" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* サンキーリボン（流路） */}
          {cogsRibbon && (
            <path
              d={cogsRibbon}
              fill="url(#cogsGradModern)"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="0.75"
              className="transition-all hover:opacity-100 opacity-80 cursor-pointer"
            >
              <title>{`売上原価: ${formatMoney(cogs)} (${cogsPct}%)`}</title>
            </path>
          )}

          {opexRibbon && (
            <path
              d={opexRibbon}
              fill="url(#opexGradModern)"
              stroke="rgba(255, 255, 255, 0.12)"
              strokeWidth="0.75"
              className="transition-all hover:opacity-100 opacity-80 cursor-pointer"
            >
              <title>{`販管費・固定費: ${formatMoney(totalOpex)} (${opexPct}%)`}</title>
            </path>
          )}

          {profitRibbon && (
            <path
              d={profitRibbon}
              fill="url(#profitGradModern)"
              stroke="rgba(16, 185, 129, 0.3)"
              strokeWidth="1"
              className="transition-all hover:opacity-100 opacity-90 cursor-pointer filter drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]"
            >
              <title>{`営業利益: ${formatMoney(profit)} (${profitPct}%)`}</title>
            </path>
          )}

          {lossRibbon && (
            <path
              d={lossRibbon}
              fill="url(#lossGradModern)"
              stroke="rgba(239, 68, 68, 0.3)"
              strokeWidth="1"
              className="transition-all hover:opacity-100 opacity-90 cursor-pointer filter drop-shadow-[0_0_12px_rgba(239,68,68,0.35)]"
            >
              <title>{`出血赤字: ${formatMoney(profit)} (${profitPct}%)`}</title>
            </path>
          )}

          {/* ---------------- 左端：月商流入バー ---------------- */}
          <rect
            x={startX - 12}
            y={inTop}
            width={12}
            height={inH}
            rx={3}
            fill="#0ea5e9"
            className="filter drop-shadow-[0_0_10px_rgba(14,165,233,0.7)]"
          />
          <text
            x={startX - 22}
            y={inTop + 20}
            textAnchor="end"
            fill="#e0f2fe"
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
          >
            月商流入 (100%)
          </text>
          <text
            x={startX - 22}
            y={inTop + 44}
            textAnchor="end"
            fill="#ffffff"
            fontSize="16"
            fontWeight="900"
            fontFamily="monospace"
          >
            {formatMoney(rev)}
          </text>
          <text
            x={startX - 22}
            y={inTop + 62}
            textAnchor="end"
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
          >
            総売上ベース
          </text>

          {/* ---------------- 右端上：売上原価バー ---------------- */}
          {cogsH > 0 && (
            <g>
              <rect
                x={endX}
                y={cogsTop}
                width={10}
                height={cogsH}
                rx={2}
                fill="#f43f5e"
                className="filter drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]"
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

          {/* ---------------- 右端中：販管費・固定費バー ---------------- */}
          {opexH > 0 && (
            <g>
              <rect
                x={endX}
                y={opexTop}
                width={10}
                height={opexH}
                rx={2}
                fill="#f59e0b"
                className="filter drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]"
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

          {/* ---------------- 右端下：営業利益（EBIT）バー ---------------- */}
          {!isLoss && profitH > 0 && (
            <g>
              <rect
                x={endX}
                y={profitTop}
                width={12}
                height={profitH}
                rx={3}
                fill="#10b981"
                className="filter drop-shadow-[0_0_16px_rgba(16,185,129,0.8)] animate-pulse"
              />
              <text
                x={endX + 20}
                y={profitTop + 18}
                fill="#a7f3d0"
                fontSize="12"
                fontWeight="bold"
                fontFamily="monospace"
              >
                営業利益 (EBIT)
              </text>
              <text
                x={endX + 20}
                y={profitTop + 42}
                fill="#ffffff"
                fontSize="18"
                fontWeight="900"
                fontFamily="monospace"
              >
                {formatMoney(profit)}
              </text>
              <text
                x={endX + 20}
                y={profitTop + 62}
                fill="#34d399"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                営業利益率 +{profitPct}%
              </text>
            </g>
          )}

          {/* 赤字破綻時の表示 */}
          {isLoss && (
            <g>
              <rect
                x={endX}
                y={profitTop}
                width={12}
                height={Math.max(profitH, 30)}
                rx={3}
                fill="#ef4444"
                className="filter drop-shadow-[0_0_16px_rgba(239,68,68,0.8)]"
              />
              <text
                x={endX + 20}
                y={profitTop + 18}
                fill="#fecaca"
                fontSize="12"
                fontWeight="bold"
                fontFamily="monospace"
              >
                営業赤字 (Operating Burn)
              </text>
              <text
                x={endX + 20}
                y={profitTop + 42}
                fill="#ef4444"
                fontSize="16"
                fontWeight="900"
                fontFamily="monospace"
              >
                {formatMoney(profit)}
              </text>
              <text
                x={endX + 20}
                y={profitTop + 60}
                fill="#f87171"
                fontSize="11"
                fontFamily="monospace"
              >
                営業赤字率 -{profitPct}%
              </text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
