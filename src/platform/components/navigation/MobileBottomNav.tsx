'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Lightbulb, List, TrendingUp, type LucideIcon } from 'lucide-react';
import {
  GlobalNavSection,
  LOCAL_MODE_BY_SECTION,
  LocalWorkspaceMode,
  SAVED_HREF,
} from './navigationItems';

interface MobileBottomNavProps {
  activeSection: GlobalNavSection;
  bookmarkCount?: number;
  onSelectLocalMode?: (mode: LocalWorkspaceMode) => void;
}

/** 下のタブは主要な4画面だけ（Apple・Material とも3〜5個）。ほかはヘッダー左のメニューに置く */
const TABS: { id: GlobalNavSection; label: string; href: string; Icon: LucideIcon }[] = [
  { id: 'LEDGER', label: '事例一覧', href: '/', Icon: List },
  { id: 'DISCOVER', label: 'ランキング', href: '/discover', Icon: Compass },
  { id: 'RADAR', label: '市場動向', href: '/radar', Icon: TrendingUp },
  { id: 'SYNTHESIS', label: 'アイデア調査', href: SAVED_HREF, Icon: Lightbulb },
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ activeSection, bookmarkCount, onSelectLocalMode }) => {
  const handleLocal = (event: React.MouseEvent<HTMLAnchorElement>, id: GlobalNavSection) => {
    const mode = LOCAL_MODE_BY_SECTION[id];
    if (!mode || !onSelectLocalMode) return;
    event.preventDefault();
    onSelectLocalMode(mode);
  };

  return (
    <nav
      aria-label="メインメニュー"
      className="term-bottom-nav fixed inset-x-0 bottom-0 z-40 flex h-[calc(56px+env(safe-area-inset-bottom))] items-stretch border-t border-term-line bg-term-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {TABS.map(({ id, label, href, Icon }) => {
        const active = activeSection === id;
        return (
          <Link
            key={id}
            href={href}
            prefetch={false}
            onClick={(event) => handleLocal(event, id)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-xs ${
              active ? 'text-term-accent' : 'text-term-muted hover:bg-term-head'
            }`}
          >
            <Icon aria-hidden="true" size={22} strokeWidth={active ? 2.4 : 1.8} />
            <span>{label}</span>
            {id === 'SYNTHESIS' && typeof bookmarkCount === 'number' && bookmarkCount > 0 && (
              <span className="term-num absolute right-[calc(50%-1.6rem)] top-1.5 min-w-4 bg-term-accent px-1 text-center text-xs leading-4 text-term-panel">
                {bookmarkCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
};
