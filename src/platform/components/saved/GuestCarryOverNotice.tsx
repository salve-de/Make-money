'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ANALYST_NOTES_STORAGE_KEY, decodeAnalystNotes } from '@/platform/hooks/analyst-notes-storage';
import { carryOverGuestData, dismissKey, readGuestCarryOver, type GuestCarryOverSummary } from '@/platform/hooks/guest-carryover';

type Phase = 'ask' | 'working' | 'error' | 'done';

/**
 * ログインした直後に、ログイン前にこの端末へ保存した事例・メモを「消えたように見えない」ようにする案内。
 * 移すかどうかは利用者が選ぶ。どちらを選んでも、この端末のゲスト分は削除しない（ログアウトすればまた見える）。
 */
export function GuestCarryOverNotice() {
  const { user, token, loading } = useAuth();
  const uid = user?.uid ?? null;
  const [summary, setSummary] = useState<GuestCarryOverSummary | null>(null);
  const [phase, setPhase] = useState<Phase>('ask');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // ログイン状態は外部の購読。確定した後にだけ、この端末のゲスト分を読む
    /* eslint-disable react-hooks/set-state-in-effect */
    if (loading || !uid) { setSummary(null); return; }
    try {
      if (window.localStorage.getItem(dismissKey(uid))) { setSummary(null); return; }
      const found = readGuestCarryOver(window.localStorage);
      setSummary(found.bookmarkIds.length + found.noteIds.length > 0 ? found : null);
      setPhase('ask');
    } catch { setSummary(null); }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [loading, uid]);

  if (!summary || !uid) return null;

  const finish = () => {
    try { window.localStorage.setItem(dismissKey(uid), new Date().toISOString()); } catch { /* 記録できなくても動作は続ける */ }
    setSummary(null);
  };

  const run = async () => {
    if (!token) { setPhase('error'); setMessage('ログインの確認が終わっていません。少し待ってからもう一度押してください。'); return; }
    setPhase('working');
    try {
      const notes = decodeAnalystNotes(window.localStorage.getItem(ANALYST_NOTES_STORAGE_KEY)).notes;
      const result = await carryOverGuestData(token, uid, summary, notes);
      try { window.localStorage.setItem(dismissKey(uid), new Date().toISOString()); } catch { /* 同上 */ }
      setPhase('done');
      setMessage(`保存した事例${result.bookmarks}件・メモ${result.notes}件をアカウントに移しました。`);
    } catch (error) {
      setPhase('error');
      setMessage(error instanceof Error ? `${error.message}。もう一度お試しください。` : '移せませんでした。もう一度お試しください。');
    }
  };

  const BTN = 'inline-flex min-h-11 items-center justify-center border px-3 text-xs lg:min-h-6';
  return (
    <section role="region" aria-label="ログイン前の保存分" className="border-b border-term-line bg-term-head px-3 py-2 text-xs text-term-fg">
      {phase === 'done' ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="status">{message}</p>
          <button type="button" onClick={() => window.location.reload()} className={`${BTN} border-term-accent text-term-accent hover:bg-term-line`}>画面に反映する</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1">
            ログイン前にこの端末で保存した事例{summary.bookmarkIds.length}件・メモ{summary.noteIds.length}件があります。アカウントに移すと、どの端末でも見られます。
            移さなくても、この端末には残ります（ログアウトすると見えます）。
          </p>
          {phase === 'error' && <p role="alert" className="w-full text-term-danger">{message}</p>}
          <button type="button" disabled={phase === 'working'} onClick={run} className={`${BTN} border-term-accent text-term-accent hover:bg-term-line disabled:opacity-60`}>
            {phase === 'working' ? '移しています…' : phase === 'error' ? 'もう一度移す' : 'アカウントに移す'}
          </button>
          <button type="button" disabled={phase === 'working'} onClick={finish} className={`${BTN} border-term-line text-term-muted hover:bg-term-line`}>移さない</button>
        </div>
      )}
    </section>
  );
}
