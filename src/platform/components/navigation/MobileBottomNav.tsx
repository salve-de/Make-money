'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  GlobalNavSection,
  LOCAL_MODE_BY_SECTION,
  LocalWorkspaceMode,
  PRIMARY_NAV_ITEMS,
  PRO_HREF,
  SAVED_HREF,
  SECONDARY_NAV_ITEMS,
  LEGAL_LINKS,
} from './navigationItems';

interface MobileBottomNavProps {
  activeSection: GlobalNavSection;
  bookmarkCount?: number;
  onOpenPro?: () => void;
  onSelectLocalMode?: (mode: LocalWorkspaceMode) => void;
}

const MAIN_CELLS: { id: GlobalNavSection; label: string; href: string }[] = [
  { id: 'LEDGER', label: '事例', href: '/' },
  { id: 'RADAR', label: '市場', href: '/radar' },
  { id: 'ARCHETYPES', label: 'パターン', href: '/?mode=ARCHETYPES' },
  { id: 'SYNTHESIS', label: '保存', href: SAVED_HREF },
];

const SHEET_ITEMS = [
  ...PRIMARY_NAV_ITEMS.filter((item) => ['DISCOVER', 'PLAYBOOK', 'SYNTHESIS'].includes(item.id)),
  ...SECONDARY_NAV_ITEMS,
];

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  bookmarkCount,
  onOpenPro,
  onSelectLocalMode,
}) => {
  const [sheetOpen, setSheetOpen] = useState(false);
  const mainIds = MAIN_CELLS.map((cell) => cell.id);
  const isOtherActive = !mainIds.includes(activeSection);

  const handleLocal = (event: React.MouseEvent<HTMLAnchorElement>, id: GlobalNavSection) => {
    setSheetOpen(false);
    const mode = LOCAL_MODE_BY_SECTION[id];
    if (!mode || !onSelectLocalMode) return;
    event.preventDefault();
    onSelectLocalMode(mode);
  };

  const cellBase =
    'relative flex h-full min-w-0 flex-1 items-center justify-center gap-1 border-r border-term-line px-1 text-sm last:border-r-0';
  const cellState = (active: boolean) =>
    active
      ? 'bg-[var(--surface-overlay)] text-term-fg-strong shadow-[inset_0_2px_0_var(--term-accent)]'
      : 'text-term-muted hover:bg-term-head';

  return (
    <>
      {sheetOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSheetOpen(false)}>
          <div
            role="dialog"
            aria-label="その他のメニュー"
            onClick={(event) => event.stopPropagation()}
            className="absolute inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] border-t border-term-line bg-term-panel shadow-lg"
          >
            <div className="term-panel-title"><span className="term-panel-name">その他</span></div>
            <ul>
              {SHEET_ITEMS.map((item) => (
                <li key={item.id} className="border-b border-term-line-soft">
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={(event) => handleLocal(event, item.id)}
                    aria-current={activeSection === item.id ? 'page' : undefined}
                    className={`flex min-h-11 items-center px-3 text-sm hover:bg-term-head ${
                      activeSection === item.id ? 'bg-term-select text-term-fg-strong' : 'text-term-fg'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                {onOpenPro ? (
                  <button
                    type="button"
                    onClick={() => { setSheetOpen(false); onOpenPro(); }}
                    className="flex min-h-11 w-full items-center px-3 text-left text-sm font-semibold text-term-accent hover:bg-term-head"
                  >
                    PRO
                  </button>
                ) : (
                  <Link
                    href={PRO_HREF}
                    prefetch={false}
                    onClick={() => setSheetOpen(false)}
                    className="flex min-h-11 items-center px-3 text-sm font-semibold text-term-accent hover:bg-term-head"
                  >
                    PRO
                  </Link>
                )}
              </li>
              <li className="flex flex-wrap gap-x-4 border-t border-term-line px-3">
                {LEGAL_LINKS.map((link) => (
                  <Link key={link.href} href={link.href} prefetch={false} onClick={() => setSheetOpen(false)} className="inline-flex min-h-11 items-center text-xs text-term-label hover:text-term-fg-strong">
                    {link.label}
                  </Link>
                ))}
              </li>
            </ul>
          </div>
        </div>
      )}
      <nav
        aria-label="メインメニュー"
        className="term-bottom-nav fixed inset-x-0 bottom-0 z-40 flex h-[calc(56px+env(safe-area-inset-bottom))] items-stretch border-t border-term-line bg-term-panel pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {MAIN_CELLS.map((cell) => (
          <Link
            key={cell.id}
            href={cell.href}
            prefetch={false}
            onClick={(event) => handleLocal(event, cell.id)}
            aria-current={activeSection === cell.id ? 'page' : undefined}
            className={`${cellBase} ${cellState(activeSection === cell.id)}`}
          >
            <span>{cell.label}</span>
            {cell.id === 'SYNTHESIS' && typeof bookmarkCount === 'number' && bookmarkCount > 0 && (
              <span className="term-num text-xs text-term-accent">{bookmarkCount}</span>
            )}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setSheetOpen((open) => !open)}
          aria-expanded={sheetOpen}
          className={`${cellBase} ${cellState(isOtherActive || sheetOpen)}`}
        >
          その他
        </button>
      </nav>
    </>
  );
};
