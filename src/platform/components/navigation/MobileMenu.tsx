'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { ChevronRight, Menu, X } from 'lucide-react';
import {
  GlobalNavSection,
  LEGAL_LINKS,
  LOCAL_MODE_BY_SECTION,
  LocalWorkspaceMode,
  type MenuItem,
} from './navigationItems';
import { useMenuItems } from './useMenuItems';
import { DrawerUserMenu } from '@/components/auth/UserMenu';

interface MobileMenuProps {
  activeSection: GlobalNavSection;
  onOpenPro?: () => void;
  onSelectLocalMode?: (mode: LocalWorkspaceMode) => void;
  bookmarkCount?: number;
}

/**
 * スマホ用の左からの引き出しメニュー（ハンバーガー）。下のタブ（5つ）に入らない補助機能を、PC の「その他」と同じ項目・同じ並びで出す。
 * 項目が多くても全体がスクロールし、規約・表記は一番下にまとめる。開閉・フォーカス・Esc・背面のスクロール固定は Radix Dialog が担う。
 */
export const MobileMenu: React.FC<MobileMenuProps> = ({ activeSection, onOpenPro, onSelectLocalMode, bookmarkCount }) => {
  const [open, setOpen] = useState(false);
  const items = useMenuItems(bookmarkCount);

  const handleLocal = (event: React.MouseEvent<HTMLAnchorElement>, item: MenuItem) => {
    setOpen(false);
    const mode = item.key === 'SAVED' && item.section ? LOCAL_MODE_BY_SECTION[item.section] : undefined;
    if (!mode || !onSelectLocalMode) return;
    event.preventDefault();
    onSelectLocalMode(mode);
  };

  const rowClass = (active: boolean, accent: boolean) =>
    `flex min-h-[52px] w-full items-center gap-3 px-4 text-left text-base hover:bg-term-head ${
      active ? 'bg-term-select text-term-fg-strong' : accent ? 'text-term-accent' : 'text-term-fg'
    }`;

  const rowBody = (item: MenuItem, active: boolean) => {
    const Icon = item.icon;
    const accent = item.key === 'PRO';
    return (
      <>
        <Icon aria-hidden="true" size={20} strokeWidth={1.8} className={`shrink-0 ${active || accent ? 'text-term-accent' : 'text-term-muted'}`} />
        <span className="min-w-0 flex-1">{item.label}</span>
        {item.badge && <span className="term-num shrink-0 text-sm text-term-accent">{item.badge}</span>}
        <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-term-label" />
      </>
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" aria-label="メニューを開く" className="flex h-11 w-11 items-center justify-center text-term-fg hover:bg-term-head lg:hidden">
          <Menu aria-hidden="true" size={22} />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col border-r border-term-line bg-term-panel pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-term-line pl-4">
            <Dialog.Title className="font-mono text-[13px] font-bold text-term-accent">MAKE MONEY</Dialog.Title>
            <Dialog.Close aria-label="メニューを閉じる" className="flex h-11 w-11 items-center justify-center text-term-muted hover:bg-term-head">
              <X aria-hidden="true" size={20} />
            </Dialog.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
            <DrawerUserMenu onNavigate={() => setOpen(false)} />
            <nav aria-label="そのほかの画面">
              <ul>
                {items.map((item) => {
                  const active = item.section !== undefined && activeSection === item.section && item.key !== 'PRO';
                  return (
                    <li key={item.key} className="border-b border-term-line-soft">
                      {item.key === 'PRO' && onOpenPro ? (
                        <button type="button" onClick={() => { setOpen(false); onOpenPro(); }} className={rowClass(false, true)}>
                          {rowBody(item, false)}
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          prefetch={false}
                          onClick={(event) => handleLocal(event, item)}
                          aria-current={active ? 'page' : undefined}
                          className={rowClass(active, item.key === 'PRO')}
                        >
                          {rowBody(item, active)}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </nav>
            <ul className="mt-auto border-t border-term-line px-4 py-1">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch={false} onClick={() => setOpen(false)} className="flex min-h-11 items-center text-xs text-term-label hover:text-term-fg-strong">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
