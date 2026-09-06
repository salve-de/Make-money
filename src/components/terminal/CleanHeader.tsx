'use client';

import React from 'react';
import { LayoutDashboard, Database, Sparkles, Search, Command } from 'lucide-react';

interface CleanHeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  totalCount: number;
  mainView: string;
  onChangeMainView: (view: any) => void;
}

export const CleanHeader: React.FC<CleanHeaderProps> = ({
  searchQuery,
  onSearchChange,
  totalCount,
  mainView,
  onChangeMainView
}) => {
  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 flex items-center justify-between px-5 sm:px-7 shrink-0 select-none font-sans">
      {/* 左ブランド ＆ メインナビ */}
      <div className="flex items-center gap-6">
        <div 
          onClick={() => onChangeMainView('PORTAL')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          {/* 洗練された幾何学シンボル（Linear/Stripe風） */}
          <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shadow-xs ring-1 ring-slate-900/10 group-hover:scale-[1.02] transition-transform">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3H4V6z" fill="currentColor" fillOpacity="0.9" />
              <path d="M4 11h16v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4z" fill="currentColor" fillOpacity="0.5" />
              <circle cx="12" cy="18.5" r="2.5" fill="#10B981" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-slate-950 tracking-tight font-sans">
                金鉱録
              </span>
              <span className="text-[10px] font-mono tracking-widest text-slate-400 font-semibold uppercase">
                KIN-KOROKU
              </span>
            </div>
            <span className="text-[9px] font-mono text-slate-400 -mt-0.5">
              スモールビジネス一次情報金庫
            </span>
          </div>
        </div>

        {/* 垂直セパレーター */}
        <div className="h-5 w-px bg-slate-200 hidden md:block" />

        {/* メインビュー切替ナビゲーション（洗練されたフラットタブ） */}
        <nav className="hidden sm:flex items-center gap-1 bg-slate-100/70 p-1 rounded-lg border border-slate-200/80 text-xs font-sans">
          <button
            onClick={() => onChangeMainView('PORTAL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              mainView !== 'TERMINAL' && mainView !== 'IDEAS_VAULT'
                ? 'bg-white text-slate-950 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <LayoutDashboard size={13} className={mainView !== 'TERMINAL' && mainView !== 'IDEAS_VAULT' ? 'text-slate-950' : 'text-slate-400'} />
            <span>市場インテリジェンス</span>
          </button>
          <button
            onClick={() => onChangeMainView('TERMINAL')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              mainView === 'TERMINAL'
                ? 'bg-white text-slate-950 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <Database size={13} className={mainView === 'TERMINAL' ? 'text-slate-950' : 'text-slate-400'} />
            <span>企業財務データベース</span>
          </button>
          <button
            onClick={() => onChangeMainView('IDEAS_VAULT')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
              mainView === 'IDEAS_VAULT'
                ? 'bg-white text-slate-950 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <Sparkles size={13} className={mainView === 'IDEAS_VAULT' ? 'text-emerald-600' : 'text-slate-400'} />
            <span>実践機会台帳</span>
          </button>
        </nav>
      </div>

      {/* 中央〜右側検索バー ＆ 収録件数 */}
      <div className="flex items-center gap-3 flex-1 max-w-md justify-end ml-4">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="企業名、ツール、手法、月利で検索..."
            className="w-full h-8.5 pl-8.5 pr-14 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 focus:border-slate-400 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all font-sans focus:ring-1 focus:ring-slate-300 shadow-2xs"
          />
          <div className="absolute right-2 top-2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px] font-mono text-slate-400">
            <Command size={10} />
            <span>K</span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-slate-600 shrink-0 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold text-slate-900 tabular-nums">{totalCount}</span>
          <span className="text-slate-400">社 照合済</span>
        </div>

        {/* 認証・アカウントボタン */}
        <UserNavButton />
      </div>
    </header>
  );
};

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { User as UserIcon, LogOut, ShieldCheck } from 'lucide-react';

function UserNavButton() {
  const { user, isPro, signOut, loading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (loading && !user) {
    return (
      <button
        disabled
        className="px-3 py-1.5 text-xs font-semibold bg-slate-900/10 text-slate-400 rounded-lg shrink-0 cursor-default"
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
          className="px-3 py-1.5 text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-white rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
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
        className="flex items-center gap-1.5 py-1 px-2 rounded-lg hover:bg-slate-100 border border-slate-200/80 text-xs text-slate-800 transition-colors cursor-pointer"
      >
        <div className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
          {user.email ? user.email[0].toUpperCase() : 'U'}
        </div>
        {isPro && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800 font-mono">
            PRO
          </span>
        )}
      </button>

      {isMenuOpen && (
        <div
          className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 z-50 text-xs font-sans animate-in fade-in slide-in-from-top-1"
          onClick={() => setIsMenuOpen(false)}
        >
          <div className="px-2.5 py-1.5 border-b border-slate-100">
            <p className="font-semibold text-slate-900 truncate">{user.email}</p>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              {isPro ? 'PRO 会員（全解放）' : '無料 会員'}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left cursor-pointer mt-1 font-medium"
          >
            <LogOut size={13} />
            <span>ログアウト</span>
          </button>
        </div>
      )}
    </div>
  );
}

