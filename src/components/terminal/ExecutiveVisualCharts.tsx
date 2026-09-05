'use client';

import React from 'react';
import { CompanyRecord } from '../../types/terminal';

interface ExecutiveVisualChartsProps {
  company: CompanyRecord;
}

export const ExecutiveVisualCharts: React.FC<ExecutiveVisualChartsProps> = ({ company }) => {
  const latestFin = company.financials[company.financials.length - 1];

  // 1. ウォーターフォール（利益の滝）データの計算
  const rev = latestFin?.revenueJpy || 100000000;
  const cogs = latestFin?.cogsJpy || 20000000;
  const opex = latestFin?.opexJpy || 30000000;
  const opProfit = latestFin?.operatingProfitJpy || 50000000;

  const cogsPercent = Math.min(Math.round((cogs / rev) * 100), 100);
  const opexPercent = Math.min(Math.round((opex / rev) * 100), 100);
  const profitPercent = Math.max(Math.round((opProfit / rev) * 100), 0);

  // 2. 七つの堀（7 Powers）レーダーチャート用のスコア配分
  // 企業のprimaryMoatやmoatScoreに応じて7軸の値を算出
  const moatScores = {
    processPower: company.primaryMoat === 'PROCESS_POWER' ? company.moatScore : Math.max(company.moatScore - 25, 30),
    networkEffects: company.primaryMoat === 'NETWORK_EFFECTS' ? company.moatScore : Math.max(company.moatScore - 35, 20),
    counterPositioning: company.primaryMoat === 'COUNTER_POSITIONING' ? company.moatScore : Math.max(company.moatScore - 30, 25),
    switchingCosts: company.primaryMoat === 'SWITCHING_COSTS' ? company.moatScore : Math.max(company.moatScore - 20, 35),
    branding: company.primaryMoat === 'BRANDING' ? company.moatScore : Math.max(company.moatScore - 25, 30),
    corneredResource: company.primaryMoat === 'CORNERED_RESOURCE' ? company.moatScore : Math.max(company.moatScore - 40, 15),
    scaleEconomies: company.primaryMoat === 'SCALE_ECONOMIES' ? company.moatScore : Math.max(company.moatScore - 30, 25)
  };

  // レーダーチャートのポリゴン頂点計算（7軸、中心(120, 120)、半径90）
  const center = 120;
  const radius = 80;
  const axes = [
    { label: '組織プロセス', score: moatScores.processPower },
    { label: 'ネットワーク効果', score: moatScores.networkEffects },
    { label: 'カウンターポジショニング', score: moatScores.counterPositioning },
    { label: '乗換コスト', score: moatScores.switchingCosts },
    { label: 'ブランド力', score: moatScores.branding },
    { label: '独占資源', score: moatScores.corneredResource },
    { label: '規模の経済', score: moatScores.scaleEconomies }
  ];

  const totalAxes = axes.length;
  const getCoordinates = (score: number, index: number) => {
    const angle = (Math.PI * 2 / totalAxes) * index - Math.PI / 2;
    const r = (score / 100) * radius;
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return { x, y };
  };

  const polygonPoints = axes
    .map((axis, i) => {
      const { x, y } = getCoordinates(axis.score, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  // 背景の基準枠（50点、100点）
  const grid100 = axes
    .map((_, i) => {
      const { x, y } = getCoordinates(100, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const grid50 = axes
    .map((_, i) => {
      const { x, y } = getCoordinates(50, i);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const formatShortAmount = (valJpy: number) => {
    if (valJpy >= 1000000000000) {
      return `¥${(valJpy / 1000000000000).toFixed(2)}兆`;
    }
    if (valJpy >= 100000000) {
      const oku = Math.round(valJpy / 100000000);
      return `¥${oku.toLocaleString()}億円`;
    }
    if (valJpy >= 10000) {
      const man = Math.round(valJpy / 10000);
      return `¥${man.toLocaleString()}万円`;
    }
    return `¥${valJpy.toLocaleString()}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 select-none font-sans">
      {/* 1. ウォーターフォール（利益の滝）図表 */}
      <div className="p-4 rounded-lg bg-[#121419] border border-white/[0.08] flex flex-col justify-between space-y-4">
        <div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">
            VISUAL 1: PROFIT WATERFALL (売上から純手残りへの流出分解)
          </div>
          <h4 className="text-xs font-bold text-zinc-200">
            100円の売上から何円が純粋な現金として手元に残るか
          </h4>
        </div>

        {/* 視覚的ウォーターフォールバー */}
        <div className="space-y-3 font-mono text-xs">
          {/* 売上 100% */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-zinc-300 font-sans">総売上高 (100%)</span>
              <span className="text-zinc-100 font-bold">{formatShortAmount(rev)}</span>
            </div>
            <div className="w-full h-3 bg-zinc-800 rounded-xs overflow-hidden">
              <div className="h-full bg-zinc-300 w-full"></div>
            </div>
          </div>

          {/* 原価引き落とし */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-zinc-400 font-sans">- 原価 (製造・仕入れ・サーバー)</span>
              <span className="text-zinc-400">-{cogsPercent}% ({formatShortAmount(cogs)})</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-800 rounded-xs overflow-hidden">
              <div
                style={{ width: `${cogsPercent}%` }}
                className="h-full bg-zinc-600"
              ></div>
            </div>
          </div>

          {/* 販管費・外注引き落とし */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-zinc-400 font-sans">- 販管費 (広告・決済・外注費)</span>
              <span className="text-zinc-400">-{opexPercent}% ({formatShortAmount(opex)})</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-800 rounded-xs overflow-hidden">
              <div
                style={{ width: `${opexPercent}%` }}
                className="h-full bg-zinc-600"
              ></div>
            </div>
          </div>

          {/* 最終手残り営業利益 */}
          <div className="pt-2 border-t border-white/[0.06]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-200 font-bold font-sans">= 実質本業手残り利益</span>
              <span className="text-zinc-100 font-bold text-sm font-mono">
                +{profitPercent}% ({formatShortAmount(opProfit)})
              </span>
            </div>
            <div className="w-full h-4 bg-zinc-800 rounded-xs overflow-hidden p-0.5">
              <div
                style={{ width: `${profitPercent}%` }}
                className="h-full bg-zinc-200 rounded-xs transition-all"
              ></div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-zinc-500 font-sans">
          ※ 業界平均の利益率（約8〜12%）と比較し、手残り率が極めて異常な水準であることが直感的に把握できます。
        </div>
      </div>

      {/* 2. 七つの堀（7 Powers）レーダーチャート図表 */}
      <div className="p-4 rounded-lg bg-[#121419] border border-white/[0.08] flex flex-col justify-between space-y-3">
        <div>
          <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-0.5">
            VISUAL 2: MOAT GEOMETRY (七つの堀 独占防壁幾何学レーダー)
          </div>
          <h4 className="text-xs font-bold text-zinc-200">
            競合他社を寄せ付けない防壁の幾何学的プロファイル
          </h4>
        </div>

        {/* SVGレーダーチャート本体 */}
        <div className="flex items-center justify-center py-1">
          <svg width="240" height="240" viewBox="0 0 240 240" className="overflow-visible font-mono text-[9px]">
            {/* 背景の同心円グリッド (50%, 100%) */}
            <polygon
              points={grid100}
              fill="none"
              stroke="#27272A"
              strokeWidth="1"
            />
            <polygon
              points={grid50}
              fill="none"
              stroke="#27272A"
              strokeWidth="0.8"
              strokeDasharray="2,2"
            />

            {/* 軸のライン */}
            {axes.map((_, i) => {
              const { x, y } = getCoordinates(100, i);
              return (
                <line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={x}
                  y2={y}
                  stroke="#27272A"
                  strokeWidth="0.8"
                />
              );
            })}

            {/* 企業の防壁ポリゴン領域 */}
            <polygon
              points={polygonPoints}
              fill="#10B981"
              fillOpacity="0.18"
              stroke="#10B981"
              strokeWidth="1.5"
            />

            {/* 各頂点のポインタ */}
            {axes.map((axis, i) => {
              const { x, y } = getCoordinates(axis.score, i);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="2.5"
                  fill="#10B981"
                />
              );
            })}

            {/* 軸ラベル */}
            {axes.map((axis, i) => {
              const { x, y } = getCoordinates(118, i);
              return (
                <text
                  key={i}
                  x={x}
                  y={y + 3}
                  textAnchor="middle"
                  fill="#A1A1AA"
                  className="font-sans text-[8.5px]"
                >
                  {axis.label}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-2 border-t border-white/[0.06]">
          <span>中核防壁: <strong className="text-zinc-200">{company.primaryMoat}</strong></span>
          <span>独占スコア: <strong className="text-zinc-100 font-bold">{company.moatScore}/100</strong></span>
        </div>
      </div>
    </div>
  );
};
