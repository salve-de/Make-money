import React, { useState } from 'react';
import { Droplets, Flame, BarChart3, GitFork } from 'lucide-react';
import type { InspectorSectionProps } from '../model/section-props';

export function SankeyCashFlowDiagram({
  entity,
  isHazardMode,
  formatMoney
}: Pick<InspectorSectionProps, 'entity' | 'isHazardMode' | 'formatMoney'>) {
  const [viewType, setViewType] = useState<'SANKEY' | 'WATERFALL'>('SANKEY');

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

  const cogsPct = Math.max(Math.round((cogs / rev) * 100), cogs > 0 ? 3 : 0);
  const opexPct = Math.max(Math.round((totalOpex / rev) * 100), totalOpex > 0 ? 3 : 0);
  const profitPct = isLoss
    ? Math.abs(Math.round((profit / rev) * 100))
    : Math.max(100 - cogsPct - opexPct, 5);

  // SVGサンキー ViewBox: 880 x 340
  const width = 880;
  const height = 340;
  const startX = 160;
  const endX = 640;
  const midOffset = (endX - startX) * 0.50; // 水平タンジェント制御

  // 左端の月商流入バー（中央にコンパクトに集約）
  const inTop = 85;
  const inBottom = 265;
  const inH = inBottom - inTop; // 180px

  // 右端の各バーの高さ計算
  const maxBarH = 140;
  const cogsH = Math.max(Math.round((cogsPct / 100) * maxBarH), cogs > 0 ? 18 : 0);
  const opexH = Math.max(Math.round((opexPct / 100) * maxBarH), totalOpex > 0 ? 18 : 0);
  const profitH = isLoss
    ? Math.max(Math.round((profitPct / 100) * maxBarH), 24)
    : Math.max(Math.round((profitPct / 100) * maxBarH), 26);

  // 右端のY座標（上・中・下にダイナミックに分散配置）
  const cogsTop = 20;
  const cogsBottom = cogsTop + cogsH;

  const opexTop = Math.max(cogsBottom + 20, 120);
  const opexBottom = opexTop + opexH;

  const profitTop = isLoss ? 210 : Math.max(opexBottom + 20, 215);
  const profitBottom = profitTop + profitH;

  // 滑らかなS字三次ベジェ曲線（水平タンジェント）
  const createSmoothSankey = (y1Top: number, y1Bottom: number, y2Top: number, y2Bottom: number) => {
    return `M ${startX} ${y1Top}
            C ${startX + midOffset} ${y1Top}, ${endX - midOffset} ${y2Top}, ${endX} ${y2Top}
            L ${endX} ${y2Bottom}
            C ${endX - midOffset} ${y2Bottom}, ${startX + midOffset} ${y1Bottom}, ${startX} ${y1Bottom}
            Z`;
  };

  const cogsRibbon = cogsH > 0 ? createSmoothSankey(inTop, inTop + (cogsH / inH) * inH, cogsTop, cogsBottom) : '';
  const opexRibbon = opexH > 0 ? createSmoothSankey(inTop + (cogsH / inH) * inH, inTop + ((cogsH + opexH) / inH) * inH, opexTop, opexBottom) : '';
  const profitRibbon = profitH > 0 && !isLoss
    ? createSmoothSankey(inTop + ((cogsH + opexH) / inH) * inH, inBottom, profitTop, profitBottom)
    : '';
  const lossRibbon = isLoss
    ? createSmoothSankey(inTop + (cogsH > 0 ? (cogsH / inH) * inH : 0), inBottom, profitTop, Math.max(profitBottom, profitTop + 40))
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

      {/* ヘッダー ＆ モード切替タブ */}
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

        {/* 表示切替（サンキー流体 vs ウォーターフォール棒） */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setViewType('SANKEY')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
              viewType === 'SANKEY'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitFork className="w-3 h-3" />
            サンキー流路
          </button>
          <button
            type="button"
            onClick={() => setViewType('WATERFALL')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
              viewType === 'WATERFALL'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="w-3 h-3" />
            滝グラフ (Waterfall)
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. サンキー流体ビュー (SANKEY FLUID VIEW) */}
      {/* ========================================================= */}
      {viewType === 'SANKEY' && (
        <div className="relative w-full overflow-hidden bg-[#07090F]/90 rounded-xl border border-white/[0.08] p-4 shadow-inner">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto max-h-[340px] select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* 原価グラデーション */}
              <linearGradient id="sankeyCogsGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                <stop offset="65%" stopColor="#f43f5e" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.8" />
              </linearGradient>

              {/* 販管費グラデーション */}
              <linearGradient id="sankeyOpexGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.75" />
              </linearGradient>

              {/* 営業利益グラデーション */}
              <linearGradient id="sankeyProfitGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                <stop offset="45%" stopColor="#10b981" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.9" />
              </linearGradient>

              {/* 赤字グラデーション */}
              <linearGradient id="sankeyLossGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#ef4444" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* サンキー流路リボン */}
            {cogsRibbon && (
              <path
                d={cogsRibbon}
                fill="url(#sankeyCogsGrad)"
                stroke="rgba(244, 63, 94, 0.4)"
                strokeWidth="1"
                className="transition-all hover:opacity-100 opacity-85 cursor-pointer filter drop-shadow-[0_0_8px_rgba(244,63,94,0.15)]"
              >
                <title>{`売上原価: ${formatMoney(cogs)} (${cogsPct}%)`}</title>
              </path>
            )}

            {opexRibbon && (
              <path
                d={opexRibbon}
                fill="url(#sankeyOpexGrad)"
                stroke="rgba(245, 158, 11, 0.4)"
                strokeWidth="1"
                className="transition-all hover:opacity-100 opacity-85 cursor-pointer filter drop-shadow-[0_0_8px_rgba(245,158,11,0.15)]"
              >
                <title>{`販管費・固定費: ${formatMoney(totalOpex)} (${opexPct}%)`}</title>
              </path>
            )}

            {profitRibbon && (
              <path
                d={profitRibbon}
                fill="url(#sankeyProfitGrad)"
                stroke="rgba(16, 185, 129, 0.6)"
                strokeWidth="1.5"
                className="transition-all hover:opacity-100 opacity-95 cursor-pointer filter drop-shadow-[0_0_16px_rgba(16,185,129,0.35)]"
              >
                <title>{`営業利益: ${formatMoney(profit)} (${profitPct}%)`}</title>
              </path>
            )}

            {lossRibbon && (
              <path
                d={lossRibbon}
                fill="url(#sankeyLossGrad)"
                stroke="rgba(239, 68, 68, 0.6)"
                strokeWidth="1.5"
                className="transition-all hover:opacity-100 opacity-95 cursor-pointer filter drop-shadow-[0_0_16px_rgba(239,68,68,0.35)]"
              >
                <title>{`営業赤字: ${formatMoney(profit)} (${profitPct}%)`}</title>
              </path>
            )}

            {/* ---------------- 左端：売上流入バー ---------------- */}
            <rect
              x={startX - 14}
              y={inTop}
              width={14}
              height={inH}
              rx={4}
              fill="#06b6d4"
              className="filter drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]"
            />
            <text
              x={startX - 26}
              y={inTop + 24}
              textAnchor="end"
              fill="#cffafe"
              fontSize="11"
              fontWeight="bold"
              fontFamily="monospace"
            >
              月商流入 (100%)
            </text>
            <text
              x={startX - 26}
              y={inTop + 48}
              textAnchor="end"
              fill="#ffffff"
              fontSize="17"
              fontWeight="900"
              fontFamily="monospace"
            >
              {formatMoney(rev)}
            </text>
            <text
              x={startX - 26}
              y={inTop + 68}
              textAnchor="end"
              fill="#67e8f9"
              fontSize="10"
              fontFamily="monospace"
            >
              売上総額
            </text>

            {/* ---------------- 右端上：売上原価バー ---------------- */}
            {cogsH > 0 && (
              <g>
                <rect
                  x={endX}
                  y={cogsTop}
                  width={12}
                  height={cogsH}
                  rx={3}
                  fill="#f43f5e"
                  className="filter drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]"
                />
                <text
                  x={endX + 20}
                  y={cogsTop + Math.min(cogsH / 2 + 4, 16)}
                  fill="#fecdd3"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  売上原価: {formatMoney(cogs)}
                </text>
                <text
                  x={endX + 20}
                  y={cogsTop + Math.min(cogsH / 2 + 22, 34)}
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
                  width={12}
                  height={opexH}
                  rx={3}
                  fill="#f59e0b"
                  className="filter drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
                />
                <text
                  x={endX + 20}
                  y={opexTop + Math.min(opexH / 2 + 4, 16)}
                  fill="#fef3c7"
                  fontSize="12"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  固定費・販管: {formatMoney(totalOpex)}
                </text>
                <text
                  x={endX + 20}
                  y={opexTop + Math.min(opexH / 2 + 22, 34)}
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
                  width={14}
                  height={profitH}
                  rx={4}
                  fill="#10b981"
                  className="filter drop-shadow-[0_0_18px_rgba(16,185,129,0.9)] animate-pulse"
                />
                <text
                  x={endX + 22}
                  y={profitTop + 20}
                  fill="#a7f3d0"
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  営業利益 (EBIT)
                </text>
                <text
                  x={endX + 22}
                  y={profitTop + 46}
                  fill="#ffffff"
                  fontSize="19"
                  fontWeight="900"
                  fontFamily="monospace"
                >
                  {formatMoney(profit)}
                </text>
                <text
                  x={endX + 22}
                  y={profitTop + 66}
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
                  width={14}
                  height={Math.max(profitH, 36)}
                  rx={4}
                  fill="#ef4444"
                  className="filter drop-shadow-[0_0_18px_rgba(239,68,68,0.9)]"
                />
                <text
                  x={endX + 22}
                  y={profitTop + 20}
                  fill="#fecaca"
                  fontSize="13"
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  営業赤字 (Operating Burn)
                </text>
                <text
                  x={endX + 22}
                  y={profitTop + 46}
                  fill="#ef4444"
                  fontSize="17"
                  fontWeight="900"
                  fontFamily="monospace"
                >
                  {formatMoney(profit)}
                </text>
                <text
                  x={endX + 22}
                  y={profitTop + 66}
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
      )}

      {/* ========================================================= */}
      {/* 2. マッキンゼー式 ウォーターフォール棒グラフ (MCKINSEY WATERFALL VIEW) */}
      {/* ========================================================= */}
      {viewType === 'WATERFALL' && (
        <div className="bg-[#07090F]/90 rounded-xl border border-white/[0.08] p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center">
            {/* 1. 売上流入 */}
            <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-cyan-400 font-bold">1. 売上高 (Revenue)</span>
              <span className="text-sm sm:text-base font-black text-cyan-200 font-mono my-1">{formatMoney(rev)}</span>
              <span className="text-[9px] font-mono text-cyan-300/70">100% 基準</span>
            </div>

            {/* 2. 売上原価 */}
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-rose-400 font-bold">2. 売上原価 (COGS)</span>
              <span className="text-sm sm:text-base font-black text-rose-200 font-mono my-1">-{formatMoney(cogs)}</span>
              <span className="text-[9px] font-mono text-rose-300/70">原価率 {cogsPct}%</span>
            </div>

            {/* 3. 販管費 */}
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 flex flex-col justify-between">
              <span className="text-[10px] font-mono text-amber-400 font-bold">3. 販管費 (SG&A)</span>
              <span className="text-sm sm:text-base font-black text-amber-200 font-mono my-1">-{formatMoney(totalOpex)}</span>
              <span className="text-[9px] font-mono text-amber-300/70">経費率 {opexPct}%</span>
            </div>

            {/* 4. 営業利益 */}
            <div className={`rounded-lg p-3 flex flex-col justify-between border ${
              isLoss
                ? 'bg-red-950/30 border-red-500/40'
                : 'bg-emerald-950/30 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            }`}>
              <span className={`text-[10px] font-mono font-bold ${isHazardMode ? 'text-red-400' : 'text-emerald-400'}`}>
                {isLoss ? '4. 営業赤字 (Burn)' : '4. 営業利益 (EBIT)'}
              </span>
              <span className={`text-base sm:text-lg font-black font-mono my-1 ${
                isLoss ? 'text-red-300' : 'text-emerald-300'
              }`}>
                {formatMoney(profit)}
              </span>
              <span className={`text-[9px] font-mono font-bold ${isLoss ? 'text-red-400' : 'text-emerald-400'}`}>
                {isLoss ? `赤字率 -${profitPct}%` : `利益率 +${profitPct}%`}
              </span>
            </div>
          </div>

          {/* 構成比プログレスバー */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400">
              <span>売上構成比ウォーターフォール</span>
              <span>100% 分解</span>
            </div>
            <div className="h-3 w-full bg-zinc-900 rounded-full overflow-hidden flex">
              {cogsPct > 0 && (
                <div
                  style={{ width: `${Math.min(cogsPct, 100)}%` }}
                  className="h-full bg-rose-500 hover:bg-rose-400 transition-all"
                  title={`原価: ${cogsPct}%`}
                />
              )}
              {opexPct > 0 && (
                <div
                  style={{ width: `${Math.min(opexPct, 100 - cogsPct)}%` }}
                  className="h-full bg-amber-500 hover:bg-amber-400 transition-all"
                  title={`販管費: ${opexPct}%`}
                />
              )}
              {!isLoss && profitPct > 0 && (
                <div
                  style={{ width: `${Math.min(profitPct, 100 - cogsPct - opexPct)}%` }}
                  className="h-full bg-emerald-500 hover:bg-emerald-400 transition-all"
                  title={`営業利益: ${profitPct}%`}
                />
              )}
              {isLoss && (
                <div
                  style={{ width: '100%' }}
                  className="h-full bg-red-600 animate-pulse"
                  title="キャッシュバーン超過"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
