'use client';

import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { BUSINESS_SALE_LIMITS } from '@/shared/business-sale';
import { charLength } from '@/shared/business-sale-input';
import { BusinessSaleNotice } from './BusinessSaleNotice';
import { submitBusinessSaleInquiry } from './business-sale-submit';

const BTN = 'inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm disabled:opacity-50 lg:min-h-8 lg:px-3 lg:text-[13px]';
const CONTROL = 'w-full rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent lg:text-[13px]';

export type InquiryPhase = 'loading' | 'signed_out' | 'ready' | 'sent';

export interface InquiryFormViewProps {
  phase: InquiryPhase;
  email: string;
  message: string;
  error: string | null;
  sending: boolean;
  onEmailChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: () => void;
  onSignIn: () => void;
}

/** 問い合わせフォームの描画。注意書きは、送信ボタンの直前に置く。 */
export function InquiryFormView(props: InquiryFormViewProps) {
  return (
    <section aria-labelledby="inquiry-heading" className="max-w-3xl border-t border-term-line px-3 py-3">
      <h2 id="inquiry-heading" className="text-sm font-semibold text-term-fg-strong">この事業について問い合わせる</h2>
      {props.phase === 'loading' && (
        <p className="mt-2 flex items-center gap-2 text-sm text-term-label">
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />ログイン状態を確認中…
        </p>
      )}
      {props.phase === 'signed_out' && (
        <div className="mt-2 text-sm">
          <p className="text-term-sub">問い合わせるには、ログインが必要です。同じ掲載への問い合わせは1日1回までです。</p>
          <button type="button" onClick={props.onSignIn} className={`${BTN} mt-3 rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
            Googleでログイン
          </button>
        </div>
      )}
      {props.phase === 'sent' && (
        <p role="status" className="mt-2 text-sm text-term-fg">
          問い合わせを送りました。売り手が確認します。同じ掲載への問い合わせは、1日1回までです。
        </p>
      )}
      {props.phase === 'ready' && (
        <div className="mt-2 grid gap-3">
          <label className="block">
            <span className="mb-1 block text-xs text-term-label">連絡先のメールアドレス（売り手にだけ見えます）</span>
            <input
              type="email"
              value={props.email}
              autoComplete="email"
              maxLength={BUSINESS_SALE_LIMITS.contactEmailMax}
              onChange={(event) => props.onEmailChange(event.target.value)}
              className={`${CONTROL} min-h-11 lg:min-h-8`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-term-label">問い合わせ内容（{BUSINESS_SALE_LIMITS.inquiryMessageMin}文字以上）</span>
            <textarea
              value={props.message}
              rows={5}
              maxLength={BUSINESS_SALE_LIMITS.inquiryMessageMax}
              onChange={(event) => props.onMessageChange(event.target.value)}
              className={`${CONTROL} py-2`}
              placeholder="例: 直近半年の月ごとの売上がわかる資料を見せていただけますか。"
            />
            <span className="term-num mt-1 block text-right text-xs text-term-dim">{charLength(props.message)}/{BUSINESS_SALE_LIMITS.inquiryMessageMax}</span>
          </label>
          {props.error && <p role="alert" className="text-sm text-term-danger">{props.error}</p>}
          <BusinessSaleNotice />
          <div>
            <button type="button" disabled={props.sending} onClick={props.onSubmit} className={`${BTN} rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
              {props.sending && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
              問い合わせる
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** ログイン状態に応じて、ログインの案内・入力欄・送信済みの表示を切り替える。 */
export function InquiryForm({ listingId }: { listingId: string }) {
  const { user, token, loading, signInWithGoogle } = useAuth();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  // null は「まだ書き換えていない」。その間は、ログインしているアカウントのメールを最初の候補として見せる
  const [editedEmail, setEditedEmail] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const email = editedEmail ?? user?.email ?? '';

  const submit = async () => {
    if (!token || sending) return;
    setSending(true);
    setError(null);
    const result = await submitBusinessSaleInquiry({ token, listingId, message, contactEmail: email });
    if (!active.current) return;
    setSending(false);
    if (result.ok) setSent(true);
    else setError(result.message);
  };

  const phase: InquiryPhase = sent ? 'sent' : loading ? 'loading' : user && token ? 'ready' : user ? 'loading' : 'signed_out';
  return (
    <InquiryFormView
      phase={phase}
      email={email}
      message={message}
      error={error}
      sending={sending}
      onEmailChange={(value) => { setEditedEmail(value); setError(null); }}
      onMessageChange={(value) => { setMessage(value); setError(null); }}
      onSubmit={() => void submit()}
      onSignIn={() => void signInWithGoogle()}
    />
  );
}
