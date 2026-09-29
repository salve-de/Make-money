import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHeader } from './GlobalHeader';

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
    for (const label of ['事例', '市場', 'パターン', 'その他']) expect(html).toContain(label);
  });
});
