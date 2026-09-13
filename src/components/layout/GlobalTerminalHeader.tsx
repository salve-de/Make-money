'use client';

import React from 'react';
import { Database, LayoutDashboard, Search, Command } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

interface GlobalTerminalHeaderProps {
  mainView: 'TERMINAL' | 'PORTAL';
  onChangeMainView: (view: 'TERMINAL' | 'PORTAL') => void;
  onOpenSearchPalette: () => void;
  onOpenProModal?: () => void;
  totalCount: number;
}

export const GlobalTerminalHeader: React.FC<GlobalTerminalHeaderProps> = ({
  mainView,
  onChangeMainView,
  onOpenSearchPalette,
  onOpenProModal,
  totalCount
}) => {
  return (
    <header className="h-12 bg-[#080B10]/95 backdrop-blur-md border-b border-white/[0.08] sticky top-0 z-40 flex items-center justify-between px-3 sm:px-5 shrink-0 select-none font-sans text-zinc-100">
      {/* 左：ブランドロゴ ＆ メインナビ */}
      <div className="flex items-center gap-2 sm:gap-6">
        <div 
          onClick={() => onChangeMainView('TERMINAL')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="w-6.5 h-6.5 rounded bg-zinc-900 border border-white/[0.12] flex items-center justify-center group-hover:border-zinc-500 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="text-zinc-200">
              <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4V6z" fill="currentColor" fillOpacity="0.9" />
              <path d="M4 11h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z" fill="currentColor" fillOpacity="0.5" />
              <circle cx="12" cy="18.5" r="2.5" fill="#10B981" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-sm text-zinc-100 tracking-tight">
              金鉱録
            </span>
            <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase font-bold hidden sm:inline">
              CAPITAL OS
            </span>
          </div>
        </div>

        {/* 垂直セパレーター */}
        <div className="h-4 w-px bg-white/[0.08] hidden sm:block" />

        {/* メインナビゲーション（台帳 / シグナル: デスクトップ用） */}
        <nav className="hidden md:flex items-center gap-1 text-xs font-sans">
          <button
            onClick={() => onChangeMainView('TERMINAL')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mainView === 'TERMINAL'
                ? 'bg-white/[0.1] text-white font-bold border border-white/[0.14] shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Database size={12} className={mainView === 'TERMINAL' ? 'text-emerald-400' : 'text-zinc-400'} />
            <span>全頭台帳</span>
          </button>
          <button
            onClick={() => onChangeMainView('PORTAL')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mainView === 'PORTAL'
                ? 'bg-white/[0.1] text-white font-bold border border-white/[0.14] shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <LayoutDashboard size={12} className={mainView === 'PORTAL' ? 'text-emerald-400' : 'text-zinc-400'} />
            <span>市場シグナル</span>
          </button>
        </nav>
      </div>

      {/* 中央〜右側：⌘K検索トリガー ＆ 実査社数 ＆ PRO / 認証 */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* ⌘K コマンドパレット起動バー */}
        <button
          onClick={onOpenSearchPalette}
          className="flex items-center justify-between w-28 xs:w-44 sm:w-64 h-7.5 px-2.5 bg-[#12161F] hover:bg-[#181D28] border border-white/[0.08] hover:border-white/[0.16] rounded text-xs text-zinc-400 transition-all cursor-pointer"
        >
          <div className="flex items-center gap-1.5 truncate">
            <Search size={12} className="text-zinc-500 shrink-0" />
            <span className="text-[11px] truncate">銘柄・手法を検索...</span>
          </div>
          <div className="hidden sm:flex items-center gap-0.5 px-1 py-0.2 rounded bg-white/[0.06] text-[9px] font-mono text-zinc-400 border border-white/[0.04] shrink-0">
            <Command size={9} />
            <span>K</span>
          </div>
        </button>

        {/* 実査社数バッジ */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 shrink-0 bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.08]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="font-bold text-zinc-200 tabular-nums">{totalCount}</span>
          <span>社 実査済</span>
        </div>

        {/* PROアンロックボタン */}
        {onOpenProModal && (
          <button
            type="button"
            onClick={onOpenProModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded transition-colors shrink-0 cursor-pointer shadow-xs border border-emerald-400/80"
          >
            <span>PRO</span>
          </button>
        )}

        {/* ユーザー認証ボタン */}
        <UserHeaderNav />
      </div>
    </header>
  );
};

function UserHeaderNav() {
  const { user, signOut, loading } = useAuth();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  if (loading && !user) {
    return (
      <div className="w-14 h-6.5 bg-white/[0.04] rounded animate-pulse" />
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-2.5 py-1 text-xs font-semibold bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 border border-white/[0.12] rounded transition-colors shrink-0 cursor-pointer shadow-xs"
        >
          ログイン
        </button>
        <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-zinc-400 hidden md:inline truncate max-w-[100px]">
        {user.email?.split('@')[0]}
      </span>
      <button
        onClick={() => signOut()}
        className="px-2 py-1 text-[11px] font-mono text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded transition-colors cursor-pointer"
        title="ログアウト"
      >
        退出
      </button>
    </div>
  );
}
