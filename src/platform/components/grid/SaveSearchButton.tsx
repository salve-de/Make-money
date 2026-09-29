'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import type { CatalogFilters } from '@/platform/model/entity-filter';
import { defaultSavedSearchName, describeSearchCondition, hasSavableCondition } from '@/platform/model/saved-search-view';
import { SAVED_SEARCH_NAME_MAX } from '@/shared/saved-search';

type SaveState = { status: 'idle' | 'saving' | 'saved' } | { status: 'error'; message: string };

export interface SavedSearchDraft {
  query: string;
  filters: CatalogFilters;
}

/** 今の検索語と絞り込みを保存し、新着が合ったらメールで知らせる。条件が無いときは出さない。 */
export function SaveSearchButton({ draft }: { draft: SavedSearchDraft }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [notify, setNotify] = useState(true);
  const [state, setState] = useState<SaveState>({ status: 'idle' });
  const [showAuth, setShowAuth] = useState(false);

  if (!hasSavableCondition(draft)) return null;

  const openPanel = () => {
    setName(defaultSavedSearchName(draft));
    setNotify(true);
    setState({ status: 'idle' });
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) { setShowAuth(true); return; }
    setState({ status: 'saving' });
    try {
      const response = await fetch('/api/saved-searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ name: name.trim() || defaultSavedSearchName(draft), query: draft.query.trim(), filters: draft.filters, notify }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : '条件を保存できませんでした');
      setState({ status: 'saved' });
    } catch (error) {
      setState({ status: 'error', message: error instanceof Error ? error.message : '条件を保存できませんでした' });
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-term-line px-2.5 text-xs text-term-fg hover:bg-term-head lg:min-h-7"
        title="この検索と絞り込みを保存し、新着が合ったらメールで受け取る"
      >
        条件を保存
      </button>
      {open && (
        <form
          onSubmit={save}
          aria-label="検索条件を保存"
          className="absolute left-0 top-full z-40 mt-1 w-[min(20rem,calc(100vw-2rem))] space-y-2 border border-term-line bg-term-panel p-3 text-xs shadow-lg sm:left-auto sm:right-0"
        >
          <p className="text-term-label">{describeSearchCondition(draft).join('・')}</p>
          <label className="block space-y-1">
            <span className="text-term-label">名前</span>
            <input
              value={name}
              maxLength={SAVED_SEARCH_NAME_MAX}
              onChange={(event) => setName(event.target.value)}
              className="h-11 w-full rounded-sm border border-term-line bg-term-bg px-2 text-sm text-term-fg-strong outline-none focus:border-term-accent lg:h-8"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2 text-term-fg lg:min-h-8">
            <input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} className="h-4 w-4 accent-[var(--term-accent)]" />
            新着が条件に合ったらメールで知らせる
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={state.status === 'saving' || state.status === 'saved'}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-sm border border-term-accent px-3 text-xs text-term-accent hover:bg-term-head disabled:opacity-60 lg:min-h-8"
            >
              {!user ? 'ログインして保存' : state.status === 'saving' ? '保存しています…' : state.status === 'saved' ? '保存しました' : '保存'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center rounded-sm border border-term-line px-3 text-xs text-term-muted hover:bg-term-head lg:min-h-8">
              閉じる
            </button>
          </div>
          {state.status === 'saved' && (
            <p role="status" className="text-term-sub">
              <Link href="/alerts" className="text-term-fg underline hover:text-term-fg-strong">保存した条件</Link>
              で、通知の切り替えや削除ができます。
            </p>
          )}
          {state.status === 'error' && <p role="alert" className="text-term-danger">{state.message}</p>}
        </form>
      )}
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
}
