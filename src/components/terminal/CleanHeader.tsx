'use client';

import React, { useState } from 'react';
import { LayoutDashboard, Database, Sparkles, Search, Command, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

interface CleanHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  mainView: string;
  onChangeMainView: (view: any) => void;
  onOpenProModal?: () => void;
}

export const CleanHeader: React.FC<CleanHeaderProps> = ({
  searchQuery,
  onSearchChange,
  totalCount,
  mainView,
  onChangeMainView,
  onOpenProModal
}) => {
  const isPortalActive = mainView === 'PORTAL' || mainView === 'COLLECTIONS_LIST' || mainView === 'COLLECTION_DETAIL' || mainView === 'SIGNALS_LIST' || mainView === 'SIGNAL_DETAIL' || mainView === 'LEADERBOARD';

  return (
    <header className="h-13 bg-[#0D1117] border-b border-white/[0.08] sticky top-0 z-40 flex items-center justify-between px-5 sm:px-6 shrink-0 select-none font-sans text-zinc-100">
      {/* 左ブランド ＆ メインナビ */}
      <div className="flex items-center gap-7">
        {/* ブランドロゴ（Bloomberg / Linear 規格の冷徹なミニマリズム） */}
        <div 
          onClick={() => onChangeMainView('PORTAL')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded bg-zinc-900 border border-white/[0.12] flex items-center justify-center group-hover:border-zinc-500 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-zinc-200">
              <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4V6z" fill="currentColor" fillOpacity="0.9" />
              <path d="M4 11h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z" fill="currentColor" fillOpacity="0.5" />
              <circle cx="12" cy="18.5" r="2.5" fill="#10B981" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-sm text-zinc-100 tracking-tight">
              金鉱録
            </span>
            <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
              KIN-KOROKU
            </span>
          </div>
        </div>

        {/* 垂直セパレーター */}
        <div className="h-4 w-px bg-white/[0.08] hidden md:block" />

        {/* メインビュー切替ナビゲーション（高密度セグメント ＆ ショートカット表示） */}
        <nav className="hidden sm:flex items-center gap-1 text-xs font-sans">
          <button
            onClick={() => onChangeMainView('PORTAL')}
            className={`px-3 py-1.5 rounded font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              isPortalActive
                ? 'bg-white/[0.1] text-white font-bold border border-white/[0.12]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <LayoutDashboard size={13} className={isPortalActive ? 'text-white' : 'text-zinc-400'} />
            <span>市場インテリジェンス</span>
            <span className="text-[9px] font-mono opacity-40 px-1 py-0.2 rounded bg-white/[0.06]">1</span>
          </button>
          <button
            onClick={() => onChangeMainView('TERMINAL')}
            className={`px-3 py-1.5 rounded font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mainView === 'TERMINAL'
                ? 'bg-white/[0.1] text-white font-bold border border-white/[0.12]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Database size={13} className={mainView === 'TERMINAL' ? 'text-white' : 'text-zinc-400'} />
            <span>企業財務データベース</span>
            <span className="text-[9px] font-mono opacity-40 px-1 py-0.2 rounded bg-white/[0.06]">2</span>
          </button>
          <button
            onClick={() => onChangeMainView('FINDER')}
            className={`px-3 py-1.5 rounded font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mainView === 'FINDER'
                ? 'bg-white/[0.1] text-white font-bold border border-white/[0.12]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Sparkles size={13} className={mainView === 'FINDER' ? 'text-white' : 'text-zinc-400'} />
            <span>リソース適合診断</span>
            <span className="text-[9px] font-mono opacity-40 px-1 py-0.2 rounded bg-white/[0.06]">3</span>
          </button>
          <button
            onClick={() => onChangeMainView('IDEAS_VAULT')}
            className={`px-3 py-1.5 rounded font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              mainView === 'IDEAS_VAULT'
                ? 'bg-white/[0.1] text-white font-bold border border-white/[0.12]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <Command size={13} className={mainView === 'IDEAS_VAULT' ? 'text-white' : 'text-zinc-400'} />
            <span>実践機会台帳</span>
            <span className="text-[9px] font-mono opacity-40 px-1 py-0.2 rounded bg-white/[0.06]">4</span>
          </button>
        </nav>
      </div>

      {/* 中央〜右側検索バー ＆ 収録件数 ＆ 認証 */}
      <div className="flex items-center gap-3 flex-1 max-w-md justify-end ml-4">
        <div className="relative w-full max-w-xs">
          <Search size={13} className="text-zinc-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="企業名、モデル、手法で瞬時検索..."
            className="w-full h-7.5 pl-8 pr-12 bg-[#161B22] hover:bg-[#1C2128] focus:bg-[#1C2128] border border-white/[0.08] focus:border-zinc-500 rounded text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-all font-sans"
          />
          <div className="absolute right-1.5 top-1.5 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono text-zinc-400 border border-white/[0.04]">
            <Command size={9} />
            <span>K</span>
          </div>
        </div>

        {/* 機関ステータス表示 */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 shrink-0 bg-white/[0.03] px-2.5 py-1 rounded border border-white/[0.08]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          <span className="font-bold text-zinc-200 tabular-nums">{totalCount}</span>
          <span>社 実査済</span>
        </div>

        {/* PROアンロックボタン */}
        {onOpenProModal && (
          <button
            type="button"
            onClick={onOpenProModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-amber-400 hover:bg-amber-300 text-black rounded transition-colors shrink-0 cursor-pointer shadow-xs"
          >
            <span>PRO</span>
          </button>
        )}

        {/* 認証・アカウントボタン */}
        <UserNavButton onOpenProModal={onOpenProModal} />
      </div>
    </header>
  );
};

function UserNavButton({ onOpenProModal }: { onOpenProModal?: () => void }) {
  const { user, isPro, signOut, loading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (loading && !user) {
    return (
      <button
        disabled
        className="px-2.5 py-1 text-xs font-medium bg-white/[0.04] text-zinc-500 rounded shrink-0 cursor-default border border-white/[0.06]"
      >
        ログイン
      </button>
    );
  }

  if (!user) {
    return (
      <>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1 text-xs font-semibold bg-zinc-100 hover:bg-white text-zinc-950 rounded transition-colors shrink-0 cursor-pointer shadow-xs"
        >
          ログイン
        </button>
        <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </>
    );
  }

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="flex items-center gap-1.5 py-1 px-2 rounded hover:bg-white/[0.06] border border-white/[0.1] text-xs text-zinc-200 transition-colors cursor-pointer bg-white/[0.03]"
      >
        <div className="w-4.5 h-4.5 rounded bg-zinc-800 text-zinc-200 flex items-center justify-center text-[10px] font-bold border border-white/[0.1]">
          {user.email ? user.email[0].toUpperCase() : 'U'}
        </div>
        {isPro && (
          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
            PRO
          </span>
        )}
      </button>

      {isMenuOpen && (
        <div
          className="absolute right-0 mt-1.5 w-48 bg-[#161B22] border border-white/[0.12] rounded-lg shadow-xl p-1 z-50 text-xs font-sans"
          onClick={() => setIsMenuOpen(false)}
        >
          <div className="px-2.5 py-1.5 border-b border-white/[0.08]">
            <p className="font-semibold text-zinc-100 truncate">{user.email}</p>
            <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
              {isPro ? 'PRO 機関ライセンス' : '無料 一般ライセンス'}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-rose-400 hover:bg-rose-950/40 rounded transition-colors text-left cursor-pointer mt-1 font-medium"
          >
            <LogOut size={12} />
            <span>ログアウト</span>
          </button>
        </div>
      )}
    </div>
  );
}
