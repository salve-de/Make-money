import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/context/AuthContext', () => ({ useAuth: () => ({ user: null, token: null, loading: false }) }));
vi.mock('@/components/auth/AuthModal', () => ({ AuthModal: () => null }));

import { LISTING_ONLY, parseDistributionStatus, type DistributionStatus } from '@/shared/marketplace-distribution';
import { DistributionView, termsFromForm } from './DistributionPanel';
import { RelayReferralView } from './RelayReferralPanel';
import { copyDistributionReferralUrl } from './distribution-client';

const live = (patch: Partial<DistributionStatus>): DistributionStatus => ({ state: 'linked', mode: 'live', canLink: false, canRefer: false, referralUrl: null, ...patch });
const noop = () => {};
const referral = (status: DistributionStatus, signedIn = true) =>
  renderToStaticMarkup(createElement(RelayReferralView, { status, busy: false, message: null, signedIn, onIssue: noop, onSignIn: noop }));
const owner = (status: DistributionStatus) =>
  renderToStaticMarkup(createElement(DistributionView, { status, busy: false, message: null, title: '請求書チェッカー', summary: '説明', onConnect: noop, onReconcile: noop }));

describe('掲載ページの SellRelay 紹介欄', () => {
  it('未接続・テスト用の偽接続・連携前は何も出さない', () => {
    expect(referral(LISTING_ONLY)).toBe('');
    expect(referral({ ...live({ canRefer: true }), mode: 'contract-test' })).toBe('');
    expect(referral(live({ state: 'checking' }))).toBe('');
  });

  it('未ログインはログインを促し、許可があれば作成、作成済みならリンクを出す', () => {
    expect(referral(live({ state: 'account_required' }), false)).toContain('ログインして紹介リンクを作る');
    expect(referral(live({ canRefer: true }))).toContain('紹介リンクを作る');
    expect(referral(live({ canRefer: false }))).toContain('まだ紹介リンクを作れません');
    const html = referral(live({ canRefer: true, referralUrl: `/marketplace/go/${'a'.repeat(32)}` }));
    expect(html).toContain(`/marketplace/go/${'a'.repeat(32)}`);
    expect(html).toContain('リンクをコピー');
  });

  it('このサイトの紹介パス以外は応答として受け付けない', () => {
    expect(() => parseDistributionStatus(live({ referralUrl: 'https://evil.example.com/' }))).toThrow();
    expect(() => parseDistributionStatus({ ...live({}), mode: 'prod' })).toThrow();
  });
});

describe('掲載者の連携欄', () => {
  it('本番接続の状態ごとに、作成・照合・完了を出し分ける', () => {
    expect(owner(live({ state: 'unlinked', canLink: true }))).toContain('SellRelayに下書きを作る');
    expect(owner(live({ state: 'checking', canLink: true }))).toContain('照合をやり直す');
    expect(owner(live({ state: 'linked' }))).toContain('対応付けました');
    expect(owner(live({ state: 'account_required' }))).toContain('同じ掲載者であることの確認');
  });

  it('入力は SellRelay の範囲に収まる時だけ送る形にする（報酬率は0.01%単位）', () => {
    const base = {
      name: '請求書チェッカー', tagline: '請求書の抜けを一晩で洗い出す', description: '中小企業の経理担当が月末に請求書の抜けを確認する道具です。',
      audience: '経理担当者', category: 'business' as const, platforms: ['web' as const], price: '2980', currency: 'JPY' as const, ratePercent: '20.5', months: '12',
    };
    expect(termsFromForm(base)).toMatchObject({ price: 2980, rate: 2050, months: 12 });
    expect(termsFromForm({ ...base, currency: 'USD', price: '19.99' })).toMatchObject({ price: 1999, currency: 'USD' });
    for (const bad of [{ ratePercent: '0.5' }, { ratePercent: '81' }, { ratePercent: '10.005' }, { months: '25' }, { price: '29.5' }, { platforms: [] }, { audience: 'ab' }]) {
      expect(termsFromForm({ ...base, ...bad })).toBeNull();
    }
  });
});

describe('紹介リンクのコピー', () => {
  it('このサイトの /marketplace/go/{32桁} だけをコピーする', async () => {
    const written: string[] = [];
    const clipboard = { writeText: async (value: string) => { written.push(value); } };
    expect(await copyDistributionReferralUrl(`/marketplace/go/${'b'.repeat(32)}`, 'https://make-money.example.com', clipboard)).toBe('copied');
    expect(written).toEqual([`https://make-money.example.com/marketplace/go/${'b'.repeat(32)}`]);
    expect(await copyDistributionReferralUrl('https://evil.example.com/x', 'https://make-money.example.com', clipboard)).toBe('unsafe');
    expect(await copyDistributionReferralUrl(`/marketplace/go/${'b'.repeat(32)}`, 'https://make-money.example.com', undefined)).toBe('unavailable');
  });
});
