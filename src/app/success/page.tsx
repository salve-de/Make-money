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
  const stateTone = checkoutState === 'confirmed'
    ? 'bg-emerald-300'
    : checkoutState === 'pending' || checkoutState === 'checking'
      ? 'bg-amber-300'
      : checkoutState === 'error' || checkoutState === 'revoked'
        ? 'bg-rose-300'
        : 'bg-zinc-400';

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#10151a] px-4 py-8 text-zinc-100">
      <section className="w-full max-w-lg rounded-lg border border-white/[0.14] bg-[#171e25] p-5 sm:p-7">
        <div className="text-xs font-semibold tracking-wide text-zinc-400">決済確認</div>
        <h1 className="mt-2 text-xl font-semibold leading-snug text-zinc-50 sm:text-2xl">{heading}</h1>
        <div className="mt-5 flex items-start gap-3 rounded-md border border-white/[0.1] bg-black/10 p-4">
          <span aria-hidden="true" className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${stateTone}`} />
          <p role="status" aria-live="polite" className="text-sm leading-6 text-zinc-200">{message}</p>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={async () => { await refreshUserStatus(); router.push('/'); }}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-sky-200 px-5 text-sm font-semibold text-slate-950 hover:bg-sky-100"
          >
            台帳へ戻る
          </button>
          {checkoutState === 'login-required' ? (
            <button
              onClick={() => void signInWithGoogle()}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/[0.16] px-5 text-sm font-medium text-zinc-100 hover:bg-white/[0.06]"
            >
              Googleでログイン
            </button>
          ) : !confirmed && ['pending', 'unconfirmed', 'error', 'checking'].includes(checkoutState) && (
            <button
              disabled={checking || loading}
              onClick={() => setAttempt((value) => value + 1)}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-white/[0.16] px-5 text-sm font-medium text-zinc-100 hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-50"
            >
              {checking ? '確認中…' : 'もう一度確認'}
            </button>
          )}
        </div>
        <Link href="/welcome" className="mt-5 inline-flex min-h-11 items-center text-sm text-zinc-400 underline underline-offset-4 hover:text-zinc-200">サービス案内</Link>
      </section>
    </main>
  );
}
