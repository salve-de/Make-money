'use client';

import React from 'react';
import { Search, Globe, KeyRound } from 'lucide-react';

interface TerminalTopBarProps {
  onOpenCommandPalette: () => void;
  currency: 'JPY' | 'USD';
  onToggleCurrency: () => void;
  onOpenPro?: () => void;
}

export const TerminalTopBar: React.FC<TerminalTopBarProps> = ({
  onOpenCommandPalette,
  currency,
  onToggleCurrency,
  onOpenPro,
}) => {
  return (
    <header className="h-[30px] w-full bg-[#07080A] border-b border-white/[0.06] flex items-center justify-between px-3 z-20 select-none text-[11px] font-mono">
      {/* 左: システム識別 */}
      <div className="flex items-center shrink-0">
        <span className="text-white font-bold tracking-wider text-[11px]">
          KIN-KOROKU
        </span>
      </div>

      {/* 中央: ⌘K プロ用超薄型インライン検索 */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all rounded px-2 h-[22px] text-zinc-400 w-48 md:w-80 justify-between group cursor-pointer"
        title="全銘柄・手口・数値を検索 (⌘K)"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Search className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          <span className="truncate text-[10px] text-zinc-500 group-hover:text-zinc-400">銘柄・手口・裏帳簿を検索...</span>
        </div>
        <kbd className="hidden sm:inline-flex items-center text-[9px] bg-white/[0.04] border border-white/[0.06] px-1 rounded text-zinc-500 font-mono">
          ⌘K
        </kbd>
      </button>

      {/* 右側: 通貨切替 & PROアンロック */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 通貨切替（極薄トグル） */}
        <button
          onClick={onToggleCurrency}
          className="flex items-center gap-1 text-[10px] h-[22px] bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] px-1.5 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          title="表示通貨の切り替え (JPY / USD)"
        >
          <Globe className="w-2.5 h-2.5 text-zinc-500" />
          <span>{currency}</span>
        </button>

        {/* PROボタン（プロ端末に調和する高品位シルバー） */}
        <button 
          onClick={onOpenPro}
          className="flex items-center gap-1 text-[10px] font-bold h-[22px] px-2 rounded bg-white text-zinc-950 hover:bg-zinc-200 transition-colors shadow-xs cursor-pointer"
          title="PROプランで全裏帳簿を解錠"
        >
          <KeyRound className="w-2.5 h-2.5" />
          <span>PRO</span>
        </button>
      </div>
    </header>
  );
};

