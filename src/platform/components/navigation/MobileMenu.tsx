'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { Menu, X } from 'lucide-react';
import {
  GlobalNavSection,
  LEGAL_LINKS,
  LOCAL_MODE_BY_SECTION,
  LocalWorkspaceMode,
  PRIMARY_NAV_ITEMS,
  PRO_HREF,
  SECONDARY_NAV_ITEMS,
} from './navigationItems';

/** 下のタブに出ている画面。メニューには重ねて出さない */
export const TAB_SECTION_IDS: GlobalNavSection[] = ['LEDGER', 'DISCOVER', 'RADAR', 'SYNTHESIS'];

const MENU_ITEMS = [
  ...PRIMARY_NAV_ITEMS.filter((item) => !TAB_SECTION_IDS.includes(item.id)),
  ...SECONDARY_NAV_ITEMS,
];

interface MobileMenuProps {
  activeSection: GlobalNavSection;
  onOpenPro?: () => void;
  onSelectLocalMode?: (mode: LocalWorkspaceMode) => void;
}

/** スマホ用の左からの引き出しメニュー（ハンバーガー）。開閉・フォーカス・Esc・背面のスクロール固定は Radix Dialog が担う */
export const MobileMenu: React.FC<MobileMenuProps> = ({ activeSection, onOpenPro, onSelectLocalMode }) => {
  const [open, setOpen] = useState(false);

  const handleLocal = (event: React.MouseEvent<HTMLAnchorElement>, id: GlobalNavSection) => {
    setOpen(false);
    const mode = LOCAL_MODE_BY_SECTION[id];
    if (!mode || !onSelectLocalMode) return;
    event.preventDefault();
    onSelectLocalMode(mode);
  };

  const itemClass = (active: boolean) =>
    `flex min-h-12 items-center px-4 text-base hover:bg-term-head ${active ? 'bg-term-select text-term-fg-strong' : 'text-term-fg'}`;

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
          className="fixed inset-y-0 left-0 z-50 flex w-[78%] max-w-xs flex-col border-r border-term-line bg-term-panel pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-term-line pl-4">
            <Dialog.Title className="font-mono text-[13px] font-bold text-term-accent">MAKE MONEY</Dialog.Title>
            <Dialog.Close aria-label="メニューを閉じる" className="flex h-11 w-11 items-center justify-center text-term-muted hover:bg-term-head">
              <X aria-hidden="true" size={20} />
            </Dialog.Close>
          </div>
          <nav aria-label="そのほかの画面" className="min-h-0 flex-1 overflow-y-auto">
            <ul>
              {MENU_ITEMS.map((item) => (
                <li key={item.id} className="border-b border-term-line-soft">
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={(event) => handleLocal(event, item.id)}
                    aria-current={activeSection === item.id ? 'page' : undefined}
                    className={itemClass(activeSection === item.id)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li className="border-b border-term-line-soft">
                {onOpenPro ? (
                  <button type="button" onClick={() => { setOpen(false); onOpenPro(); }} className={`${itemClass(false)} w-full text-left font-semibold text-term-accent`}>
                    PRO
                  </button>
                ) : (
                  <Link href={PRO_HREF} prefetch={false} onClick={() => setOpen(false)} className={`${itemClass(false)} font-semibold text-term-accent`}>
                    PRO
                  </Link>
                )}
              </li>
            </ul>
          </nav>
          <ul className="shrink-0 border-t border-term-line px-4 py-1">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} prefetch={false} onClick={() => setOpen(false)} className="flex min-h-10 items-center text-xs text-term-label hover:text-term-fg-strong">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
