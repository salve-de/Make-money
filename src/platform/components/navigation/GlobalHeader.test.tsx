import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHeader } from './GlobalHeader';
import { TAB_SECTION_IDS } from './MobileMenu';
import { MOBILE_MENU_GROUPS } from './navigationItems';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: () => {} }) }));
vi.mock('next/link', () => ({ default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => { void _prefetch; return <a {...props}>{children}</a>; } }));

describe('GlobalHeader terminal navigation', () => {
  it('renders every workspace route as a numbered tab and never links /registry', () => {
    const html = renderToStaticMarkup(<GlobalHeader onSelectLocalMode={() => {}} />);
    const nav = html.slice(html.indexOf('aria-label="主要ナビゲーション"'), html.indexOf('</nav>'));
    for (const href of ['/', '/discover', '/radar', '/?mode=ARCHETYPES', '/playbook', '/?mode=SYNTHESIS', '/marketplace', '/execute']) {
      expect(nav).toContain(`href="${href}"`);
    }
    expect(nav).toContain('手口と道具');
    expect(html).not.toContain('/registry');
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
    for (const label of ['事例', '発見', '市場', '事業検討']) expect(bottom).toContain(label);
    expect(bottom).not.toContain('その他');
    expect(html).toContain('aria-label="メニューを開く"');
  });

  it('groups the drawer by task and never repeats a screen that is already a bottom tab', () => {
    const html = renderToStaticMarkup(<GlobalHeader />);
    expect(html).not.toContain('MAKE MONEY</h2>');
    const items = MOBILE_MENU_GROUPS.flatMap((group) => group.items);
    expect(MOBILE_MENU_GROUPS.map((group) => group.label)).toEqual(['調べる', '自分の記録', '売り買い']);
    expect(items.map((item) => item.href)).toContain('/marketplace/businesses');
    for (const item of items) expect(TAB_SECTION_IDS).not.toContain(item.id);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  });
});
