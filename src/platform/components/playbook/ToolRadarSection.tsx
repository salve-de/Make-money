'use client';

import React from 'react';
import Link from 'next/link';
import {
  TOOL_CATEGORIES,
  ToolCategoryKey,
  CategoryTrendRadar,
} from '@/lib/intelligence/macro-aggregator';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Radio,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { TradingViewMigrationChart } from '../charts/TradingViewMigrationChart';

interface ToolRadarSectionProps {
  selectedToolCategory: ToolCategoryKey;
  setSelectedToolCategory: (cat: ToolCategoryKey) => void;
  activeCategoryRadar: CategoryTrendRadar;
  activeCategoryMeta: (typeof TOOL_CATEGORIES)[number];
  getCategoryIcon: (key: ToolCategoryKey) => React.ReactElement;
  onSelectEntity?: (entityId: string) => void;
}

const toolLineColors = [
  { stroke: '#22d3ee', fill: 'rgba(34, 211, 238, 0.1)', text: 'text-cyan-400' }, // cyan
  { stroke: '#f43f5e', fill: 'rgba(244, 63, 94, 0.1)', text: 'text-rose-400' }, // rose
  { stroke: '#a855f7', fill: 'rgba(168, 85, 247, 0.1)', text: 'text-purple-400' }, // purple
  { stroke: '#eab308', fill: 'rgba(234, 179, 8, 0.1)', text: 'text-amber-400' }, // amber
];

export const ToolRadarSection: React.FC<ToolRadarSectionProps> = ({
  selectedToolCategory,
  setSelectedToolCategory,
  activeCategoryRadar,
  activeCategoryMeta,
  getCategoryIcon,
  onSelectEntity,
}) => {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* 武器庫イントロダクション */}
      <div className="bg-[#090A0F] border border-white/[0.08] rounded-lg p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Reference Tech Stack Comparison</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              ツール構成と乗り換えの参考例
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              以下の数値・推移は固定の参考サンプルです。観測証跡との照合は未完了で、現在の採用率や市場シェアを示しません。
            </p>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.06] rounded-md px-4 py-3 shrink-0">
            <div className="text-[11px] text-zinc-400 font-mono">データの確認状態</div>
            <div className="text-lg font-mono font-bold text-cyan-400">参考サンプル</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">観測日・実測標本数は未確認</div>
          </div>
        </div>

        {/* 6大用途別サブタブ切り替えバー */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-5 border-t border-white/[0.06] pt-4">
          {TOOL_CATEGORIES.map((cat) => {
            const isSelected = selectedToolCategory === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedToolCategory(cat.key)}
                className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/40 text-white shadow-lg'
                    : 'bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <div className={isSelected ? 'text-cyan-400' : 'text-zinc-500'}>
                    {getCategoryIcon(cat.key)}
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-zinc-300">
                    {cat.badge}
                  </span>
                </div>
                <span className="text-xs font-bold leading-tight line-clamp-1">{cat.label}</span>
                <span className="text-[10px] text-zinc-400 font-mono mt-1">{cat.medianCost}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── ★ 直近6ヶ月の採用シェア推移チャート（SVGグラフ） ─── */}
      <div className="bg-[#08090E] border border-white/[0.08] rounded-lg p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-cyan-400 " />
              <span>TradingView Multi-Period Dynamics / 勢力図推移チャート</span>
            </div>
            <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
              {activeCategoryMeta.label} における採用シェア推移（2025.10 〜 2026.09）
            </h3>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-bold">
              参考推移・実測未確認
            </span>
            <span className="text-zinc-500 text-[11px] hidden sm:inline">
              期間切替・クロスヘア連動
            </span>
          </div>
        </div>

        {/* TradingView Lightweight-Charts 描画領域 */}
        <div className="w-full rounded border border-white/[0.06] overflow-hidden bg-[#060709]">
          <TradingViewMigrationChart
            timeline={activeCategoryRadar.timeline}
            tools={activeCategoryRadar.tools}
          />
        </div>

        {/* チャート考察サマリー */}
        <div className="bg-white/[0.02] border border-white/[0.04] p-3 rounded text-xs text-zinc-300 leading-relaxed flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-white font-mono mr-1.5">【相場インテリジェンス考察】:</span>
            <span>{activeCategoryRadar.summaryInsight}</span>
          </div>
        </div>
      </div>

      {/* ─── 各ツールの生々しい乗り換え理由 ＆ 一次証拠カード ─── */}
      <div className="space-y-4">
        <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified Primary Evidence / 客観的乗り換え理由と一次証拠</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCategoryRadar.tools.map((tool, idx) => {
            const color = toolLineColors[idx % toolLineColors.length];
            return (
              <div
                key={tool.name}
                className="bg-[#090A0E] border border-white/[0.08] hover:border-white/[0.18] rounded-lg p-4 sm:p-5 flex flex-col justify-between space-y-4 transition-all"
              >
                <div>
                  {/* ヘッダー */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color.stroke }}
                        />
                        <h4 className="text-base font-bold text-white tracking-tight">{tool.name}</h4>
                      </div>
                      <div className="text-xs text-emerald-400 font-mono font-medium mt-0.5">
                        {tool.estimatedCost}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-mono font-bold text-white">{tool.currentShare}%</div>
                      <div
                        className={`text-xs font-mono font-bold flex items-center justify-end gap-0.5 ${
                          tool.deltaShare > 0 ? 'text-emerald-400' : tool.deltaShare < 0 ? 'text-rose-400' : 'text-zinc-400'
                        }`}
                      >
                        {tool.deltaShare > 0 ? <TrendingUp className="w-3 h-3" /> : tool.deltaShare < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        <span>{tool.deltaShare > 0 ? `+${tool.deltaShare}%` : `${tool.deltaShare}%`} (6ヶ月)</span>
                      </div>
                    </div>
                  </div>

                  {/* 検出方法バッジ（客観性の担保） */}
                  <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.05] px-2 py-0.5 rounded w-fit mb-3">
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                    <span>{tool.detectionMethod}</span>
                  </div>

                  {/* なぜ乗り換えているのか（合理的理由） */}
                  <div className="space-y-1 mb-3">
                    <div className="text-[11px] font-mono text-cyan-400 font-semibold">【合理的乗り換え理由】</div>
                    <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.02] border border-white/[0.04] p-2.5 rounded">
                      {tool.whyMigrating}
                    </p>
                  </div>

                  {/* 創業者公開発言・一次証拠 */}
                  <div className="space-y-1">
                    <div className="text-[11px] font-mono text-zinc-400 font-semibold">【未照合の参考記述・出典確認待ち】</div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed italic border-l-2 border-zinc-700 pl-2.5">
                      {tool.proofQuote}
                    </p>
                  </div>
                </div>

                {/* 採用している実在企業タグ */}
                <div className="pt-3 border-t border-white/[0.06]">
                  <div className="text-[10px] font-mono text-zinc-400 mb-1.5">関連企業例・採用未確認（クリックで台帳へ）:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {tool.usedByEntities.map((ent) => (
                      <Link
                        key={ent.id}
                        href={`/?entity=${ent.id}&mode=LEDGER`}
                        onClick={onSelectEntity ? (event) => {
                          // Use the shell's selection handler exactly once;
                          // allowing Link and router.push to race leaves the
                          // playbook URL unchanged intermittently.
                          event.preventDefault();
                          onSelectEntity(ent.id);
                        } : undefined}
                        className="text-[11px] px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-zinc-300 hover:text-white hover:border-cyan-400/40 cursor-pointer transition-colors"
                      >
                        {ent.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 法的免責・指称的使用声明（Nominative Fair Use） ─── */}
      <div className="mt-8 p-3.5 rounded bg-white/[0.02] border border-white/[0.05] text-[11px] font-mono text-zinc-400 leading-relaxed">
        <span className="font-bold text-zinc-400 block mb-0.5">【参考データの取り扱い】</span>
        本画面は構成・比較のための固定の参考データです。数値、費用、推移、採用企業、手法の有効性はいずれも一次証跡との照合が未完了です。実測統計や現在の推奨を示すものではありません。記載されている会社名、製品名、サービス名は各社の商標または登録商標であり、製品・サービスを特定するための必要最小限の言及（指称的使用）として引用しています。
      </div>
    </div>
  );
};
