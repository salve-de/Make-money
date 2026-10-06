import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({ default: ({ children, prefetch: _prefetch, ...props }: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean }>) => { void _prefetch; return <a {...props}>{children}</a>; } }));
vi.mock('@/platform/components/navigation/GlobalHeader', () => ({ GlobalHeader: () => <header data-testid="header" /> }));
const operator = vi.hoisted(() => ({ email: null as string | null }));
vi.mock('@/lib/legal/operator', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/legal/operator')>()),
  readOperatorInfo: async () => ({ name: null, representative: null, address: null, phone: null, email: operator.email }),
}));
vi.mock('@/lib/payments/founding-pass', () => ({ FOUNDING_PASS: { priceJpy: 9800 } }));

import { ConsentNotice } from './ConsentNotice';
import { LegalLinks } from './LegalLinks';
import { LegalPage } from './LegalPage';
import ContactPage from '@/app/legal/contact/page';
import PrivacyPage from '@/app/legal/privacy/page';
import TermsPage from '@/app/legal/terms/page';
import TokushohoPage from '@/app/legal/tokushoho/page';

beforeEach(() => {
  operator.email = null;
});

describe('LegalPage', () => {
  it('既定でドラフト表示を出し、draft={false} で消える', () => {
    expect(renderToStaticMarkup(<LegalPage title="t" updatedAt="2026-10-06">x</LegalPage>)).toContain('ドラフト（要法務確認）');
    expect(renderToStaticMarkup(<LegalPage title="t" updatedAt="2026-10-06" draft={false}>x</LegalPage>)).not.toContain('ドラフト（要法務確認）');
  });
});

describe('ConsentNotice', () => {
  it('サーバー描画では何も出さない（保存状態を読んだあとにだけ表示する）', () => {
    expect(renderToStaticMarkup(<ConsentNotice />)).toBe('');
  });
});

describe('LegalLinks', () => {
  it('4つのページへのリンクと、同意設定のボタンを出す', () => {
    const html = renderToStaticMarkup(<LegalLinks />);
    for (const href of ['/legal/terms', '/legal/privacy', '/legal/tokushoho', '/legal/contact']) expect(html).toContain(`href="${href}"`);
    expect(html).toContain('同意設定');
    expect(html).toContain('type="button"');
  });
});

describe('legal pages', () => {
  it('問い合わせ: メール未設定なら運用者向けの文を出し、設定済みならメールを出す', async () => {
    expect(renderToStaticMarkup(await ContactPage())).toContain('LEGAL_EMAIL');
    expect(renderToStaticMarkup(await ContactPage())).not.toContain('準備中');
    operator.email = 'owner@example.com';
    const html = renderToStaticMarkup(await ContactPage());
    expect(html).toContain('mailto:owner@example.com');
    expect(html).toContain('【削除依頼】');
    expect(html).not.toContain('<form');
  });

  it('プライバシー: 実際に使っている保存キーと外部送信先を載せる', () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    for (const key of ['makemoney.bookmarks.v1', 'make_money_analyst_notes_v1', 'make-money:compare:v1', 'mm_viewed_entity_history_v1', 'mm_builder_preview', 'makemoney.consent.v1']) expect(html).toContain(key);
    for (const vendor of ['Cloudflare', 'Google', 'Stripe', 'Resend', 'Vercel', 'Firebase']) expect(html).toContain(vendor);
    expect(html).toContain('第28条');
    expect(html).toContain('同意した場合だけ');
  });

  it('規約: 削除依頼窓口・未成年・反社・変更の通知を載せる', () => {
    const html = renderToStaticMarkup(<TermsPage />);
    for (const word of ['/legal/contact', '18歳未満', '反社会的勢力', '14日前', 'AIのまとめ']) expect(html).toContain(word);
  });

  it('特商法: 必須項目が揃う', async () => {
    const html = renderToStaticMarkup(await TokushohoPage());
    for (const word of ['販売事業者', '運営統括責任者', '所在地', '電話番号', 'メールアドレス', '販売価格', '商品代金以外の必要料金', '支払方法', '支払時期', '提供時期', '返品・キャンセル', '申込みの有効期限', '解約の方法・期限']) expect(html).toContain(word);
  });
});
