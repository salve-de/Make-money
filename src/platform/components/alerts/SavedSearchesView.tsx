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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user.getIdToken()
      .then((token) => request(token, '/api/saved-searches'))
      .then((body) => { if (!cancelled) setState({ status: 'ready', items: Array.isArray(body.savedSearches) ? body.savedSearches : [] }); })
      .catch((error) => { if (!cancelled) setState({ status: 'error', message: error instanceof Error ? error.message : '保存した条件を読み込めませんでした' }); });
    return () => { cancelled = true; };
  }, [user]);

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

  const BTN = 'inline-flex min-h-11 items-center justify-center rounded-sm border px-3 text-xs lg:min-h-7';
  const count = state.status === 'ready' ? state.items.length : null;

  return (
    <>
      {/* スマホは画面名をヘッダーが出すので、件数が無い時はこの段ごと出さない */}
      <div className={count === null ? 'hidden lg:block' : undefined}>
        <div className="term-panel-title">
          <span className="term-panel-name max-lg:hidden">保存した条件</span>
          {count !== null && <span className="term-num">{count} / {SAVED_SEARCH_LIMIT}件</span>}
        </div>
      </div>
      <h1 className="sr-only">保存した条件</h1>

      {loading || (user && state.status === 'loading') ? (
        <p className="px-3 py-4 text-sm text-term-muted">読み込み中…</p>
      ) : !user ? (
        <section className="px-3 py-4 text-sm">
          <p className="text-term-fg-strong">ログインすると、検索条件を保存して新着をメールで受け取れます</p>
          <p className="mt-1 text-term-sub">事例一覧で検索や絞り込みをしてから「条件を保存」を押すと、ここに並びます。</p>
          <button type="button" onClick={() => setShowAuth(true)} className={`${BTN} mt-3 border-term-accent px-4 text-sm text-term-accent hover:bg-term-head`}>ログイン</button>
        </section>
      ) : state.status === 'error' ? (
        <p role="alert" className="px-3 py-4 text-sm text-term-danger">{state.message}</p>
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
        <div className="term-panel-title"><span className="term-panel-name">週1回のお知らせ</span></div>
        <WeeklyNewsletterSection />
      </section>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </>
  );
}
