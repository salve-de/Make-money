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
    <section aria-labelledby="newsletter-heading" className="text-term-fg">
      <div className="max-w-xl px-3 py-2">
        <h2 id="newsletter-heading" className="text-base font-semibold text-term-fg-strong">
          事業・財務の更新を受け取る
        </h2>
        <p className="mt-1 text-sm leading-6 text-term-sub">
          追加・更新された事例をメールで届けます。配信を始める時期は変わる場合があります。
        </p>
      </div>

      <div className="px-3 pb-3">
        {!subscribed ? (
          <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="newsletter-email">メールアドレス</label>
            <input
              id="newsletter-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="min-h-11 min-w-0 flex-1 rounded-sm border border-term-line bg-term-bg px-3 text-sm text-term-fg-strong placeholder:text-term-dim focus:border-term-accent focus:outline-none lg:min-h-8"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 shrink-0 rounded-sm border border-term-accent bg-transparent px-5 text-sm text-term-accent hover:bg-term-head disabled:cursor-wait disabled:opacity-60 lg:min-h-8"
            >
              {loading ? '登録中…' : '登録する'}
            </button>
          </form>
        ) : (
          <div className="border-l-2 border-term-positive px-3 py-1" role="status">
            <p className="text-sm text-term-fg-strong">登録を受け付けました</p>
            <p className="mt-1 text-sm leading-6 text-term-sub">配信を停止する場合は、ここから手続きできます。</p>
            <button
              type="button"
              onClick={handleUnsubscribe}
              disabled={unsubscribing || (!token && !unsubscribeToken)}
              className="mt-2 min-h-11 text-sm text-term-sub underline underline-offset-4 hover:text-term-fg-strong disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
            >
              {unsubscribing ? '解除中…' : '配信を停止する'}
            </button>
          </div>
        )}
        {errorMsg && <p className="mt-2 text-sm text-term-danger" role="alert">{errorMsg}</p>}
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
