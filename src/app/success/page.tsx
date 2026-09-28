'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FOUNDING_PASS } from '@/lib/payments/founding-pass';

type CheckoutState = 'checking' | 'confirmed' | 'pending' | 'revoked' | 'missing' | 'login-required' | 'unconfirmed' | 'error';

export default function SuccessPage() {
  const { user, loading, refreshUserStatus, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('決済情報を確認しています');
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('checking');
  const [confirmedUserId, setConfirmedUserId] = useState<string | null>(null);
  const confirmed = !loading && !!user && confirmedUserId === user.uid;
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setConfirmedUserId(null);
      setChecking(false);
      setCheckoutState('checking');
      setMessage(loading ? 'ログイン状態を確認しています' : '決済情報を確認しています');
      if (loading) { setMessage('ログイン状態を確認しています'); return; }
      const sessionId = new URLSearchParams(window.location.search).get('session_id');
      if (!sessionId) {
        setCheckoutState('missing');
        setMessage('決済情報がありません。購入完了は確認できていません。');
        return;
      }
      if (!user) {
        setCheckoutState('login-required');
        setMessage('購入に使ったアカウントでログインしてください。ログイン後にこのページで状態を確認できます。');
        return;
      }
      setChecking(true);

      try {
        const token = await user.getIdToken();
        const response = await fetch('/api/checkout/status', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ sessionId }),
        });
        const result = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(result.error || '決済情報を確認できません');
        setConfirmedUserId(result.status === 'confirmed' ? user.uid : null);
        setCheckoutState(result.status === 'confirmed'
          ? 'confirmed'
          : result.status === 'revoked'
            ? 'revoked'
            : result.status === 'pending'
              ? 'pending'
              : 'unconfirmed');
        setMessage(result.status === 'confirmed'
          ? `${FOUNDING_PASS.name}の決済と会員権限を確認しました。`
          : result.status === 'revoked' ? 'この決済は返金または異議申立てにより利用権を確認できません。'
          : result.status === 'pending' ? '入金を確認しました。会員権限への反映を待っています。少し待って再確認してください。'
          : '決済完了はまだ確認できていません。');
      } catch (error) {
        if (!cancelled) {
          setCheckoutState('error');
          setMessage(error instanceof Error ? error.message : '決済情報を確認できません');
        }
      } finally { if (!cancelled) setChecking(false); }
    }
    void check();
    return () => { cancelled = true; };
  }, [user, loading, attempt]);

  const heading = checkoutState === 'confirmed'
    ? '会員権限を確認しました'
    : checkoutState === 'pending'
      ? '会員権限の反映待ちです'
      : checkoutState === 'revoked'
        ? 'この決済の利用権を確認できません'
        : checkoutState === 'login-required'
          ? 'ログインが必要です'
          : checkoutState === 'missing'
            ? '決済情報が見つかりません'
            : checkoutState === 'error'
              ? '決済状況を確認できませんでした'
              : checkoutState === 'checking'
                ? '決済状況を確認しています'
                : '決済完了を確認できていません';
  const stateLabel = checkoutState === 'confirmed'
    ? '確認'
    : checkoutState === 'pending' || checkoutState === 'checking'
      ? '確認中'
      : checkoutState === 'error' || checkoutState === 'revoked'
        ? '要対応'
        : '未確認';
  const stateTone = checkoutState === 'confirmed'
    ? 'text-term-positive'
    : checkoutState === 'error' || checkoutState === 'revoked'
      ? 'text-term-danger'
      : checkoutState === 'pending' || checkoutState === 'checking'
        ? 'text-term-accent'
        : 'text-term-dim';
  const BTN = 'inline-flex min-h-11 items-center justify-center rounded-sm border px-5 text-sm lg:min-h-8 lg:px-3';

  return (
    <main className="min-h-screen bg-term-bg text-term-fg">
      <div className="term-panel-title"><span className="term-panel-name">決済確認</span>{FOUNDING_PASS.name}</div>
      <section className="max-w-2xl">
        <h1 className="border-b border-term-line px-3 py-3 text-lg font-semibold text-term-fg-strong">{heading}</h1>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-2 border-b border-term-line-soft px-3 py-2">
          <span className="text-xs text-term-label">状態</span>
          <span className={`text-sm ${stateTone}`}>{stateLabel}</span>
        </div>
        <p role="status" aria-live="polite" className="border-b border-term-line px-3 py-3 text-sm leading-6 text-term-fg">{message}</p>
        <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row">
          <button
            onClick={async () => { await refreshUserStatus(); router.push('/'); }}
            className={`${BTN} border-term-accent bg-transparent text-term-accent hover:bg-term-head`}
          >
            事例一覧へ戻る
          </button>
          {checkoutState === 'login-required' ? (
            <button
              onClick={() => void signInWithGoogle()}
              className={`${BTN} border-term-line bg-transparent text-term-fg hover:bg-term-head`}
            >
              Googleでログイン
            </button>
          ) : !confirmed && ['pending', 'unconfirmed', 'error', 'checking'].includes(checkoutState) && (
            <button
              disabled={checking || loading}
              onClick={() => setAttempt((value) => value + 1)}
              className={`${BTN} border-term-line bg-transparent text-term-fg hover:bg-term-head disabled:cursor-wait disabled:opacity-50`}
            >
              {checking ? '確認中…' : 'もう一度確認'}
            </button>
          )}
        </div>
        <Link href="/welcome" className="inline-flex min-h-11 items-center px-3 text-sm text-term-sub underline underline-offset-4 hover:text-term-fg-strong">サービス案内</Link>
      </section>
    </main>
  );
}
