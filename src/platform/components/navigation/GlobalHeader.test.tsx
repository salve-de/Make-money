import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHeader } from './GlobalHeader';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/link', () => ({ default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => { void _prefetch; return <a {...props}>{children}</a>; } }));

describe('GlobalHeader responsive workspace navigation', () => {
  it('keeps all workspace routes in the tablet menu while avoiding duplicate phone controls', () => {
    const html = renderToStaticMarkup(<GlobalHeader hideMobilePrimaryNav onSelectLocalMode={() => {}} />);
    const menu = html.slice(html.indexOf('aria-label="メニュー"'));
    for (const href of ['/', '/playbook', '/radar', '/?mode=ARCHETYPES', '/?mode=SYNTHESIS']) {
      expect(menu).toContain(`href="${href}"`);
    }
    expect((menu.match(/class="hidden md:flex min-h-11/g) || []).length).toBe(5);
    expect(menu).toMatch(/href="\/discover"[^>]*class="flex min-h-11/);
    expect(menu).toMatch(/href="\/execute"[^>]*class="flex min-h-11/);
  });
});
