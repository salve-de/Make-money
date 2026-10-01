'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import {
  BellRing,
  Columns3,
  Handshake,
  LayoutGrid,
  ListChecks,
  Menu,
  Store,
  Wrench,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  GlobalNavSection,
  LEGAL_LINKS,
  LOCAL_MODE_BY_SECTION,
  LocalWorkspaceMode,
  MOBILE_MENU_ITEMS,
} from './navigationItems';

/** 下のタブに出ている画面。メニューには重ねて出さない */
export const TAB_SECTION_IDS: GlobalNavSection[] = ['LEDGER', 'DISCOVER', 'RADAR', 'SYNTHESIS'];

/** 下のタブと同じ線アイコン（lucide）で、メニューの行も見分けやすくする */
export const MENU_ICONS: Partial<Record<GlobalNavSection, LucideIcon>> = {
  ARCHETYPES: LayoutGrid,
  PLAYBOOK: Wrench,
  COMPARE: Columns3,
  ALERTS: BellRing,
  EXECUTION: ListChecks,
  BUSINESSES: Handshake,
  MARKETPLACE: Store,
};

interface MobileMenuProps {
  activeSection: GlobalNavSection;
  onOpenPro?: () => void;
  onSelectLocalMode?: (mode: LocalWorkspaceMode) => void;
}

/** スマホ用の左からの引き出しメニュー（ハンバーガー）。開閉・フォーカス・Esc・背面のスクロール固定は Radix Dialog が担う */
/** PRO はヘッダー右上に常に出ているので、メニューには重ねて出さない */
export const MobileMenu: React.FC<MobileMenuProps> = ({ activeSection, onSelectLocalMode }) => {
  const [open, setOpen] = useState(false);

  const handleLocal = (event: React.MouseEvent<HTMLAnchorElement>, id: GlobalNavSection) => {
    setOpen(false);
    const mode = LOCAL_MODE_BY_SECTION[id];
    if (!mode || !onSelectLocalMode) return;
    event.preventDefault();
    onSelectLocalMode(mode);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button type="button" aria-label="メニューを開く" className="flex h-11 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 px-2 text-term-fg hover:bg-term-head lg:hidden">
          {/* 三本線だけでは気づかれにくいので、下に「メニュー」と書く */}
          <Menu aria-hidden="true" size={20} />
          <span aria-hidden="true" className="text-xs leading-none">メニュー</span>
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
          <nav aria-label="そのほかの画面" className="min-h-0 flex-1 overflow-y-auto">
            <ul>
              {MOBILE_MENU_ITEMS.map((item) => {
                const active = activeSection === item.id;
                const Icon = MENU_ICONS[item.id];
                return (
                  <li key={item.id} className="border-b border-term-line-soft">
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={(event) => handleLocal(event, item.id)}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-[52px] items-center gap-3 px-4 text-base hover:bg-term-head ${
                        active ? 'bg-term-select text-term-fg-strong' : 'text-term-fg'
                      }`}
                    >
                      {Icon && <Icon aria-hidden="true" size={20} strokeWidth={1.8} className={`shrink-0 ${active ? 'text-term-accent' : 'text-term-muted'}`} />}
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="shrink-0 border-t border-term-line px-4">
            <ul className="flex flex-wrap gap-x-4 py-1">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} prefetch={false} onClick={() => setOpen(false)} className="flex min-h-10 items-center text-xs text-term-label hover:text-term-fg-strong">
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
