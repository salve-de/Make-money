'use client';

import React from 'react';
import { Search, Terminal, Crown, Globe } from 'lucide-react';

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
    <header className="h-12 w-full bg-[#090D14] border-b border-white/[0.08] flex items-center justify-between px-3 md:px-4 z-20 select-none">
      {/* 左ロゴ & システム表示 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-xs">
            <Terminal className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-white font-mono font-bold text-sm tracking-wider">
                KIN-KOROKU
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                v2.0 OS
              </span>
            </div>
            <span className="hidden sm:inline text-[9px] text-slate-400 font-mono tracking-tight">
              資本主義の裏帳簿 ＆ 高収益事業解剖端末
            </span>
          </div>
        </div>
      </div>

      {/* 中央: ⌘K コマンドパレットトリガー */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 bg-[#111624] hover:bg-[#161D2F] border border-white/[0.1] hover:border-white/[0.2] transition-colors rounded px-3 py-1.5 text-xs text-slate-400 w-48 md:w-80 justify-between group"
      >
        <div className="flex items-center gap-2 truncate">
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
          <span className="truncate">銘柄・手口・利益率を検索...</span>
        </div>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 font-mono text-[10px] bg-white/[0.06] border border-white/[0.1] px-1.5 py-0.5 rounded text-slate-400">
          ⌘K
        </kbd>
      </button>

      {/* 右側: 通貨切替 & PRO & ステータス */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* 通貨切替 */}
        <button
          onClick={onToggleCurrency}
          className="flex items-center gap-1 text-[11px] font-mono bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] px-2 py-1 rounded text-slate-300 transition-colors"
          title="表示通貨の切り替え"
        >
          <Globe className="w-3 h-3 text-slate-400" />
          <span>{currency}</span>
        </button>

        {/* PRO認証ボタン */}
        <button className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs px-2.5 py-1 rounded transition-colors shadow-sm">
          <Crown className="w-3.5 h-3.5 fill-current" />
          <span className="hidden sm:inline">TERMINAL PRO</span>
          <span className="sm:hidden">PRO</span>
        </button>
      </div>
    </header>
  );
};
