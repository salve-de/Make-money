'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { BookmarkSyncStatus } from '../../hooks/useEntityFilter';
import { MobileBottomNav } from './MobileBottomNav';
import {
  GlobalNavSection,
  LOCAL_MODE_BY_SECTION,
  LocalWorkspaceMode,
  PRIMARY_NAV_ITEMS,
  PRO_HREF,
  SAVED_HREF,
  SECONDARY_NAV_ITEMS,
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
}

const SYNC_LABEL: Record<BookmarkSyncStatus, string> = {
  error: '保存失敗',
  saving: '保存中',
  loading: '確認中',
  synced: '同期済',
  // この端末だけに保存している通常状態は表示しない
  local: '',
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function formatJstClock(now: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('month')}/${get('day')} ${hour}:${get('minute')} JST`;
}

const JstClock: React.FC = () => {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const now = new Date();
      setLabel(formatJstClock(now));
      timer = setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()));
    };
    tick();
    return () => clearTimeout(timer);
  }, []);
  return (
    <span className="term-num min-w-[8.5rem] text-right text-xs text-term-muted" suppressHydrationWarning>
      {label ?? ''}
    </span>
  );
};

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
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState('');
  const moreRef = useRef<HTMLDetailsElement>(null);

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
    `flex h-full items-center gap-1.5 border-r border-term-line px-3 text-[13px] whitespace-nowrap ${
      active
        ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_-2px_0_var(--term-accent)]'
        : 'text-term-muted hover:bg-term-head hover:text-term-fg'
    }`;

  const secondaryActive = SECONDARY_NAV_ITEMS.some((item) => item.id === activeSection);

  const renderBookmark = () => {
    const label = (
      <>
        <span>保存</span>
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
        <div className="flex h-10 items-center pl-3 lg:h-full lg:border-r lg:border-term-line lg:pr-4">
          <Link href="/" prefetch={false} aria-label="Make Money" className="inline-flex min-h-11 items-center font-mono text-[13px] font-bold text-term-accent lg:min-h-0">
            MAKE MONEY
          </Link>
        </div>

        {/* スマホ: PRO は右上 */}
        <div className="ml-auto flex h-10 items-stretch lg:hidden">
          {rightContent}
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
          className="order-last flex h-11 w-full items-center gap-2 border-t border-term-line px-3 lg:order-none lg:h-full lg:w-[280px] lg:shrink-0 lg:border-t-0 lg:border-r lg:px-2.5"
        >
          <span aria-hidden="true" className="font-mono text-sm text-term-accent">&gt;</span>
          <input
            ref={searchRef}
            type="text"
            value={onSearchChange ? searchValue ?? '' : searchText}
            onChange={(event) => (onSearchChange ? onSearchChange(event.target.value) : setSearchText(event.target.value))}
            aria-label="事例を検索"
            placeholder="会社名・事業を検索"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-term-fg outline-none placeholder:text-term-dim lg:text-[13px]"
          />
          <button
            type="submit"
            aria-label="検索を実行"
            className="hidden border border-term-line px-1.5 font-mono text-xs leading-5 text-term-muted hover:bg-term-head lg:block"
          >
            GO
          </button>
        </form>

        {/* PC: ファンクションタブ */}
        <nav aria-label="主要ナビゲーション" className="hidden h-full min-w-0 items-stretch lg:flex">
          {PRIMARY_NAV_ITEMS.map((item, index) => {
            const isActive = activeSection === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                prefetch={false}
                onClick={(event) => handleLocalNavigation(event, item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={tabClass(isActive)}
              >
                <span aria-hidden="true" className="term-num text-xs text-term-label">{index + 1}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <details ref={moreRef} className="relative h-full">
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
            </div>
          </details>
        </nav>

        {/* PC: 右端 */}
        <div className="ml-auto hidden h-full items-stretch lg:flex">
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
          <div className="flex items-center border-l border-term-line px-3">
            <JstClock />
          </div>
        </div>
      </header>

      <MobileBottomNav
        activeSection={activeSection}
        bookmarkCount={bookmarkCount}
        onOpenPro={onOpenPro}
        onSelectLocalMode={onSelectLocalMode}
      />
    </>
  );
};
