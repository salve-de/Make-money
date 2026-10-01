'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { BookmarkSyncStatus } from '../../hooks/useEntityFilter';
import { MobileBottomNav } from './MobileBottomNav';
import { Search } from 'lucide-react';
import { MobileMenu } from './MobileMenu';
import {
  GlobalNavSection,
  LOCAL_MODE_BY_SECTION,
  LocalWorkspaceMode,
  PRIMARY_NAV_ITEMS,
  PRO_HREF,
  SAVED_HREF,
  SECONDARY_NAV_ITEMS,
  LEGAL_LINKS,
  SECTION_TITLES,
} from './navigationItems';

export type { GlobalNavSection } from './navigationItems';

interface GlobalHeaderProps {
  currentSection?: GlobalNavSection;
  onOpenPro?: () => void;
  rightContent?: React.ReactNode;
  bookmarkCount?: number;
  onSelectBookmark?: () => void;
  isBookmarkActive?: boolean;
  bookmarkSyncStatus?: BookmarkSyncStatus;
  /** 互換用。下部メニューは常に全ページ共通のため何も変わらない */
  hideMobilePrimaryNav?: boolean;
  onSelectLocalMode?: (mode: LocalWorkspaceMode) => void;
  /** 渡すと検索欄が一覧をその場で絞り込む（台帳画面用）。渡さなければ送信で /?q= へ移動する。 */
  searchValue?: string;
  onSearchChange?: (query: string) => void;
  /** 画面自体に検索欄がある時。ヘッダーには検索欄も検索ボタンも出さない（検索欄を1画面に2つ並べない） */
  pageHasSearch?: boolean;
}

const SYNC_LABEL: Record<BookmarkSyncStatus, string> = {
  error: '保存失敗',
  saving: '保存中',
  synced: '同期済',
  // 読み込み中（ページを開いた直後の一瞬）と、この端末だけに保存している通常状態は表示しない
  loading: '',
  local: '',
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  currentSection,
  onOpenPro,
  rightContent,
  bookmarkCount,
  onSelectBookmark,
  isBookmarkActive,
  bookmarkSyncStatus,
  onSelectLocalMode,
  searchValue,
  onSearchChange,
  pageHasSearch = false,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const moreRef = useRef<HTMLDetailsElement>(null);

  const activeSection: GlobalNavSection = currentSection || (() => {
    if (pathname?.startsWith('/discover')) return 'DISCOVER';
    if (pathname?.startsWith('/execute')) return 'EXECUTION';
    if (pathname?.startsWith('/marketplace/businesses')) return 'BUSINESSES';
    if (pathname?.startsWith('/marketplace')) return 'MARKETPLACE';
    if (pathname?.startsWith('/compare')) return 'COMPARE';
    if (pathname?.startsWith('/alerts')) return 'ALERTS';
    if (pathname?.startsWith('/verify')) return 'VERIFY';
    if (pathname?.startsWith('/legal')) return 'LEGAL';
    if (pathname?.startsWith('/build')) return 'BUILDER';
    if (pathname?.startsWith('/playbook')) return 'PLAYBOOK';
    if (pathname?.startsWith('/radar')) return 'RADAR';
    if (pathname === '/welcome') return 'WELCOME';
    return 'LEDGER';
  })();

  const handleLocalNavigation = (
    event: React.MouseEvent<HTMLAnchorElement>,
    section: GlobalNavSection,
  ) => {
    moreRef.current?.removeAttribute('open');
    const mode = LOCAL_MODE_BY_SECTION[section];
    if (!mode || !onSelectLocalMode) return;
    event.preventDefault();
    onSelectLocalMode(mode);
  };

  // 1〜6: タブ移動 / "/": 検索欄へ
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (!/^[1-6]$/.test(event.key)) return;
      const item = PRIMARY_NAV_ITEMS[Number(event.key) - 1];
      if (!item) return;
      event.preventDefault();
      const mode = LOCAL_MODE_BY_SECTION[item.id];
      if (mode && onSelectLocalMode) onSelectLocalMode(mode);
      else router.push(item.href);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectLocalMode, router]);

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (onSearchChange) {
      searchRef.current?.blur();
      return;
    }
    const text = searchText.trim();
    router.push(text ? `/?q=${encodeURIComponent(text)}` : '/');
    searchRef.current?.blur();
  };

  const tabClass = (active: boolean) =>
    `flex h-full shrink-0 items-center gap-1.5 border-r border-term-line px-2 text-[13px] whitespace-nowrap xl:px-3 ${
      active
        ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_-2px_0_var(--term-accent)]'
        : 'text-term-muted hover:bg-term-head hover:text-term-fg'
    }`;

  const secondaryActive = SECONDARY_NAV_ITEMS.some((item) => item.id === activeSection);

  const renderBookmark = () => {
    const label = (
      <>
        <span>保存済み</span>
        {typeof bookmarkCount === 'number' && bookmarkCount > 0 && (
          <span className="term-num text-term-accent">{bookmarkCount}</span>
        )}
      </>
    );
    const cls = `flex h-full items-center gap-1.5 px-3 text-[13px] hover:bg-term-head ${
      isBookmarkActive ? 'bg-term-select text-term-fg-strong' : 'text-term-fg'
    }`;
    return onSelectBookmark ? (
      <button type="button" onClick={onSelectBookmark} className={cls} aria-label={bookmarkCount ? `保存した事例 (${bookmarkCount}件)` : '保存した事例'}>
        {label}
      </button>
    ) : (
      <Link href={SAVED_HREF} prefetch={false} className={cls} aria-label={bookmarkCount ? `保存した事例 (${bookmarkCount}件)` : '保存した事例'}>
        {label}
      </Link>
    );
  };

  const proClass = 'flex h-full items-center px-3 text-[13px] font-semibold text-term-accent hover:bg-term-head';

  return (
    <>
      <header className="sticky top-0 z-40 flex w-full shrink-0 flex-wrap items-stretch border-b border-term-line bg-term-panel lg:h-9 lg:flex-nowrap">
        {/* ロゴ */}
        <MobileMenu activeSection={activeSection} onOpenPro={onOpenPro} onSelectLocalMode={onSelectLocalMode} />
        <div className="flex h-11 shrink-0 items-center pl-1 lg:h-full lg:border-r lg:border-term-line lg:pl-3 lg:pr-3 xl:pr-4">
          <span className="truncate text-base font-semibold text-term-fg-strong lg:hidden">{SECTION_TITLES[activeSection]}</span>
          <Link href="/" prefetch={false} aria-label="Make Money" className="hidden h-full items-center whitespace-nowrap font-mono text-[13px] font-bold text-term-accent lg:inline-flex">
            MAKE MONEY
          </Link>
        </div>

        {/* スマホ: PRO は右上 */}
        <div className="ml-auto flex h-11 items-stretch lg:hidden">
          {rightContent}
          {!onSearchChange && !pageHasSearch && (
            <button type="button" aria-label="事例を検索" aria-expanded={searchOpen} onClick={() => { setSearchOpen((open) => !open); requestAnimationFrame(() => searchRef.current?.focus()); }} className="flex w-11 items-center justify-center text-term-fg hover:bg-term-head">
              <Search aria-hidden="true" size={20} />
            </button>
          )}
          {onOpenPro ? (
            <button type="button" onClick={onOpenPro} className="flex min-w-11 items-center px-3 text-sm font-semibold text-term-accent">
              PRO
            </button>
          ) : (
            <Link href={PRO_HREF} prefetch={false} className="flex min-w-11 items-center px-3 text-sm font-semibold text-term-accent">
              PRO
            </Link>
          )}
        </div>

        {/* コマンド検索: PCではバー内、スマホでは2段目 */}
        <form
          role="search"
          onSubmit={submitSearch}
          className={`order-last ${pageHasSearch && !onSearchChange ? 'hidden' : onSearchChange || searchOpen ? 'flex' : 'hidden lg:flex'} h-[45px] w-full items-center gap-2 border-t border-term-line px-3 lg:order-none lg:h-full lg:w-[240px] lg:shrink-0 lg:border-t-0 lg:border-r lg:px-2.5 xl:w-[280px]`}
        >
          <span aria-hidden="true" className="font-mono text-sm text-term-accent">&gt;</span>
          <input
            ref={searchRef}
            type="text"
            value={onSearchChange ? searchValue ?? '' : searchText}
            onChange={(event) => (onSearchChange ? onSearchChange(event.target.value) : setSearchText(event.target.value))}
            aria-label="事例を検索"
            placeholder="事例を検索"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-term-fg outline-none placeholder:text-term-dim lg:text-[13px]"
          />
        </form>

        {/* PC: ファンクションタブ */}
        <nav aria-label="主要ナビゲーション" className="hidden h-full min-w-0 items-stretch lg:flex">
          {/* 幅が足りない画面では、タブだけ横にスクロールする（「その他」のメニューは切れないよう外に置く） */}
          <div className="flex h-full min-w-0 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PRIMARY_NAV_ITEMS.map((item, index) => {
              const isActive = activeSection === item.id;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  onClick={(event) => handleLocalNavigation(event, item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-keyshortcuts={String(index + 1)}
                  title={`${item.label}（${index + 1}キー）`}
                  className={tabClass(isActive)}
                >
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
          <details ref={moreRef} className="relative h-full shrink-0">
            <summary
              className={`${tabClass(secondaryActive)} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
            >
              その他
            </summary>
            <div className="absolute left-0 top-full z-50 w-48 border border-term-line bg-term-panel shadow-lg">
              {SECONDARY_NAV_ITEMS.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  prefetch={false}
                  onClick={(event) => handleLocalNavigation(event, item.id)}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                  className={`flex h-8 items-center border-b border-term-line-soft px-3 text-[13px] last:border-b-0 hover:bg-term-head ${
                    activeSection === item.id ? 'bg-term-select text-term-fg-strong' : 'text-term-fg'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex flex-col border-t border-term-line py-1">
                {LEGAL_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} prefetch={false} className="flex h-7 items-center px-3 text-xs text-term-label hover:bg-term-head hover:text-term-fg-strong">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </details>
        </nav>

        {/* PC: 右端 */}
        <div className="ml-auto hidden h-full shrink-0 items-stretch whitespace-nowrap lg:flex">
          {rightContent !== undefined && <div className="flex items-center px-2">{rightContent}</div>}
          {bookmarkSyncStatus && SYNC_LABEL[bookmarkSyncStatus] && (
            <span
              aria-live="polite"
              className={`flex items-center px-2 text-xs ${
                bookmarkSyncStatus === 'error' ? 'text-term-danger' : 'text-term-label'
              }`}
            >
              {SYNC_LABEL[bookmarkSyncStatus] ?? ''}
            </span>
          )}
          {renderBookmark()}
          {onOpenPro ? (
            <button type="button" onClick={onOpenPro} className={proClass} title="PRO の内容を確認">
              PRO
            </button>
          ) : (
            <Link href={PRO_HREF} prefetch={false} className={proClass} title="PRO の内容を確認">
              PRO
            </Link>
          )}
        </div>
      </header>

      <MobileBottomNav
        activeSection={activeSection}
        bookmarkCount={bookmarkCount}
        onSelectLocalMode={onSelectLocalMode}
      />
    </>
  );
};
