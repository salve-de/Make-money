import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  value: { user: null, token: null, loading: false, signInWithGoogle: async () => {} } as {
    user: { uid: string; email: string | null } | null;
    token: string | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
  },
}));
vi.mock('@/context/AuthContext', () => ({ useAuth: () => auth.value }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => {}, push: () => {} }) }));
vi.mock('@/platform/components/navigation/GlobalHeader', () => ({
  GlobalHeader: () => <header data-testid="global-header" />,
}));
vi.mock('next/link', () => ({
  default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => {
    void _prefetch;
    return <a {...props}>{children}</a>;
  },
}));

import { BUSINESS_SALE_NOTICE } from '@/shared/business-sale';
import { BusinessSaleEditor } from './BusinessSaleEditor';
import { MyBusinessSales } from './MyBusinessSales';
import { expectTerminalStyle, visibleText } from './testing';

const signedOut = { user: null, token: null, loading: false, signInWithGoogle: async () => {} };
const signedIn = { user: { uid: 'seller-1', email: 'seller@example.com' }, token: 'token', loading: false, signInWithGoogle: async () => {} };
const loading = { user: null, token: null, loading: true, signInWithGoogle: async () => {} };

describe('BusinessSaleEditor', () => {
  it('asks a visitor to log in before showing the form', () => {
    auth.value = signedOut;
    const html = renderToStaticMarkup(<BusinessSaleEditor listingId="" />);
    const text = visibleText(html);
    expect(text).toContain('ログインすると事業を掲載できます');
    expect(text).toContain('Googleでログイン');
    expect(html).not.toContain('<textarea');
    expect(html).toContain(BUSINESS_SALE_NOTICE);
  });

  it('waits while the login state is unknown', () => {
    auth.value = loading;
    const html = renderToStaticMarkup(<BusinessSaleEditor listingId="" />);
    expect(visibleText(html)).toContain('掲載を読み込み中');
    expect(html).not.toContain('ログインすると事業を掲載できます');
  });

  it('shows an empty form for a new listing when logged in', () => {
    auth.value = signedIn;
    const html = renderToStaticMarkup(<BusinessSaleEditor listingId="" />);
    expect(visibleText(html)).toContain('事業を掲載');
    expect(html).toContain('公開する</button>');
    expect(html).toContain('下書きを保存</button>');
    expectTerminalStyle(html);
  });

  it('loads an existing listing before showing the edit form', () => {
    auth.value = signedIn;
    const html = renderToStaticMarkup(<BusinessSaleEditor listingId="3f2b1c9e-0000-4000-8000-000000000001" />);
    expect(visibleText(html)).toContain('掲載を読み込み中');
    expect(html).not.toContain('<textarea');
  });

  it('ends the page with the notice', () => {
    auth.value = signedIn;
    const html = renderToStaticMarkup(<BusinessSaleEditor listingId="" />);
    expect(html.slice(html.indexOf('<footer'))).toContain(BUSINESS_SALE_NOTICE);
  });
});

describe('MyBusinessSales', () => {
  it('asks a visitor to log in', () => {
    auth.value = signedOut;
    const html = renderToStaticMarkup(<MyBusinessSales />);
    expect(visibleText(html)).toContain('ログインすると、自分の掲載と問い合わせを見られます');
    expect(visibleText(html)).toContain('Googleでログイン');
    expect(html).toContain(BUSINESS_SALE_NOTICE);
  });

  it('shows a loading line until the listings arrive', () => {
    auth.value = signedIn;
    const html = renderToStaticMarkup(<MyBusinessSales />);
    expect(visibleText(html)).toContain('自分の掲載を読み込み中');
    expect(html).not.toContain('まだ掲載がありません');
    expect(html.slice(html.indexOf('<footer'))).toContain(BUSINESS_SALE_NOTICE);
  });

  it('waits while the login state is unknown', () => {
    auth.value = loading;
    const html = renderToStaticMarkup(<MyBusinessSales />);
    expect(visibleText(html)).toContain('自分の掲載を読み込み中');
    expect(html).not.toContain('ログインすると、自分の掲載と問い合わせを見られます');
    expectTerminalStyle(html);
  });
});
