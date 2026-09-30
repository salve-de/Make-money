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

import { BUSINESS_SALE_NOTICE } from '@/shared/business-sale';
import { InquiryForm, InquiryFormView, type InquiryFormViewProps } from './InquiryForm';
import { expectTerminalStyle, visibleText } from './testing';

const noop = () => {};
const view: InquiryFormViewProps = {
  phase: 'ready',
  email: '',
  message: '',
  error: null,
  sending: false,
  onEmailChange: noop,
  onMessageChange: noop,
  onSubmit: noop,
  onSignIn: noop,
};
const renderView = (overrides: Partial<InquiryFormViewProps> = {}) => renderToStaticMarkup(<InquiryFormView {...view} {...overrides} />);

describe('InquiryFormView', () => {
  it('asks a signed-out visitor to log in and offers no inquiry fields', () => {
    const html = renderView({ phase: 'signed_out' });
    const text = visibleText(html);
    expect(text).toContain('問い合わせるには、ログインが必要です');
    expect(text).toContain('Googleでログイン');
    expect(html).not.toContain('<textarea');
    expect(html).not.toContain('<input');
    expect(text).not.toContain('問い合わせる同じ');
  });

  it('shows a loading line while the login state is unknown', () => {
    const html = renderView({ phase: 'loading' });
    expect(visibleText(html)).toContain('ログイン状態を確認中');
    expect(html).not.toContain('<textarea');
  });

  it('shows the email and message fields with the limits the server enforces', () => {
    const html = renderView();
    const text = visibleText(html);
    expect(html).toContain('type="email"');
    expect(html).toContain('maxLength="2000"');
    expect(text).toContain('問い合わせ内容（10文字以上）');
    expect(text).toContain('連絡先のメールアドレス（売り手にだけ見えます）');
    expect(text).toContain('0/2000');
  });

  it('shows the notice right before the send button', () => {
    const html = renderView();
    const notice = html.indexOf(BUSINESS_SALE_NOTICE);
    expect(notice).toBeGreaterThan(-1);
    expect(notice).toBeLessThan(html.indexOf('問い合わせる</button>'));
  });

  it('shows the field values and an error as an alert', () => {
    const html = renderView({ email: 'buyer@example.com', message: '売上の推移を教えてください。', error: '問い合わせ内容は10文字以上で入力してください' });
    expect(html).toContain('value="buyer@example.com"');
    expect(visibleText(html)).toContain('売上の推移を教えてください。');
    expect(html).toContain('role="alert"');
  });

  it('disables the button while sending', () => {
    expect(renderView({ sending: true })).toContain('disabled=""');
    expect(renderView({ sending: false })).not.toContain('disabled=""');
  });

  it('confirms a sent inquiry and reminds the daily limit, without showing the form again', () => {
    const html = renderView({ phase: 'sent' });
    expect(html).toContain('role="status"');
    expect(visibleText(html)).toContain('問い合わせを送りました');
    expect(visibleText(html)).toContain('1日1回まで');
    expect(html).not.toContain('<textarea');
  });

  it('stays inside the terminal style rules', () => {
    for (const phase of ['loading', 'signed_out', 'ready', 'sent'] as const) expectTerminalStyle(renderView({ phase }));
  });
});

describe('InquiryForm', () => {
  it('asks a visitor who is not logged in to log in', () => {
    auth.value = { user: null, token: null, loading: false, signInWithGoogle: async () => {} };
    const text = visibleText(renderToStaticMarkup(<InquiryForm listingId="l1" />));
    expect(text).toContain('Googleでログイン');
    expect(text).not.toContain('問い合わせ内容（10文字以上）');
  });

  it('waits while the account is loading', () => {
    auth.value = { user: null, token: null, loading: true, signInWithGoogle: async () => {} };
    expect(visibleText(renderToStaticMarkup(<InquiryForm listingId="l1" />))).toContain('ログイン状態を確認中');
  });

  it('prefills the contact email with the account email once logged in', () => {
    auth.value = { user: { uid: 'buyer-1', email: 'buyer@example.com' }, token: 'token', loading: false, signInWithGoogle: async () => {} };
    const html = renderToStaticMarkup(<InquiryForm listingId="l1" />);
    expect(html).toContain('value="buyer@example.com"');
    expect(visibleText(html)).toContain('問い合わせる');
    expect(html).toContain('<textarea');
  });

  it('shows an empty email field for an account without an email address', () => {
    auth.value = { user: { uid: 'buyer-1', email: null }, token: 'token', loading: false, signInWithGoogle: async () => {} };
    expect(renderToStaticMarkup(<InquiryForm listingId="l1" />)).toContain('value=""');
  });
});
