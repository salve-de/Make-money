'use client';

import React from 'react';
import { Search, Globe } from 'lucide-react';

interface TerminalTopBarProps {
  onOpenCommandPalette: () => void;
  currency: 'JPY' | 'USD';
  onToggleCurrency: () => void;
}

export const TerminalTopBar: React.FC<TerminalTopBarProps> = ({
  onOpenCommandPalette,
  currency,
  onToggleCurrency,
}) => {
  return (
    <header className="h-11 w-full bg-[#08090C] border-b border-white/[0.06] flex items-center justify-between px-3 md:px-4 z-20 select-none">
      {/* 左ロゴ & システム表示 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-white font-mono font-semibold text-xs tracking-wider">
            KIN-KOROKU
          </span>
          <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.2 rounded">
            v2.0
          </span>
          <span className="hidden lg:inline text-[11px] text-zinc-500 font-sans pl-1">
            高収益事業・財務構造端末
          </span>
        </div>
      </div>

      {/* 中央: ⌘K コマンドパレットトリガー */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.12] transition-colors rounded px-2.5 py-1 text-xs text-zinc-400 w-48 md:w-80 justify-between group"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
          <span className="truncate text-zinc-400">銘柄・手口・利益率を検索...</span>
        </div>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] bg-white/[0.04] border border-white/[0.08] px-1.5 py-0.5 rounded text-zinc-400">
          ⌘K
        </kbd>
      </button>

      {/* 右側: 通貨切替 & PRO */}
      <div className="flex items-center gap-2">
        {/* 通貨切替 */}
        <button
          onClick={onToggleCurrency}
          className="flex items-center gap-1 text-[11px] font-mono bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] px-2 py-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
          title="表示通貨の切り替え"
        >
          <Globe className="w-3 h-3 text-zinc-500" />
          <span>{currency}</span>
        </button>

        {/* PROボタン（落ち着いたシルバー/モノトーン） */}
        <button className="text-xs font-medium px-2.5 py-1 rounded bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-sm">
          PRO
        </button>
      </div>
    </header>
  );
};
