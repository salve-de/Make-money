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
    <header className="h-13 bg-white border-b border-slate-200/90 sticky top-0 z-40 flex items-center justify-between px-5 sm:px-6 shrink-0 select-none font-sans">
      {/* 左ブランド ＆ メインナビ */}
      <div className="flex items-center gap-7">
        {/* ブランドロゴ（Linear / Stripe 規格の端正なミニマリズム） */}
        <div 
          onClick={() => onChangeMainView('PORTAL')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-md bg-slate-950 flex items-center justify-center shadow-xs group-hover:bg-slate-800 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4V6z" fill="currentColor" fillOpacity="0.9" />
              <path d="M4 11h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z" fill="currentColor" fillOpacity="0.5" />
              <circle cx="12" cy="18.5" r="2.5" fill="#10B981" />
            </svg>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-sm text-slate-950 tracking-tight">
              金鉱録
            </span>
            <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
              KIN-KOROKU
            </span>
          </div>
        </div>

        {/* 垂直セパレーター */}
        <div className="h-4 w-px bg-slate-200 hidden md:block" />

        {/* メインビュー切替ナビゲーション（フラット・セグメント） */}
        <nav className="hidden sm:flex items-center gap-1 text-xs font-sans">
          <button
            onClick={() => onChangeMainView('PORTAL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              isPortalActive
                ? 'bg-slate-100 text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard size={13} className={isPortalActive ? 'text-slate-950' : 'text-slate-400'} />
            <span>市場インテリジェンス</span>
          </button>
          <button
            onClick={() => onChangeMainView('TERMINAL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              mainView === 'TERMINAL'
                ? 'bg-slate-100 text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <Database size={13} className={mainView === 'TERMINAL' ? 'text-slate-950' : 'text-slate-400'} />
            <span>企業財務データベース</span>
          </button>
          <button
            onClick={() => onChangeMainView('FINDER')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              mainView === 'FINDER'
                ? 'bg-slate-100 text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <Sparkles size={13} className={mainView === 'FINDER' ? 'text-slate-950' : 'text-slate-400'} />
            <span>リソース適合診断</span>
          </button>
          <button
            onClick={() => onChangeMainView('IDEAS_VAULT')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              mainView === 'IDEAS_VAULT'
                ? 'bg-slate-100 text-slate-950 font-bold'
                : 'text-slate-500 hover:text-slate-950 hover:bg-slate-50'
            }`}
          >
            <Command size={13} className={mainView === 'IDEAS_VAULT' ? 'text-slate-950' : 'text-slate-400'} />
            <span>実践機会台帳</span>
          </button>
        </nav>
      </div>

      {/* 中央〜右側検索バー ＆ 収録件数 ＆ 認証 */}
      <div className="flex items-center gap-3 flex-1 max-w-md justify-end ml-4">
        <div className="relative w-full max-w-xs">
          <Search size={13} className="text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="企業名、モデル、手法で瞬時検索..."
            className="w-full h-7.5 pl-8 pr-12 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-slate-900 rounded-md text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-sans"
          />
          <div className="absolute right-1.5 top-1.5 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-200/60 text-[9px] font-mono text-slate-500">
            <Command size={9} />
            <span>K</span>
          </div>
        </div>

        {/* 機関ステータス表示 */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-500 shrink-0 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="font-bold text-slate-900 tabular-nums">{totalCount}</span>
          <span>社 実査済</span>
        </div>

        {/* PROアンロックボタン */}
        {onOpenProModal && (
          <button
            type="button"
            onClick={onOpenProModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-md transition-colors shrink-0 shadow-xs cursor-pointer"
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
        className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-400 rounded-md shrink-0 cursor-default"
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
          className="px-3 py-1 text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white rounded-md transition-colors shrink-0 cursor-pointer shadow-xs"
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
        className="flex items-center gap-1.5 py-1 px-2 rounded-md hover:bg-slate-100 border border-slate-200 text-xs text-slate-800 transition-colors cursor-pointer"
      >
        <div className="w-4.5 h-4.5 rounded bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
          {user.email ? user.email[0].toUpperCase() : 'U'}
        </div>
        {isPro && (
          <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 font-mono">
            PRO
          </span>
        )}
      </button>

      {isMenuOpen && (
        <div
          className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-lg shadow-md p-1 z-50 text-xs font-sans"
          onClick={() => setIsMenuOpen(false)}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100">
            <p className="font-semibold text-slate-900 truncate">{user.email}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {isPro ? 'PRO 機関ライセンス' : '無料 一般ライセンス'}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors text-left cursor-pointer mt-1 font-medium"
          >
            <LogOut size={12} />
            <span>ログアウト</span>
          </button>
        </div>
      )}
    </div>
  );
}
