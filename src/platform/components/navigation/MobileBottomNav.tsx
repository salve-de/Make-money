'use client';

import React from 'react';
import Link from 'next/link';
import { Hammer, Lightbulb, List, Store, TrendingUp, type LucideIcon } from 'lucide-react';
import {
  GlobalNavSection,
  LOCAL_MODE_BY_SECTION,
  LocalWorkspaceMode,
  PRIMARY_NAV_ITEMS,
  tabOfSection,
} from './navigationItems';

interface MobileBottomNavProps {
  activeSection: GlobalNavSection;
  bookmarkCount?: number;
  onSelectLocalMode?: (mode: LocalWorkspaceMode) => void;
}

/** 下のタブは上のタブと同じ5つ（Apple・Material とも3〜5個）。ほかはヘッダー左のメニューに置く */
const TAB_ICONS: Partial<Record<GlobalNavSection, LucideIcon>> = {
  LEDGER: List,
  TRENDS: TrendingUp,
  SYNTHESIS: Lightbulb,
  BUILDER: Hammer,
  MARKETPLACE: Store,
};

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
      {PRIMARY_NAV_ITEMS.map(({ id, label, href }) => {
        const Icon = TAB_ICONS[id] ?? List;
        const active = tabOfSection(activeSection) === id;
        return (
          <Link
            key={id}
            href={href}
            prefetch={false}
            onClick={(event) => handleLocal(event, id)}
            aria-current={active ? 'page' : undefined}
            className={`relative flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap px-0 text-xs ${
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
