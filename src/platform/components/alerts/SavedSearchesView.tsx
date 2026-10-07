'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { WeeklyNewsletterSection } from '@/components/terminal/WeeklyNewsletterSection';
import { catalogQueryHref } from '@/platform/model/entity-filter';
import { describeSearchCondition } from '@/platform/model/saved-search-view';
import { SAVED_SEARCH_LIMIT, type SavedSearch } from '@/shared/saved-search';

type ListState = { status: 'loading' } | { status: 'ready'; items: SavedSearch[] } | { status: 'error'; message: string };

async function request(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, cache: 'no-store' });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : '保存した条件を読み込めませんでした');
  return body;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'short', day: 'numeric' });
}

/** 保存した検索条件の一覧。通知の切り替え・一覧で開く・削除ができる。 */
export function SavedSearchesView() {
  const { user, loading } = useAuth();
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user.getIdToken()
      .then((token) => request(token, '/api/saved-searches'))
      .then((body) => { if (!cancelled) setState({ status: 'ready', items: Array.isArray(body.savedSearches) ? body.savedSearches : [] }); })
      .catch((error) => { if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : '保存した条件を読み込めませんでした' }); });
    return () => { cancelled = true; };
  }, [user, attempt]);

  const reload = () => { setRowError(null); setState({ status: 'loading' }); setAttempt((value) => value + 1); };

  const update = async (item: SavedSearch, action: 'toggle' | 'delete') => {
    if (!user) return;
    setBusyId(item.id);
    setRowError(null);
    try {
      const token = await user.getIdToken();
      if (action === 'delete') {
        await request(token, `/api/saved-searches/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
        setState((prev) => (prev.status === 'ready' ? { status: 'ready', items: prev.items.filter((entry) => entry.id !== item.id) } : prev));
      } else {
        const body = await request(token, `/api/saved-searches/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ notify: !item.notify }) });
        const saved = body.savedSearch as SavedSearch;
        setState((prev) => (prev.status === 'ready' ? { status: 'ready', items: prev.items.map((entry) => (entry.id === saved.id ? saved : entry)) } : prev));
      }
    } catch (error) {
      setRowError(error instanceof Error ? error.message : '変更できませんでした');
    } finally {
      setBusyId(null);
      setConfirmingId(null);
    }
  };

  const BTN = 'inline-flex min-h-11 items-center justify-center border px-3 text-xs lg:min-h-7';
  const count = state.status === 'ready' ? state.items.length : null;

  return (
    <>
      <div className="term-panel-title">
        <span className="term-panel-name">保存した条件</span>
        {count !== null && <span className="term-num">{count} / {SAVED_SEARCH_LIMIT}件</span>}
        <span className="hidden truncate sm:inline">新着が条件に合うと、メールでお知らせします。</span>
      </div>
      <h1 className="sr-only">保存した条件</h1>

      {loading || (user && state.status === 'loading') ? (
        <p className="px-3 py-4 text-sm text-term-muted">読み込み中…</p>
      ) : !user ? (
        <section className="px-3 py-4 text-sm">
          <p className="text-term-fg-strong">検索条件を保存して、新着をメールで受け取れます</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-term-sub">
            <li>事例一覧で検索語や絞り込みを決め、「条件を保存」を押す</li>
            <li>新しい事例が条件に合うと、メールでお知らせ（切り替え・削除はこの画面から）</li>
            <li>条件の保存にはログインが必要です。事例の保存・メモ・比較はログインなしでもこの端末で使えます</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowAuth(true)} className={`${BTN} border-term-accent px-4 text-sm text-term-accent hover:bg-term-head`}>ログインして使う</button>
            <Link href="/" className={`${BTN} border-term-line px-4 text-sm text-term-fg hover:bg-term-head`}>事例一覧で条件を決める</Link>
          </div>
        </section>
      ) : state.status === 'error' ? (
        <section className="px-3 py-4 text-sm">
          <p role="alert" className="text-term-danger">{state.message}</p>
          <button type="button" onClick={reload} className={`${BTN} mt-3 border-term-line px-4 text-term-fg hover:bg-term-head`}>再読み込み</button>
        </section>
      ) : state.status === 'ready' && state.items.length === 0 ? (
        <section className="px-3 py-4 text-sm">
          <p className="text-term-fg-strong">保存した条件はまだありません</p>
          <p className="mt-1 text-term-sub">事例一覧で検索や絞り込みをしてから「条件を保存」を押すと、新着が合ったときにメールで届きます。</p>
          <Link href="/" className={`${BTN} mt-3 border-term-line px-4 text-sm text-term-fg hover:bg-term-head`}>事例一覧へ</Link>
        </section>
      ) : state.status === 'ready' ? (
        <ul aria-label="保存した条件の一覧">
          {state.items.map((item) => {
            const condition = { query: item.query, filters: item.filters };
            return (
              <li key={item.id} className="flex flex-col gap-2 border-b border-term-line-soft px-3 py-2 text-sm lg:flex-row lg:items-center lg:gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-term-fg-strong">{item.name}</p>
                  <p className="truncate text-xs text-term-label">{describeSearchCondition(condition).join('・') || '条件なし'}<span className="term-num ml-2">{formatDate(item.createdAt)} 保存</span></p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <label className="inline-flex min-h-11 items-center gap-2 text-xs text-term-fg lg:min-h-7">
                    <input type="checkbox" checked={item.notify} disabled={busyId === item.id} onChange={() => update(item, 'toggle')} className="h-4 w-4 accent-[var(--term-accent)]" />
                    メールで知らせる
                  </label>
                  <Link href={catalogQueryHref(item.query, item.filters)} className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>一覧で開く</Link>
                  {confirmingId === item.id ? (
                    <>
                      <button type="button" disabled={busyId === item.id} onClick={() => update(item, 'delete')} className={`${BTN} border-term-danger text-term-danger hover:bg-term-head`}>削除する</button>
                      <button type="button" onClick={() => setConfirmingId(null)} className={`${BTN} border-term-line text-term-muted hover:bg-term-head`}>やめる</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmingId(item.id)} className={`${BTN} border-term-line text-term-muted hover:bg-term-head`}>削除</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {rowError && <p role="alert" className="px-3 py-2 text-xs text-term-danger">{rowError}</p>}

      <section aria-label="週1回のお知らせ" className="border-t border-term-line">
        <div className="term-panel-title"><span className="term-panel-name">週1回のお知らせ</span><span className="hidden truncate sm:inline">条件を決めずに、新しく公開された事例をまとめて受け取る</span></div>
        <WeeklyNewsletterSection />
      </section>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
