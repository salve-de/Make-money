import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHeader } from './GlobalHeader';
import { MENU_ICONS, TAB_SECTION_IDS } from './MobileMenu';
import { MOBILE_MENU_ITEMS } from './navigationItems';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: () => {} }) }));
vi.mock('next/link', () => ({ default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => { void _prefetch; return <a {...props}>{children}</a>; } }));

describe('GlobalHeader terminal navigation', () => {
  it('renders every workspace route as a numbered tab and never links /registry', () => {
    const html = renderToStaticMarkup(<GlobalHeader onSelectLocalMode={() => {}} />);
    const nav = html.slice(html.indexOf('aria-label="主要ナビゲーション"'), html.indexOf('</nav>'));
    for (const href of ['/', '/discover', '/?mode=SYNTHESIS', '/marketplace', '/execute']) {
      expect(nav).toContain(`href="${href}"`);
    }
    for (const removed of ['/radar', '/playbook', 'mode=ARCHETYPES', '/registry']) expect(html).not.toContain(removed);
  });

  it('always renders 保存 and PRO as links when no handlers are supplied', () => {
    const html = renderToStaticMarkup(<GlobalHeader />);
    expect(html).toContain('href="/?pro=1"');
    expect(html).toContain('保存');
  });

  it('renders the global bottom menu for phones', () => {
    const html = renderToStaticMarkup(<GlobalHeader />);
    expect(html).toContain('term-bottom-nav');
    expect(html).toContain('lg:hidden');
    const bottom = html.slice(html.indexOf('term-bottom-nav'));
    for (const label of ['事例', '発見', '事業検討']) expect(bottom).toContain(label);
    expect(bottom).not.toContain('その他');
    expect(html).toContain('aria-label="メニューを開く"');
  });

  it('lists the drawer screens once and never repeats a screen that is already a bottom tab', () => {
    const html = renderToStaticMarkup(<GlobalHeader />);
    expect(html).not.toContain('MAKE MONEY</h2>');
    const items = MOBILE_MENU_ITEMS;
    expect(items.map((item) => item.href)).toContain('/marketplace/businesses');
    for (const item of items) expect(TAB_SECTION_IDS).not.toContain(item.id);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  });

  it('gives every drawer row an icon, so rows never mix icon and text-only styles', () => {
    for (const item of MOBILE_MENU_ITEMS) expect(MENU_ICONS[item.id]).toBeDefined();
  });
});
