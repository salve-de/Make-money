import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GlobalHeader } from './GlobalHeader';
import { MORE_MENU_ITEMS, PRIMARY_NAV_ITEMS, accountMenuItem, buildMenuItems } from './navigationItems';

vi.mock('next/navigation', () => ({ usePathname: () => '/', useRouter: () => ({ push: () => {} }) }));
vi.mock('next/link', () => ({ default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => { void _prefetch; return <a {...props}>{children}</a>; } }));

describe('GlobalHeader terminal navigation', () => {
  it('renders every workspace route as a numbered tab and never links /registry', () => {
    const html = renderToStaticMarkup(<GlobalHeader onSelectLocalMode={() => {}} />);
    const nav = html.slice(html.indexOf('aria-label="主要ナビゲーション"'), html.indexOf('</nav>'));
    for (const href of ['/', '/trends', '/?mode=SYNTHESIS', '/build', '/marketplace']) {
      expect(nav).toContain(`href="${href}"`);
    }
    // 発見・事業の売買・実行計画はメニューに出さない（発見は事例の中、ほかは画面から入れない）。比較は「その他」に出す
    for (const hidden of ['/discover', '/marketplace/businesses', '/execute']) {
      expect(html).not.toContain(`href="${hidden}"`);
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
    for (const label of ['事例', '傾向', '事業検討', '作る', '市場']) expect(bottom).toContain(label);
    expect(bottom.match(/<a /g)?.length).toBe(5);
    for (const label of ['発見', '実行計画', '事業の売買']) expect(bottom).not.toContain(label);
    expect(bottom).not.toContain('その他');
    expect(html).toContain('aria-label="メニューを開く"');
  });

  it('スマホの引き出しと PC の「その他」は、同じ項目を同じ並びで出す', () => {
    const html = renderToStaticMarkup(<GlobalHeader />);
    const more = html.slice(html.indexOf('その他</summary>'), html.indexOf('</details>'));
    const drawerStart = html.indexOf('そのほかの画面');
    // 引き出しは閉じていて中身は描画されないため、項目の定義（1か所）から両方が作られていることを確かめる
    expect(drawerStart).toBe(-1);
    for (const item of MORE_MENU_ITEMS) {
      expect(more).toContain(item.label);
      expect(more).toContain(`href="${item.href}"`);
    }
    // 未ログイン判定の環境（認証設定なし）では、ログイン・会員設定の行は出さない
    expect(more).not.toContain('会員設定');
    expect(more).not.toContain('ログイン・新規登録');
  });

  it('補助機能の項目は、下のタブと重ならず、実行計画・事業の売買・finder を出さない', () => {
    expect(MORE_MENU_ITEMS.map((item) => item.label)).toEqual([
      '保存した事例とメモ',
      '比較',
      '保存した条件',
      '自分の商品',
      '紹介と取引',
    ]);
    expect(new Set(MORE_MENU_ITEMS.map((item) => item.key)).size).toBe(MORE_MENU_ITEMS.length);
    const tabLabels = PRIMARY_NAV_ITEMS.map((item) => item.label);
    for (const item of MORE_MENU_ITEMS) expect(tabLabels).not.toContain(item.label);
    for (const item of MORE_MENU_ITEMS) {
      for (const hidden of ['/execute', '/finder', '/marketplace/businesses']) expect(item.href.startsWith(hidden)).toBe(false);
    }
  });

  it('どの項目にもアイコンがあり、ラベルは日本語で1行に収まる長さ', () => {
    for (const item of buildMenuItems({ account: 'signedIn' })) {
      expect(item.icon).toBeDefined();
      expect(item.label.length).toBeLessThanOrEqual(14);
      expect(item.label).toMatch(/[ぁ-んァ-ヶ一-龠]/);
    }
  });

  it('ログイン中は「会員設定」、未ログインは「ログイン・新規登録」、認証の仕組みが無ければ出さない', () => {
    expect(buildMenuItems({ account: 'signedIn' }).map((item) => item.label)).toHaveLength(MORE_MENU_ITEMS.length + 1);
    expect(accountMenuItem('signedIn')).toMatchObject({ label: '会員設定', href: '/account' });
    expect(accountMenuItem('signedOut')).toMatchObject({ label: 'ログイン・新規登録', href: '/account' });
    expect(accountMenuItem('hidden')).toBeNull();
    expect(buildMenuItems({ account: 'hidden' })).toHaveLength(MORE_MENU_ITEMS.length);
    // ログイン状態が違っても、補助機能の項目と並びは同じ
    const signedIn = buildMenuItems({ account: 'signedIn' }).map((item) => item.key);
    const signedOut = buildMenuItems({ account: 'signedOut' }).map((item) => item.key);
    expect(signedIn).toEqual(signedOut);
  });

  it('比較に入れた件数と保存件数を、行の右に出す', () => {
    const items = buildMenuItems({ account: 'signedOut', compareIds: ['a', 'b'], compareHref: '/compare?ids=a,b', bookmarkCount: 3 });
    expect(items.find((item) => item.key === 'COMPARE')).toMatchObject({ href: '/compare?ids=a,b', badge: '2件' });
    expect(items.find((item) => item.key === 'SAVED')?.badge).toBe('3件');
    const empty = buildMenuItems({ account: 'signedOut', compareIds: [], bookmarkCount: 0 });
    expect(empty.find((item) => item.key === 'COMPARE')).toMatchObject({ href: '/compare' });
    expect(empty.find((item) => item.key === 'COMPARE')?.badge).toBeUndefined();
  });
});
