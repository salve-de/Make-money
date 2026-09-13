'use client';

import React, { useState } from 'react';
import { X, Check, RefreshCw } from 'lucide-react';
import { BusinessScale, MoatType } from '../../types/terminal';

interface AdvancedScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: ScreenerFilterState) => void;
  availableTags?: string[];
  tagCounts?: Record<string, number>;
  initialFilters?: ScreenerFilterState | null;
}

export interface ScreenerFilterState {
  scales: BusinessScale[];
  minMargin: number;
  maxCapital: number | null;
  moats: MoatType[];
  selectedTags?: string[];
}

export const AdvancedScreenerModal: React.FC<AdvancedScreenerModalProps> = ({
  isOpen,
  onClose,
  onApplyFilters,
  availableTags = [],
  tagCounts = {},
  initialFilters,
}) => {
  const [scales, setScales] = useState<BusinessScale[]>(initialFilters?.scales || []);
  const [minMargin, setMinMargin] = useState<number>(initialFilters?.minMargin || 0);
  const [maxCapital, setMaxCapital] = useState<number | null>(initialFilters?.maxCapital ?? null);
  const [moats, setMoats] = useState<MoatType[]>(initialFilters?.moats || []);
  const [selectedTags, setSelectedTags] = useState<string[]>(initialFilters?.selectedTags || []);

  // initialFilters同期
  const [previousInputs, setPreviousInputs] = useState({ initialFilters, isOpen });
  if (previousInputs.initialFilters !== initialFilters || previousInputs.isOpen !== isOpen) {
    setPreviousInputs({ initialFilters, isOpen });
    if (initialFilters) {
      setScales(initialFilters.scales || []);
      setMinMargin(initialFilters.minMargin || 0);
      setMaxCapital(initialFilters.maxCapital ?? null);
      setMoats(initialFilters.moats || []);
      setSelectedTags(initialFilters.selectedTags || []);
    } else {
      setScales([]);
      setMinMargin(0);
      setMaxCapital(null);
      setMoats([]);
      setSelectedTags([]);
    }
  }

  if (!isOpen) return null;

  const toggleScale = (s: BusinessScale) => {
    setScales((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const toggleMoat = (m: MoatType) => {
    setMoats((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };

  const toggleTag = (t: string) => {
    setSelectedTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);
  };

  const handleReset = () => {
    setScales([]);
    setMinMargin(0);
    setMaxCapital(null);
    setMoats([]);
    setSelectedTags([]);
  };

  const handleApply = () => {
    onApplyFilters({ scales, minMargin, maxCapital, moats, selectedTags });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs select-none">
      <div className="w-full max-w-lg bg-[#090A0D] border border-white/[0.08] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* ヘッダー */}
        <div className="p-3 border-b border-white/[0.06] bg-[#07080A] flex items-center justify-between">
          <span className="text-xs font-medium text-white font-mono">
            50軸 詳細スクリーナー
          </span>
          <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* フィルター項目 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
          {/* 事業規模 */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 font-mono">
              事業規模 (SCALE)
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'SOLO' as BusinessScale, label: '完全1人 (ソロ)' },
                { id: 'SMALL_TEAM' as BusinessScale, label: '少数精鋭 (2〜10人)' },
                { id: 'SCALEUP' as BusinessScale, label: '急成長 (11〜100人)' },
                { id: 'ENTERPRISE' as BusinessScale, label: '巨大独占 (100人超)' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleScale(item.id)}
                  className={`p-2 rounded border text-left transition-colors flex items-center justify-between ${
                    scales.includes(item.id)
                      ? 'bg-white/[0.08] border-white/[0.2] text-white font-medium'
                      : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                  {scales.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                </button>
              ))}
            </div>
          </div>

          {/* 営業利益率の下限 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-medium text-zinc-400 font-mono">
                最小営業利益率 (OPERATING MARGIN)
              </label>
              <span className="font-mono text-zinc-200">{minMargin}% 以上</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px]">
              {[0, 30, 50, 80].map((val) => (
                <button
                  key={val}
                  onClick={() => setMinMargin(val)}
                  className={`py-1.5 rounded border transition-colors ${
                    minMargin === val
                      ? 'bg-white/[0.1] border-white/[0.2] text-white font-medium'
                      : 'bg-white/[0.02] border-white/[0.05] text-zinc-500 hover:text-white'
                  }`}
                >
                  {val === 0 ? '指定なし' : `${val}%+`}
                </button>
              ))}
            </div>
          </div>

          {/* 初期投下資本 */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 font-mono">
              初期投下資本の上限 (CAPITAL)
            </label>
            <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
              {[
                { val: 0, label: '0円 (元手ゼロ)' },
                { val: 1000000, label: '100万円以内' },
                { val: null, label: '制限なし' },
              ].map((item) => (
                <button
                  key={String(item.val)}
                  onClick={() => setMaxCapital(item.val)}
                  className={`py-1.5 rounded border transition-colors ${
                    maxCapital === item.val
                      ? 'bg-white/[0.1] border-white/[0.2] text-white font-medium'
                      : 'bg-white/[0.02] border-white/[0.05] text-zinc-500 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 7 Powers Moat */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-zinc-400 font-mono">
              参入障壁の正体 (7 POWERS MOAT)
            </label>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {[
                { id: 'COUNTER_POSITIONING' as MoatType, label: 'カウンターポジショニング' },
                { id: 'SWITCHING_COST' as MoatType, label: '高スイッチングコスト' },
                { id: 'NETWORK_EFFECT' as MoatType, label: 'ネットワーク効果' },
                { id: 'CORNERED_RESOURCE' as MoatType, label: '独自資源・職人独占' },
                { id: 'SCALE_ECONOMIES' as MoatType, label: '規模の経済' },
                { id: 'PROCESS_POWER' as MoatType, label: 'プロセスパワー (業務独占)' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleMoat(m.id)}
                  className={`p-1.5 rounded border text-left truncate transition-colors flex items-center justify-between ${
                    moats.includes(m.id)
                      ? 'bg-white/[0.08] border-white/[0.2] text-white font-medium'
                      : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="truncate">{m.label}</span>
                  {moats.includes(m.id) && <Check className="w-3 h-3 text-white shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* 特徴タグ (TAGS - 複数選択可能) */}
          {availableTags.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-medium text-zinc-400 font-mono">
                    特徴タグ (TAGS・複数選択可)
                  </label>
                  {selectedTags.length > 0 && (
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
                      {selectedTags.length}個 選択中
                    </span>
                  )}
                </div>
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    タグ全解除
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white/[0.01] rounded border border-white/[0.04]">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const count = tagCounts[tag];
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-[11px] font-mono px-2 py-1 rounded transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30'
                          : 'bg-white/[0.02] border-white/[0.05] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]'
                      }`}
                      title={`#${tag}${count ? ` (${count}件)` : ''}`}
                    >
                      <span>#{tag}</span>
                      {count !== undefined && (
                        <span className={`text-[9px] tabular-nums ${isSelected ? 'text-emerald-400' : 'text-zinc-600'}`}>
                          {count}
                        </span>
                      )}
                      {isSelected && <Check className="w-2.5 h-2.5 text-emerald-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="p-3 border-t border-white/[0.06] bg-[#07080A] flex items-center justify-between">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white"
          >
            <RefreshCw className="w-3 h-3" />
            <span>リセット</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1 text-zinc-500 hover:text-white"
            >
              閉じる
            </button>
            <button
              onClick={handleApply}
              className="text-xs bg-white hover:bg-zinc-200 text-zinc-950 font-medium px-4 py-1.5 rounded transition-colors"
            >
              条件適用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
