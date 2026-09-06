'use client';

import React from 'react';
import { IntelligenceDossier, FinancialEntity } from '../../types/terminal';
import { InstitutionalDataGrid } from '../grid/InstitutionalDataGrid';
import { ArrowUpRight, Filter, ShieldAlert, Cpu, Sparkles } from 'lucide-react';

interface IntelligenceDeepDiveViewProps {
  dossier: IntelligenceDossier;
  targetEntities: FinancialEntity[];
  selectedEntityId: string | null;
  onSelectEntity: (id: string | null) => void;
  currency: 'JPY' | 'USD';
  bookmarkedIds: Set<string>;
  onToggleBookmark: (id: string, e: React.MouseEvent) => void;
  onLaunchScreenerForDossier: () => void;
}

export const IntelligenceDeepDiveView: React.FC<IntelligenceDeepDiveViewProps> = ({
  dossier,
  targetEntities,
  selectedEntityId,
  onSelectEntity,
  currency,
  bookmarkedIds,
  onToggleBookmark,
  onLaunchScreenerForDossier,
}) => {
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#060709] text-zinc-100">
      {/* 1. 特集ヘッダー ＆ レポート上部 */}
      <div className="border-b border-white/[0.06] bg-[#07080B] p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full">
        {/* メタ情報 */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-medium">
            {dossier.badge}
          </span>
          <span className="text-[10px] font-mono text-zinc-500">
            {dossier.publishedDate}
          </span>
          <span className="text-[10px] font-mono text-zinc-600">
            • {dossier.readTime}
          </span>
        </div>

        {/* タイトル */}
        <h1 className="text-lg md:text-xl font-medium tracking-tight text-white mb-4 leading-snug">
          {dossier.title}
        </h1>

        {/* 急所パンチライン */}
        <div className="p-3.5 rounded bg-white/[0.02] border-l-2 border-amber-500/80 mb-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-500/90 mb-1">
            EXECUTIVE SUMMARY
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-sans">
            {dossier.punchline}
          </p>
        </div>

        {/* 2カラム構成: 市場の歪み vs コスト構造分解 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* 左: 市場の構造的歪み・大手の死角 */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-zinc-500" />
              市場の構造的歪み ＆ 大手の死角
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed bg-white/[0.01] p-3 rounded border border-white/[0.04]">
              {dossier.macroArbitrage}
            </p>
          </div>

          {/* 右: コスト構造分解・P&Lレントゲン */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-zinc-500" />
              {dossier.costStructureTeardown.title}
            </div>
            <div className="bg-white/[0.01] p-3 rounded border border-white/[0.04] space-y-2.5">
              <p className="text-[11px] text-zinc-400 leading-normal">
                {dossier.costStructureTeardown.description}
              </p>
              <div className="space-y-1.5 pt-1">
                {dossier.costStructureTeardown.breakdownItems.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-zinc-400 truncate">{item.label}</span>
                      <span className="text-zinc-200 font-medium tabular-nums ml-2 shrink-0">
                        {item.percentage}% ({item.amountNote})
                      </span>
                    </div>
                    <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${idx === dossier.costStructureTeardown.breakdownItems.length - 1 ? 'bg-zinc-200' : 'bg-zinc-600'}`} 
                        style={{ width: `${Math.min(item.percentage, 100)}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 参入・実行プレイブック */}
        <div className="space-y-2 mb-6">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            参入・実行の急所ステップ (Playbook)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {dossier.operationalPlaybook.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2.5 rounded bg-white/[0.01] border border-white/[0.04] text-xs text-zinc-300">
                <span className="font-mono text-[10px] text-zinc-500 shrink-0 mt-0.5">0{idx + 1}.</span>
                <span className="leading-relaxed">{step}</span>
              </div>
            ))}
          </div>
        </div>

        {/* クイックアクションバー */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.04]">
          <div className="text-xs text-zinc-400">
            分析対象銘柄: <span className="font-mono text-zinc-200 font-medium">{targetEntities.length}社</span> 抽出中
          </div>
          <button
            onClick={onLaunchScreenerForDossier}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 hover:text-white transition-colors border border-white/[0.08]"
          >
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>このセクター条件でスクリーナーを全画面起動</span>
            <ArrowUpRight className="w-3 h-3 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* 2. 埋め込み財務台帳グリッド */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#07080B]">
        <div className="px-4 py-2 bg-[#08090C] border-b border-white/[0.06] flex items-center justify-between">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
            ANALYZED ENTITIES LEDGER ({targetEntities.length})
          </div>
          <div className="text-[10px] font-mono text-zinc-500">
            クリックで行を開き右ペインで財務諸表・コールドDMを検証
          </div>
        </div>

        <InstitutionalDataGrid
          entities={targetEntities}
          selectedEntityId={selectedEntityId}
          onSelectEntity={onSelectEntity}
          currency={currency}
          bookmarkedIds={bookmarkedIds}
          onToggleBookmark={onToggleBookmark}
        />
      </div>
    </div>
  );
};
