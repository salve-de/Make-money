'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  KeyRound,
  Bookmark,
  MoreHorizontal,
  Rocket,
  Store,
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
  | 'MARKETPLACE'
  | 'WELCOME';

type LocalWorkspaceMode = 'LEDGER' | 'PLAYBOOK' | 'RADAR' | 'ARCHETYPES' | 'SYNTHESIS';

interface GlobalHeaderProps {
  currentSection?: GlobalNavSection;
  onOpenPro?: () => void;
  rightContent?: React.ReactNode;
  bookmarkCount?: number;
  onSelectBookmark?: () => void;
  isBookmarkActive?: boolean;
  bookmarkSyncStatus?: BookmarkSyncStatus;
  hideMobilePrimaryNav?: boolean;
  onSelectLocalMode?: (mode: LocalWorkspaceMode) => void;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  currentSection,
  onOpenPro,
  rightContent,
  bookmarkCount,
  onSelectBookmark,
  isBookmarkActive,
  bookmarkSyncStatus,
  hideMobilePrimaryNav = false,
  onSelectLocalMode,
}) => {
  const pathname = usePathname();

  // 現在のアクティブセクションを特定（props優先、なければURLから推定）
  const activeSection: GlobalNavSection = currentSection || (() => {
    if (pathname?.startsWith('/discover')) return 'DISCOVER';
    if (pathname?.startsWith('/execute')) return 'EXECUTION';
    if (pathname?.startsWith('/marketplace')) return 'MARKETPLACE';
    if (pathname?.startsWith('/build')) return 'BUILDER';
    if (pathname?.startsWith('/playbook')) return 'PLAYBOOK';
    if (pathname?.startsWith('/radar')) return 'RADAR';
    if (pathname === '/welcome') return 'WELCOME';
    return 'LEDGER';
  })();

  const primaryNavItems = [
    {
      id: 'LEDGER' as const,
      label: '事例一覧',
      href: '/',
    },
    {
      id: 'DISCOVER' as const,
      label: '発見',
      href: '/discover',
    },
    {
      id: 'PLAYBOOK' as const,
      label: '収益構造',
      href: '/playbook',
    },
    {
      id: 'RADAR' as const,
      label: '市場動向',
      href: '/radar',
    },
    {
      id: 'ARCHETYPES' as const,
      label: '事業パターン',
      href: '/?mode=ARCHETYPES',
    },
    {
      id: 'SYNTHESIS' as const,
      label: '事業検討',
      href: '/?mode=SYNTHESIS',
    },
  ];

  const localModeBySection: Partial<Record<GlobalNavSection, LocalWorkspaceMode>> = {
    LEDGER: 'LEDGER',
    PLAYBOOK: 'PLAYBOOK',
    RADAR: 'RADAR',
    ARCHETYPES: 'ARCHETYPES',
    SYNTHESIS: 'SYNTHESIS',
  };

  const handleLocalNavigation = (
    event: React.MouseEvent<HTMLAnchorElement>,
    section: GlobalNavSection,
  ) => {
    const mode = localModeBySection[section];
    if (!mode || !onSelectLocalMode) return;
    event.preventDefault();
    onSelectLocalMode(mode);
  };

  const secondaryNavItems = [
    {
      id: 'MARKETPLACE' as const,
      label: 'サービス一覧',
      href: '/marketplace',
      icon: Store,
    },
    {
      id: 'EXECUTION' as const,
      label: '実行中',
      href: '/execute',
      icon: Rocket,
    },
  ];

  const compactMobileNav = rightContent !== undefined;
  const mobileMenuItems = compactMobileNav
    ? [...primaryNavItems, ...secondaryNavItems]
    : hideMobilePrimaryNav
    ? [...primaryNavItems, ...secondaryNavItems]
    : [...primaryNavItems.slice(3), ...secondaryNavItems];
  const isMobileMenuActive = mobileMenuItems.some((item) => item.id === activeSection);

  return (
    <header className="h-14 w-full bg-surface/95 border-b border-white/[0.14] flex items-center justify-between px-2 sm:px-5 z-40 shrink-0 gap-1 max-[370px]:gap-0">
      {/* 左端: ブランド・ロゴ */}
      <div className="flex items-center gap-2 shrink-0 mr-1 sm:mr-6 max-[370px]:mr-0">
        <Link
          href="/"
          prefetch={false}
          className="flex min-h-11 items-center gap-2 text-[15px] font-semibold tracking-wide text-zinc-100 transition-colors hover:text-white max-[370px]:text-xs"
        >
          <span>Make Money</span>
        </Link>
      </div>

      {/* 中央: 主要ナビゲーションタブ群（横スクロール対応） */}
      <nav
        aria-label="主要ナビゲーション"
        className="hidden min-w-0 items-center gap-0.5 py-1 xl:flex"
      >
        {primaryNavItems.map((item) => {
          const isActive = activeSection === item.id;

          return (
            <Link
              key={item.id}
              href={item.href}
          prefetch={false}
              onClick={(event) => handleLocalNavigation(event, item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-11 items-center border-b-2 px-3 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'border-accent bg-amber-300/[0.09] text-amber-100'
                  : 'border-transparent text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <span>{item.label}</span>
            </Link>
          );
        })}

        <details className="group relative shrink-0">
          <summary className={`flex min-h-11 list-none cursor-pointer items-center gap-1.5 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors [&::-webkit-details-marker]:hidden ${
            secondaryNavItems.some((item) => item.id === activeSection)
              ? 'border-accent bg-amber-300/[0.09] text-amber-100'
              : 'border-transparent text-zinc-400 hover:text-zinc-100'
          }`}>
            <span>その他</span>
            <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-lg border border-white/[0.14] bg-surface-raised p-1.5 shadow-xl">
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(event) => handleLocalNavigation(event, item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-sm transition-colors ${
                    isActive ? 'bg-amber-300/[0.1] text-amber-100 ring-1 ring-inset ring-amber-300/30' : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4 text-zinc-400" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </details>
      </nav>

      <nav aria-label={(hideMobilePrimaryNav || compactMobileNav) ? 'メニュー' : '主要ナビゲーション'} className="flex min-w-0 flex-1 items-center justify-end gap-0.5 xl:hidden">
        {!hideMobilePrimaryNav && !compactMobileNav && primaryNavItems.slice(0, 3).map((item, index) => {
          const isActive = activeSection === item.id;
          const shortLabels = ['一覧', '発見', '収益'];
          return (
            <Link
              key={item.id}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 items-center border-b-2 px-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                isActive ? 'border-accent rounded-t-md bg-amber-300/[0.09] text-amber-100' : 'border-transparent text-zinc-400'
              }`}
            >
              {shortLabels[index]}
            </Link>
          );
        })}
        <details className="group relative shrink-0">
          <summary
            aria-label={(hideMobilePrimaryNav || compactMobileNav) ? 'メニューを開く' : 'その他のページ'}
            className={`flex min-h-11 list-none cursor-pointer items-center gap-0.5 border-b-2 px-1.5 text-xs font-medium whitespace-nowrap transition-colors [&::-webkit-details-marker]:hidden ${
              isMobileMenuActive ? 'border-accent rounded-t-md bg-amber-300/[0.09] text-amber-100' : 'border-transparent text-zinc-400'
            }`}
          >
            <span>{(hideMobilePrimaryNav || compactMobileNav) ? 'メニュー' : 'その他'}</span>
            <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
          </summary>
          <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-white/[0.14] bg-surface-raised p-1.5 shadow-xl">
            {mobileMenuItems.map((item) => {
              const Icon = 'icon' in item ? item.icon : null;
              const isActive = activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={(event) => handleLocalNavigation(event, item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`${hideMobilePrimaryNav && !compactMobileNav && Boolean(localModeBySection[item.id]) ? 'hidden md:flex' : 'flex'} min-h-11 items-center gap-2 rounded-md px-3 text-sm transition-colors ${
                    isActive ? 'bg-amber-300/[0.1] text-amber-100 ring-1 ring-inset ring-amber-300/30' : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  {Icon ? <Icon aria-hidden="true" className="h-4 w-4 text-zinc-400" /> : <span className="w-4" />}
                  {item.label}
                </Link>
              );
            })}
          </div>
        </details>
      </nav>

      {/* 右端: アクション（カスタム、またはPRO解錠 / ターミナルへ戻る） */}
      <div className="flex items-center gap-2 shrink-0 ml-3 sm:ml-5 max-[370px]:ml-0 max-[370px]:gap-0">
        {rightContent !== undefined ? (
          rightContent
        ) : (
          <>
            {onSelectBookmark && (
              <button
                onClick={onSelectBookmark}
                className={`flex min-h-10 items-center gap-1 px-2.5 py-1.5 rounded-md text-sm transition-colors cursor-pointer border ${
                  isBookmarkActive
                    ? 'bg-amber-300/[0.12] text-amber-50 border-amber-300/50 ring-1 ring-inset ring-amber-300/15'
                    : 'text-zinc-300 hover:text-white border-white/[0.14] hover:bg-white/[0.07]'
                }`}
                title={`保存した事例 (${bookmarkCount || 0})`}
                aria-label={`保存した事例 (${bookmarkCount || 0})`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">保存</span>
                {typeof bookmarkCount === 'number' && bookmarkCount > 0 && (
                  <span className="rounded-full bg-white/[0.1] px-1.5 py-0.5 text-xs tabular-nums text-zinc-200">
                    {bookmarkCount}
                  </span>
                )}
              </button>
            )}

            {bookmarkSyncStatus && (
              <span
                className={`hidden font-mono text-[9px] whitespace-nowrap sm:inline ${
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
                className="flex min-h-10 items-center gap-1.5 rounded-md border border-white/[0.16] px-3 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.06] cursor-pointer"
                title="利用プランを確認"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">プラン</span>
              </button>
            )}

          </>
        )}
      </div>
    </header>
  );
};
