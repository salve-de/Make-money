'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';

export const WeeklyNewsletterSection = () => {
  const { token } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unsubscribeToken, setUnsubscribeToken] = useState<string | null>(null);
  const [unsubscribing, setUnsubscribing] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'web_portal' }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(readNewsletterError(payload, '登録できませんでした。時間をおいて再度お試しください。'));
      if (!payload || typeof payload !== 'object' || !('success' in payload) || payload.success !== true) {
        throw new Error('登録受付の応答を確認できませんでした。');
      }

      setSubscribed(true);
      setUnsubscribeToken('unsubscribeToken' in payload && typeof payload.unsubscribeToken === 'string' ? payload.unsubscribeToken : null);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '通信に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setUnsubscribing(true);
    setErrorMsg('');
    try {
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'DELETE',
        headers,
        body: token ? undefined : JSON.stringify({ unsubscribeToken }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error(readNewsletterError(payload, '解除できませんでした。'));
      setSubscribed(false);
      setUnsubscribeToken(null);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '購読解除に失敗しました。');
    } finally {
      setUnsubscribing(false);
    }
  };

  return (
    <section aria-labelledby="newsletter-heading" className="rounded-lg border border-white/[0.12] bg-surface p-5 text-white sm:p-6">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-accent">メール更新</p>
        <h2 id="newsletter-heading" className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
          事業・財務の更新を受け取る
        </h2>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          台帳に追加・更新された内容をメールでお知らせします。登録受付後、配信の開始時期は運用状況により変わる場合があります。
        </p>
      </div>

      <div className="mt-5">
        {!subscribed ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="newsletter-email">メールアドレス</label>
            <input
              id="newsletter-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="min-h-12 min-w-0 flex-1 rounded-md border border-white/[0.16] bg-background px-3.5 text-sm text-white placeholder:text-zinc-500 focus:border-accent focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-12 shrink-0 rounded-md bg-accent-strong px-5 text-sm font-semibold text-[#10151a] transition-colors hover:bg-white disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? '登録中…' : '登録する'}
            </button>
          </form>
        ) : (
          <div className="rounded-md border border-accent/30 bg-background p-4" role="status">
            <p className="text-sm font-semibold text-white">登録を受け付けました</p>
            <p className="mt-1 text-sm leading-6 text-zinc-400">配信を停止する場合は、ここから手続きできます。</p>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={unsubscribing || (!token && !unsubscribeToken)}
              className="mt-3 min-h-10 rounded px-2 text-sm text-zinc-300 underline underline-offset-4 hover:text-white disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            >
              {unsubscribing ? '解除中…' : '配信を停止する'}
            </button>
          </div>
        )}
        {errorMsg && <p className="mt-2 text-sm text-rose-300" role="alert">{errorMsg}</p>}
      </div>
    </section>
  );
};

function readNewsletterError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
    return payload.error.slice(0, 240);
  }
  return fallback;
}
