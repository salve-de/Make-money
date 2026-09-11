'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { FOUNDING_PASS } from '@/lib/payments/founding-pass';

export default function SuccessPage() {
  const { user, loading, refreshUserStatus } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState('決済情報を確認しています');
  const [confirmedUserId, setConfirmedUserId] = useState<string | null>(null);
  const confirmed = !loading && !!user && confirmedUserId === user.uid;
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setConfirmedUserId(null);
      setChecking(false);
      if (loading) { setMessage('ログイン状態を確認しています'); return; }
      const sessionId = new URLSearchParams(window.location.search).get('session_id');
      if (!sessionId) { setMessage('決済情報がありません。購入完了は確認できていません。'); return; }
      if (!user) { setMessage('購入したアカウントでログインしてから、このページを再度開いてください。'); return; }
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
        setMessage(result.status === 'confirmed'
          ? `${FOUNDING_PASS.name}の決済と会員権限を確認しました。`
          : result.status === 'revoked' ? 'この決済は返金または異議申立てにより利用権を確認できません。'
          : result.status === 'pending' ? '入金を確認しました。会員権限への反映を待っています。少し待って再確認してください。'
          : '決済完了はまだ確認できていません。');
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : '決済情報を確認できません');
      } finally { if (!cancelled) setChecking(false); }
    }
    void check();
    return () => { cancelled = true; };
  }, [user, loading, attempt]);

  return (
    <main className="min-h-screen bg-[#07080B] text-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#0C0E14] p-6 text-center space-y-4">
        <h1 className="text-lg font-bold">{confirmed ? '決済とPRO会員権限を確認しました' : '決済状況の確認'}</h1>
        <p role="status" className="text-xs leading-relaxed text-zinc-400">{message}</p>
        {!confirmed && <button disabled={checking || loading} onClick={() => setAttempt((value) => value + 1)} className="rounded border border-white/20 p-2 text-xs disabled:opacity-50">{checking ? '確認中...' : '再確認する'}</button>}
        <button onClick={async () => { await refreshUserStatus(); router.push('/'); }} className="block rounded bg-white px-5 py-2 text-xs font-bold text-zinc-950">台帳へ戻る</button>
        <Link href="/welcome" className="block text-xs text-zinc-400">サービス案内</Link>
      </div>
    </main>
  );
}
