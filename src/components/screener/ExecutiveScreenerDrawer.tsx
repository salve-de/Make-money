'use client';

import React from 'react';
import { X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { 
  TerminalFilterState, 
  WorkStyleFilter, 
  MarginFilter, 
  CapitalFilter, 
  AcquisitionFilter 
} from '@/types/terminal';

interface ExecutiveScreenerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filter: TerminalFilterState;
  onChangeFilter: (f: TerminalFilterState) => void;
  onReset: () => void;
  filteredCount: number;
}

export const ExecutiveScreenerDrawer: React.FC<ExecutiveScreenerDrawerProps> = ({
  isOpen,
  onClose,
  filter,
  onChangeFilter,
  onReset,
  filteredCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center select-none font-sans">
      {/* 背景 */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in"
      />

      {/* コンテナ（スマホは下部ボトムシート、PCは中央モーダル） */}
      <div className="relative z-10 w-full sm:max-w-3xl bg-[#0C1018] border border-white/[0.12] rounded-t-xl sm:rounded-xl shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* ヘッダー */}
        <div className="p-4 border-b border-white/[0.08] bg-[#121622] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-emerald-400" />
            <span className="font-bold text-sm text-zinc-100">
              50軸 金融スクリーナー
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              INSTITUTIONAL SCREENER
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-white px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>初期化</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/[0.06] cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* スクロール可能フィルター群 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-zinc-300">
          {/* 軸1: 組織規模 */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-zinc-400 block font-bold">
              01. 組織規模・勤務形態
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { val: 'ALL', label: 'すべて' },
                { val: 'REMOTE_SOLO', label: '完全単独 (在宅)' },
                { val: 'SMALL_TEAM', label: '少数精鋭 (2〜5名)' },
                { val: 'ENTERPRISE', label: '巨大組織' }
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => onChangeFilter({ ...filter, workStyle: item.val as WorkStyleFilter })}
                  className={`py-2 px-2 rounded text-[11px] text-center transition-colors cursor-pointer border ${
                    filter.workStyle === item.val
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 font-bold'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border-white/[0.06]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 軸2: 初期投下資本 */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-zinc-400 block font-bold">
              02. 初期投下資本要件
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { val: 'ALL', label: 'すべて' },
                { val: 'ZERO', label: '0円 (完全無料)' },
                { val: 'UNDER_50K', label: '5万円以下' },
                { val: 'UNDER_500K', label: '50万円以下' }
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => onChangeFilter({ ...filter, capital: item.val as CapitalFilter })}
                  className={`py-2 px-2 rounded text-[11px] text-center transition-colors cursor-pointer border ${
                    filter.capital === item.val
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 font-bold'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border-white/[0.06]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 軸3: 営業利益率 */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-zinc-400 block font-bold">
              03. 営業利益率水準
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { val: 'ALL', label: 'すべて' },
                { val: 'MARGIN_30', label: '利益率 30%以上' },
                { val: 'MARGIN_50', label: '利益率 50%以上' },
                { val: 'MARGIN_80', label: '利益率 80%以上' }
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => onChangeFilter({ ...filter, margin: item.val as MarginFilter })}
                  className={`py-2 px-2 rounded text-[11px] text-center transition-colors cursor-pointer border ${
                    filter.margin === item.val
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 font-bold'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border-white/[0.06]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 軸4: 集客導線 */}
          <div className="space-y-2">
            <label className="text-[11px] font-mono text-zinc-400 block font-bold">
              04. 中核顧客獲得チャネル
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { val: 'ALL', label: 'すべて' },
                { val: 'SEO_ORGANIC', label: 'SEO自然検索' },
                { val: 'X_TWITTER', label: 'X/SNSバイラル' },
                { val: 'DIRECT_OUTREACH', label: '直販・アウトバウンド' }
              ].map((item) => (
                <button
                  key={item.val}
                  onClick={() => onChangeFilter({ ...filter, acquisitionChannel: item.val as AcquisitionFilter })}
                  className={`py-2 px-2 rounded text-[11px] text-center transition-colors cursor-pointer border ${
                    filter.acquisitionChannel === item.val
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 font-bold'
                      : 'bg-white/[0.03] text-zinc-400 hover:text-zinc-200 border-white/[0.06]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* フッター固定確定バー */}
        <div className="p-3.5 border-t border-white/[0.08] bg-[#121622] flex items-center justify-between shrink-0">
          <div className="font-mono text-xs text-zinc-400">
            <span className="font-bold text-emerald-400 text-sm">{filteredCount}</span> 件の銘柄が合致
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs font-mono transition-colors cursor-pointer"
          >
            条件を適用して台帳を表示
          </button>
        </div>
      </div>
    </div>
  );
};
