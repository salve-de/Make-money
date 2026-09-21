'use client';

import React from 'react';
import { SlidersHorizontal, Search, X, Layers } from 'lucide-react';
import { ScreenerFilterState } from '../screener/AdvancedScreenerModal';
import { KNOWN_INGEST_BATCHES } from '@/shared/terminal';

interface DataGridToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  onOpenScreener: () => void;
  screenerFilters?: ScreenerFilterState | null;
  onResetScreener?: () => void;
  activeTags?: string[];
  onToggleTag?: (tag: string | null) => void;
  newlyCollectedCount?: number;
  onApproveAllCollected?: () => void;
  selectedBatch?: string;
  onSelectBatch?: (batchId: string) => void;
  batchCounts?: Record<string, number>;
  catalogTotal?: number | null;
}

export const DataGridToolbar: React.FC<DataGridToolbarProps> = ({
  searchQuery,
  onSearchChange,
  totalCount,
  onOpenScreener,
  screenerFilters,
  onResetScreener,
  activeTags = [],
  onToggleTag,
  newlyCollectedCount = 0,
  onApproveAllCollected,
  selectedBatch = 'ALL',
  onSelectBatch,
  batchCounts = {},
  catalogTotal = null,
}) => {
  // バッチの選択肢一覧（既知のバッチ＋動的バッチ）
  const batchOptions = React.useMemo(() => {
    const knownMap = new Map(KNOWN_INGEST_BATCHES.map((b) => [b.id, b]));
    const list: Array<{ id: string; label: string; count: number }> = [];

    // 既知のバッチを優先順に配置
    for (const kb of KNOWN_INGEST_BATCHES) {
      list.push({
        id: kb.id,
        label: kb.shortLabel,
        count: batchCounts[kb.id] || 0,
      });
    }

    // 未知の新規バッチがあれば追加
    for (const [id, count] of Object.entries(batchCounts)) {
      if (!knownMap.has(id) && id !== 'ALL') {
        list.push({
          id,
          label: id.replace(/^batch-/, ''),
          count,
        });
      }
    }

    return list;
  }, [batchCounts]);

  const totalAllBatches = React.useMemo(() => {
    if (catalogTotal !== null) return catalogTotal;
    const sum = Object.values(batchCounts).reduce((acc, n) => acc + n, 0);
    return sum > 0 ? sum : totalCount;
  }, [batchCounts, catalogTotal, totalCount]);

  // スクリーナーの適用条件数を計算
  const activeScreenerCount = React.useMemo(() => {
    if (!screenerFilters) return 0;
    let count = 0;
    if (screenerFilters.scales.length > 0) count += screenerFilters.scales.length;
    if (screenerFilters.minMargin > 0) count += 1;
    if (screenerFilters.maxCapital !== null) count += 1;
    if (screenerFilters.moats.length > 0) count += screenerFilters.moats.length;
    if (screenerFilters.selectedTags && screenerFilters.selectedTags.length > 0) count += screenerFilters.selectedTags.length;
    return count;
  }, [screenerFilters]);

  const hasActiveScreener = activeScreenerCount > 0;

  return (
    <div className="bg-[#08090C] border-b border-white/[0.06] px-3 py-2 select-none">
      <div className="flex items-center gap-2 text-xs">
        {/* 1. 多条件スクリーニングボタン（左端固定：インスペクター開閉時も位置が1ミリもブレない） */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onOpenScreener}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-colors border cursor-pointer ${
              hasActiveScreener
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 font-medium'
                : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-zinc-300 hover:text-white'
            }`}
            title="複数条件で詳細スクリーニング"
          >
            <SlidersHorizontal className={`w-3 h-3 ${hasActiveScreener ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span>多条件スクリーニング</span>
            {hasActiveScreener && (
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 ml-0.5">
                {activeScreenerCount}
              </span>
            )}
          </button>

          {hasActiveScreener && onResetScreener && (
            <button
              onClick={onResetScreener}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors cursor-pointer"
              title="スクリーナー条件を解除"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 1.2 収集世代（チャンク）セレクター */}
        <div className="flex items-center gap-1 shrink-0">
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors border text-xs ${
            selectedBatch !== 'ALL'
              ? 'bg-cyan-950/40 border-cyan-500/40 text-cyan-300 font-medium'
              : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] text-zinc-300 hover:text-white'
          }`}>
            <Layers className={`w-3 h-3 shrink-0 ${selectedBatch !== 'ALL' ? 'text-cyan-400' : 'text-zinc-400'}`} />
            <select
              value={selectedBatch}
              onChange={(e) => onSelectBatch && onSelectBatch(e.target.value)}
              className="bg-transparent text-xs font-mono outline-none cursor-pointer text-inherit pr-0.5"
              title="収集世代（チャンク・バージョン）で切り替え"
            >
              <option value="ALL" className="bg-[#0c0d12] text-zinc-200">
                📦 全世代 ({catalogTotal === null ? '確認中' : totalAllBatches.toLocaleString()})
              </option>
              {batchOptions.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#0c0d12] text-cyan-200">
                  {b.label} ({b.count}社)
                </option>
              ))}
            </select>
            {selectedBatch !== 'ALL' && (
              <button
                onClick={() => onSelectBatch && onSelectBatch('ALL')}
                className="p-0.5 rounded text-cyan-400 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer ml-0.5"
                title="全世代表示に戻す"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* 1.5 新着収集事例クイックトグルボタン（未承認事例の専用インボックス） */}
        {/* 未読ページに候補があっても入口を失わない。件数は取得済み分だけ。 */}
        {onToggleTag && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => onToggleTag && onToggleTag('収集事例')}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded transition-all border cursor-pointer shrink-0 font-mono ${
                activeTags.includes('収集事例')
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                  : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-400 hover:text-amber-200'
              }`}
              title="新しく集めた未承認の収集事例のみを絞り込み表示"
            >
              <span className="text-xs">📥</span>
              <span>収集事例</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                activeTags.includes('収集事例')
                  ? 'bg-amber-400 text-black'
                  : 'bg-amber-500/25 text-amber-300'
              }`}>
                取得済み {newlyCollectedCount}
              </span>
            </button>

            {/* 一括承認ボタン（収集事例表示時のみ出現） */}
            {activeTags.includes('収集事例') && onApproveAllCollected && (
              <button
                onClick={onApproveAllCollected}
                className="flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-emerald-500/60 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 hover:text-white font-semibold transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                title="表示中の収集事例を全件承認し、本台帳に保管します"
              >
                <span>✓</span>
                <span>一括承認（全部オッケー）</span>
              </button>
            )}
          </div>
        )}

        {/* 2. 検索窓（スクリーナーボタンの直後に固定配置、残余幅に合わせて伸縮） */}
        <div className="relative flex-1 min-w-[140px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="銘柄名・ビジネスモデル・タグ・特徴を検索..."
            className="w-full bg-[#050608] border border-white/[0.06] focus:border-white/[0.15] rounded pl-8 pr-12 py-1 text-zinc-200 placeholder-zinc-600 outline-none text-xs transition-colors"
          />
          {!searchQuery ? (
            <kbd className="hidden sm:inline-flex items-center absolute right-2 top-1/2 -translate-y-1/2 text-[9px] bg-white/[0.04] border border-white/[0.06] px-1 rounded text-zinc-500 font-mono pointer-events-none">
              ⌘K
            </kbd>
          ) : (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3. 右側: 複数選択中タグ解除バッジ & 件数表示 */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto overflow-x-auto scrollbar-none max-w-xs">
          {/* 選択中タグ一覧バッジ (各タグをワンクリックで個別解除可能) */}
          {activeTags.map((tag) => (
            <button
              key={tag}
              onClick={() => onToggleTag && onToggleTag(tag)}
              className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors cursor-pointer shrink-0"
              title={`#${tag} を解除`}
            >
              <span>#{tag}</span>
              <X className="w-2.5 h-2.5 text-emerald-400" />
            </button>
          ))}

          {/* 件数表示 */}
          <div className="font-mono text-zinc-500 text-[11px] pl-1 border-l border-white/[0.06] shrink-0">
            <span className="text-zinc-200 font-medium tabular-nums">{totalCount}</span> 件
          </div>
        </div>
      </div>
    </div>
  );
};
