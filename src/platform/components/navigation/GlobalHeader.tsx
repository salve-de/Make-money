'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Database, 
  BookOpen, 
  Flame, 
  TrendingUp, 
  Cpu, 
  Code2,
  Handshake,
  KeyRound,
  Bookmark,
  Rocket
} from 'lucide-react';
import type { BookmarkSyncStatus } from '../../hooks/useEntityFilter';

export type GlobalNavSection =
  | 'LEDGER'
  | 'DISCOVER'
  | 'PLAYBOOK'
  | 'RADAR'
  | 'ARCHETYPES'
  | 'SYNTHESIS'
  | 'BUILDER'
  | 'EXECUTION'
  | 'PARTNERS'
  | 'WELCOME';

interface GlobalHeaderProps {
  currentSection?: GlobalNavSection;
  onSelectLocalMode?: (mode: 'LEDGER' | 'PLAYBOOK' | 'RADAR' | 'ARCHETYPES' | 'SYNTHESIS') => void;
  onOpenPro?: () => void;
  rightContent?: React.ReactNode;
  bookmarkCount?: number;
  onSelectBookmark?: () => void;
  isBookmarkActive?: boolean;
  bookmarkSyncStatus?: BookmarkSyncStatus;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  currentSection,
  onSelectLocalMode,
  onOpenPro,
  rightContent,
  bookmarkCount,
  onSelectBookmark,
  isBookmarkActive,
  bookmarkSyncStatus,
}) => {
  const pathname = usePathname();

  // 現在のアクティブセクションを特定（props優先、なければURLから推定）
  const activeSection: GlobalNavSection = currentSection || (() => {
    if (pathname === '/partners') return 'PARTNERS';
    if (pathname?.startsWith('/discover')) return 'DISCOVER';
    if (pathname?.startsWith('/execute')) return 'EXECUTION';
    if (pathname?.startsWith('/build')) return 'BUILDER';
    if (pathname?.startsWith('/playbook')) return 'PLAYBOOK';
    if (pathname?.startsWith('/radar')) return 'RADAR';
    if (pathname === '/welcome') return 'WELCOME';
    return 'LEDGER';
  })();

  const navItems = [
    {
      id: 'LEDGER' as const,
      label: '財務台帳',
      enLabel: 'Ledger',
      href: '/',
      icon: Database,
    },
    {
      id: 'DISCOVER' as const,
      label: '発見',
      enLabel: 'Discover',
      href: '/discover',
      icon: Flame,
    },
    {
      id: 'PLAYBOOK' as const,
      label: '動的攻略本',
      enLabel: 'Playbook',
      href: '/playbook',
      icon: BookOpen,
    },
    {
      id: 'RADAR' as const,
      label: '市場レーダー',
      enLabel: 'Radar',
      href: '/radar',
      icon: Flame,
    },
    {
      id: 'ARCHETYPES' as const,
      label: '稼ぎの歪み',
      enLabel: 'Trends',
      href: '/?mode=ARCHETYPES',
      icon: TrendingUp,
    },
    {
      id: 'SYNTHESIS' as const,
      label: '事業壁打ち',
      enLabel: 'Synthesis',
      href: '/?mode=SYNTHESIS',
      icon: Cpu,
    },
    {
      id: 'BUILDER' as const,
      label: 'MVPを作る',
      enLabel: 'Builder',
      href: '/build/example-idea',
      icon: Code2,
    },
    {
      id: 'EXECUTION' as const,
      label: '実行中',
      enLabel: 'Execute',
      href: '/execute',
      icon: Rocket,
    },
    {
      id: 'PARTNERS' as const,
      label: 'パートナー',
      enLabel: 'Partners',
      href: '/partners',
      icon: Handshake,
      badge: '30%還元',
    },
  ];

  const handleNavClick = (
    e: React.MouseEvent,
    item: (typeof navItems)[number]
  ) => {
    // もしローカル（SPAモード切替）ハンドラーがあり、かつ対象がSPAモードの場合
    if (onSelectLocalMode && (item.id === 'LEDGER' || item.id === 'PLAYBOOK' || item.id === 'RADAR' || item.id === 'ARCHETYPES' || item.id === 'SYNTHESIS')) {
      e.preventDefault();
      onSelectLocalMode(item.id);
    }
  };

  return (
    <header className="h-12 w-full bg-[#07090E]/95 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between px-3 sm:px-4 z-40 select-none shrink-0">
      {/* 左端: ブランド・ロゴ */}
      <div className="flex items-center gap-3 shrink-0 mr-2 sm:mr-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-mono font-bold tracking-widest text-zinc-100 hover:text-white transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>MAKEMONEY</span>
        </Link>
        <span className="text-[10px] font-mono text-zinc-500 hidden xl:inline border-l border-white/[0.08] pl-2.5">
          CAPITAL ARBITRAGE TERMINAL
        </span>
      </div>

      {/* 中央: 主要ナビゲーションタブ群（横スクロール対応） */}
      <nav 
        aria-label="主要ナビゲーション" 
        className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-1"
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-white/[0.1] text-white font-medium border border-white/[0.15] shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]'
              }`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${
                  isActive
                    ? item.id === 'PARTNERS'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                    : 'text-zinc-500'
                }`}
              />
              <span>{item.label}</span>
              {item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* 右端: アクション（カスタム、またはPRO解錠 / ターミナルへ戻る） */}
      <div className="flex items-center gap-2 shrink-0 ml-2 sm:ml-4">
        {rightContent !== undefined ? (
          rightContent
        ) : (
          <>
            {onSelectBookmark && (
              <button
                onClick={onSelectBookmark}
                className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer border ${
                  isBookmarkActive
                    ? 'bg-white/[0.1] text-white border-white/[0.2]'
                    : 'text-zinc-400 hover:text-white border-white/[0.06] hover:bg-white/[0.04]'
                }`}
                title={`保存済み銘柄 (${bookmarkCount || 0})`}
                aria-label={`保存済み銘柄 (${bookmarkCount || 0})`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">保存</span>
                {typeof bookmarkCount === 'number' && bookmarkCount > 0 && (
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1 rounded-full">
                    {bookmarkCount}
                  </span>
                )}
              </button>
            )}

            {bookmarkSyncStatus && (
              <span
                className={`inline font-mono text-[9px] whitespace-nowrap ${
                  bookmarkSyncStatus === 'error'
                    ? 'text-rose-400'
                    : bookmarkSyncStatus === 'saving' || bookmarkSyncStatus === 'loading'
                    ? 'text-amber-300'
                    : bookmarkSyncStatus === 'synced'
                  ? 'text-emerald-400'
                  : 'text-zinc-500'
                }`}
                aria-live="polite"
              >
                {bookmarkSyncStatus === 'error'
                  ? '保存失敗'
                  : bookmarkSyncStatus === 'saving'
                  ? '保存中'
                  : bookmarkSyncStatus === 'loading'
                  ? '確認中'
                  : bookmarkSyncStatus === 'synced'
                  ? '同期済'
                  : 'ローカル'}
              </span>
            )}

            {onOpenPro && (
              <button
                onClick={onOpenPro}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white text-zinc-950 hover:bg-zinc-200 font-mono text-xs font-bold transition-colors cursor-pointer shadow-sm"
                title="PROプランで全詳細データを解錠"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">PRO解錠</span>
              </button>
            )}

            {activeSection !== 'LEDGER' && !onOpenPro && (
              <Link
                href="/"
                className="text-xs font-mono text-zinc-400 hover:text-white px-2 py-1 rounded hover:bg-white/[0.04] transition-colors whitespace-nowrap"
              >
                <span>台帳 ↗</span>
              </Link>
            )}
          </>
        )}
      </div>
    </header>
  );
};
