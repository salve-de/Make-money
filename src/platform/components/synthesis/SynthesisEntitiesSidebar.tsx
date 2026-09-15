'use client';

import React from 'react';
import { FinancialEntity } from '../../types/terminal';
import { UserInterestProfile } from '../../utils/userProfile';
import { 
  CheckSquare, 
  Square, 
  FileText,
  Cpu,
  Sparkles
} from 'lucide-react';

interface SynthesisEntitiesSidebarProps {
  savedEntities: FinancialEntity[];
  selectedEntityIds: Set<string>;
  toggleSelectEntity: (id: string) => void;
  activeEditingEntityId: string;
  setActiveEditingEntityId: (id: string) => void;
  userProfile: UserInterestProfile;
  notes: Record<string, { entityId: string; content: string; updatedAt: string }>;
  onSaveNote: (entityId: string, content: string) => void;
  formatMoney: (yen: number) => string;
  handleSynthesize: () => void;
  isSynthesizing: boolean;
}

export const SynthesisEntitiesSidebar: React.FC<SynthesisEntitiesSidebarProps> = ({
  savedEntities,
  selectedEntityIds,
  toggleSelectEntity,
  activeEditingEntityId,
  setActiveEditingEntityId,
  userProfile,
  notes,
  onSaveNote,
  formatMoney,
  handleSynthesize,
  isSynthesizing,
}) => {
  return (
    <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-b md:border-b-0 md:border-r border-white/[0.08] flex flex-col bg-[#07080B] overflow-hidden">
      {/* ヘッダー */}
      <div className="p-3 border-b border-white/[0.06] bg-[#090A0E] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-mono text-xs font-bold text-white tracking-wider">
            INPUT_ASSETS: 保存銘柄 ＆ 考察
          </span>
        </div>
        <span className="font-mono text-[10px] text-zinc-500">
          {selectedEntityIds.size} / {savedEntities.length} 選択中
        </span>
      </div>

      {/* ユーザー関心プロファイル（AI学習済みの好み・蓄積データ） */}
      <div className="px-3 py-2 bg-[#0A0C11] border-b border-white/[0.05] space-y-1 shrink-0">
        <div className="flex items-center justify-between text-[10px] font-mono">
          <span className="text-zinc-300 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>AI学習済みプロファイル (あなたの好み):</span>
          </span>
          <span className="text-emerald-400 font-bold">
            保存 {userProfile.bookmarkedCount}社 / 閲覧 {userProfile.viewedCount}社
          </span>
        </div>
        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed font-sans">
          {userProfile.profileSummary}
        </p>
      </div>

      {/* 銘柄一覧 ＆ メモ入力 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-white/10">
        <div className="text-[11px] text-zinc-400 leading-relaxed font-sans pb-1">
          保存した銘柄の財務・戦略データに独自の着眼点（メモ）を掛け合わせることで、AIが競合の死角を突く独自ビジネスモデルを抽出します。
        </div>

        {savedEntities.map((ent) => {
          const isSelected = selectedEntityIds.has(ent.id);
          const isFocused = activeEditingEntityId === ent.id;
          const currentNote = notes[ent.id]?.content || '';

          return (
            <div
              key={ent.id}
              onClick={() => setActiveEditingEntityId(ent.id)}
              className={`p-3 rounded border transition-all cursor-pointer ${
                isFocused
                  ? 'bg-[#0E1017] border-white/[0.2] shadow-lg ring-1 ring-white/10'
                  : 'bg-[#0A0B0F] border-white/[0.06] hover:border-white/[0.12]'
              }`}
            >
              {/* 銘柄ヘッダー */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectEntity(ent.id);
                    }}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-600" />
                    )}
                  </button>
                  <span className="text-xs font-semibold text-white truncate">
                    {ent.name}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400 font-bold shrink-0">
                  月利{formatMoney(ent.pnl.operatingProfit)} (率{ent.pnl.operatingMargin}%)
                </span>
              </div>

              {/* 突いた盲点 */}
              <div className="text-[10px] font-mono text-zinc-500 mb-2 truncate">
                盲点: {ent.strategy.blindspot}
              </div>

              {/* アナリスト極秘メモ入力欄 */}
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3 text-zinc-400" />
                    独自考察メモ（任意・空欄でも照合可能）
                  </span>
                  {currentNote && (
                    <span className="text-emerald-400/80 text-[9px]">保存済</span>
                  )}
                </div>
                <textarea
                  rows={isFocused ? 3 : 2}
                  value={currentNote}
                  onChange={(e) => onSaveNote(ent.id, e.target.value)}
                  placeholder="例: このAPIラッパーを士業の契約書レビューに応用できないか？ 初期の自演集客手法をXで再現する..."
                  className="w-full bg-[#060709] border border-white/[0.08] focus:border-white/[0.25] rounded p-2 text-[11px] font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 下部アクションバー: 合成トリガー */}
      <div className="p-3 border-t border-white/[0.08] bg-[#090A0E] shrink-0">
        <button
          onClick={handleSynthesize}
          disabled={isSynthesizing || selectedEntityIds.size === 0}
          className="w-full py-2.5 px-4 rounded bg-white/[0.1] hover:bg-white/[0.16] border border-white/[0.2] text-white font-mono text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99]"
        >
          <Cpu className="w-4 h-4 text-emerald-400" />
          {isSynthesizing ? (
            <span>多次元アイデアを合成中...</span>
          ) : (
            <span>選択 {selectedEntityIds.size} 銘柄とメモから独自アイデアを合成</span>
          )}
        </button>
      </div>
    </div>
  );
};
