'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { deleteUser } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { auth } from '@/lib/firebase/client';
import type { BillingStatus } from '@/lib/payments/billing';
import { useModalFocus } from '@/platform/hooks/useModalFocus';
import { PLAN_LABELS, fetchBillingStatus, formatRenewal, openBillingPortal } from '@/components/terminal/billing-client';
import { AuthModal } from './AuthModal';
import { authErrorMessage } from './authErrors';

const BTN = 'inline-flex min-h-11 items-center justify-center rounded-sm border border-term-line bg-transparent px-4 text-sm text-term-fg hover:bg-term-head disabled:cursor-wait disabled:opacity-50 lg:min-h-8 lg:px-3 lg:text-[13px]';
const BTN_PRIMARY = 'inline-flex min-h-11 items-center justify-center rounded-sm border border-term-accent bg-transparent px-4 text-sm text-term-accent hover:bg-term-head disabled:cursor-wait disabled:opacity-50 lg:min-h-8 lg:px-3 lg:text-[13px]';
const BTN_DANGER = 'inline-flex min-h-11 items-center justify-center rounded-sm border border-term-danger bg-transparent px-4 text-sm text-term-danger hover:bg-term-head disabled:cursor-wait disabled:opacity-50 lg:min-h-8 lg:px-3 lg:text-[13px]';

type BillingState =
  | { kind: 'loading' }
  | { kind: 'ready'; status: BillingStatus }
  | { kind: 'error'; message: string };

type Notice = { tone: 'ok' | 'error'; text: string } | null;

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[96px_minmax(0,1fr)] items-baseline gap-2 border-b border-term-line-soft px-3 py-2 sm:grid-cols-[128px_minmax(0,1fr)]">
    <dt className="text-xs text-term-label">{label}</dt>
    <dd className="min-w-0 break-words text-sm text-term-fg lg:text-[13px]">{children}</dd>
  </div>
);

const Section: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section aria-labelledby={id} className="border-b border-term-line">
    <div className="term-panel-title"><h2 id={id} className="term-panel-name">{title}</h2></div>
    {children}
  </section>
);

const NoticeLine: React.FC<{ notice: Notice }> = ({ notice }) => notice ? (
  <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`px-3 pb-3 text-sm leading-6 [overflow-wrap:anywhere] ${notice.tone === 'error' ? 'text-term-danger' : 'text-term-fg'}`}>
    {notice.text}
  </p>
) : null;

/** 会員設定：アカウント・プランと契約・パスワード・ログアウト・退会。 */
export const AccountView: React.FC = () => {
  const { user, loading, isPro, signOut, sendPasswordReset } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'reset' | null>(null);
  const [billing, setBilling] = useState<BillingState>({ kind: 'loading' });
  // メニューの「ログイン・新規登録」から来た人が、もう一度ボタンを押さずに済むよう、未ログインならログイン窓を最初から開く
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!auth || loading || user || autoOpened.current) return;
    autoOpened.current = true;
    setAuthMode('signin');
  }, [loading, user]);

  const [billingAttempt, setBillingAttempt] = useState(0);
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalNotice, setPortalNotice] = useState<Notice>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetNotice, setResetNotice] = useState<Notice>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState<Notice>(null);
  const [deleteBlockedBySubscription, setDeleteBlockedBySubscription] = useState(false);
  const [deleted, setDeleted] = useState<null | 'all' | 'data-only'>(null);
  // ログインし直した・別の人に替わったときは、前の人への案内や契約状況を残さない
  const uid = user?.uid ?? null;
  const [shownUid, setShownUid] = useState(uid);
  if (shownUid !== uid) {
    setShownUid(uid);
    setBilling({ kind: 'loading' });
    setPortalNotice(null);
    setResetNotice(null);
    setDeleteNotice(null);
    setDeleteBlockedBySubscription(false);
    setConfirmDelete(false);
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    user.getIdToken()
      .then(fetchBillingStatus)
      .then((status) => { if (!cancelled) setBilling({ kind: 'ready', status }); })
      .catch((error: unknown) => {
        if (!cancelled) setBilling({ kind: 'error', message: error instanceof Error ? error.message : '契約状況を確認できません。' });
      });
    return () => { cancelled = true; };
  }, [user, billingAttempt]);

  const openPortal = useCallback(async () => {
    if (!user) return;
    setPortalBusy(true);
    setPortalNotice(null);
    try {
      await openBillingPortal(await user.getIdToken());
    } catch (error) {
      setPortalNotice({ tone: 'error', text: error instanceof Error ? error.message : '契約の管理画面を開けませんでした。' });
      setPortalBusy(false);
    }
  }, [user]);

  const { dialogRef, onKeyDown } = useModalFocus(confirmDelete, () => { if (!deleteBusy) setConfirmDelete(false); });

  if (deleted) {
    return (
      <Section id="account-deleted" title="退会">
        <p role="status" className="px-3 py-3 text-sm leading-6 text-term-fg">
          {deleted === 'all'
            ? 'アカウントを削除しました。保存した事例・メモ・条件などのデータと、ログイン用の登録を消しました。'
            : 'このサービスに保存したデータは削除し、ログアウトしました。ログイン用の登録は、安全のため削除できませんでした。もう一度ログインしてから、この画面の「アカウントを削除する」をもう一度押すと消えます。'}
        </p>
        <div className="px-3 pb-3"><Link href="/" className={BTN}>事例一覧へ</Link></div>
      </Section>
    );
  }

  if (!auth) {
    return (
      <Section id="account-unavailable" title="会員設定">
        <p className="px-3 py-3 text-sm leading-6 text-term-fg">この環境では、ログインと会員登録を利用できません。</p>
      </Section>
    );
  }

  if (loading) {
    return (
      <Section id="account-loading" title="会員設定">
        <p role="status" className="px-3 py-3 text-sm text-term-muted">ログイン状態を確認しています…</p>
      </Section>
    );
  }

  if (!user) {
    return (
      <>
        <Section id="account-signed-out" title="会員設定">
          <p className="px-3 pt-3 text-sm leading-6 text-term-fg">ログインすると、保存した事例やメモをほかの端末でも使えます。登録は無料です。</p>
          <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row">
            <button type="button" onClick={() => setAuthMode('signup')} className={BTN_PRIMARY}>無料で登録する</button>
            <button type="button" onClick={() => setAuthMode('signin')} className={BTN}>ログイン</button>
          </div>
          <p className="px-3 pb-3 text-sm">
            <button type="button" onClick={() => setAuthMode('reset')} className="min-h-11 text-term-sub underline underline-offset-2 hover:text-term-fg-strong lg:min-h-6">パスワードを忘れた方</button>
          </p>
        </Section>
        <AuthModal isOpen={authMode !== null} onClose={() => setAuthMode(null)} defaultMode={authMode ?? 'signin'} />
      </>
    );
  }

  const usesPassword = user.providerData.some((provider) => provider.providerId === 'password');
  const usesGoogle = user.providerData.some((provider) => provider.providerId === 'google.com');
  const status = billing.kind === 'ready' ? billing.status : null;
  const renewal = status ? formatRenewal(status) : null;
  const proNow = status ? status.isPro : isPro;
  const recurring = status?.plan === 'pro-monthly' || status?.plan === 'pro-yearly';

  const handlePasswordReset = async () => {
    if (!user.email) return;
    setResetBusy(true);
    setResetNotice(null);
    try {
      await sendPasswordReset(user.email);
      setResetNotice({ tone: 'ok', text: `${user.email} あてに、パスワードを決め直すためのメールを送りました。届かないときは迷惑メールのフォルダも確認してください。` });
    } catch (error) {
      setResetNotice({ tone: 'error', text: authErrorMessage(error, 'メールを送れませんでした。時間をおいて、もう一度試してください。') });
    } finally {
      setResetBusy(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try { await signOut(); } finally { setSigningOut(false); }
  };

  const handleDelete = async () => {
    setDeleteBusy(true);
    setDeleteNotice(null);
    setDeleteBlockedBySubscription(false);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/user/me', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const body: unknown = await response.json().catch(() => null);
      const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
      if (!response.ok) {
        if (record.code === 'subscription_active') setDeleteBlockedBySubscription(true);
        setDeleteNotice({ tone: 'error', text: typeof record.error === 'string' ? record.error : 'アカウントを削除できませんでした。時間をおいて、もう一度試してください。' });
        setConfirmDelete(false);
        return;
      }
      // サービスのデータを消せたら、ログイン用の登録も消す。直近にログインしていないと Firebase が断るので、その時はログアウトして案内する。
      try {
        if (auth?.currentUser?.uid !== user.uid) throw new Error('signed out');
        await deleteUser(auth.currentUser);
        setDeleted('all');
      } catch {
        setDeleted('data-only');
        await signOut();
      }
    } catch {
      setDeleteNotice({ tone: 'error', text: '通信できませんでした。接続を確認して、もう一度試してください。' });
      setConfirmDelete(false);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <Section id="account-profile" title="アカウント">
        <dl>
          <Row label="メールアドレス"><span className="font-mono">{user.email ?? '（なし）'}</span></Row>
          <Row label="ログイン方法">{[usesPassword && 'メールアドレスとパスワード', usesGoogle && 'Google'].filter(Boolean).join('・') || 'その他'}</Row>
        </dl>
        <div className="px-3 py-3">
          <button type="button" onClick={() => void handleSignOut()} disabled={signingOut} className={BTN}>
            {signingOut ? 'ログアウトしています…' : 'ログアウト'}
          </button>
        </div>
      </Section>

      <Section id="account-plan" title="プランと契約">
        {billing.kind === 'loading' && <p role="status" className="px-3 py-3 text-sm text-term-muted">契約状況を読み込んでいます…</p>}
        {billing.kind === 'error' && (
          <div className="px-3 pt-3">
            <p role="alert" className="text-sm leading-6 text-term-danger">{billing.message}</p>
            <button type="button" onClick={() => { setBilling({ kind: 'loading' }); setBillingAttempt((value) => value + 1); }} className={`${BTN} mt-2`}>もう一度読み込む</button>
          </div>
        )}
        {billing.kind !== 'loading' && (
          <dl className="mt-1">
            <Row label="プラン">
              {proNow
                ? <span className="text-term-accent">PRO{status?.plan ? `（${PLAN_LABELS[status.plan]}）` : ''}</span>
                : <span>無料プラン</span>}
            </Row>
            {recurring && (
              <Row label="更新">
                <span className="term-num">{renewal ?? '—'}</span>
              </Row>
            )}
            {status?.plan === 'founding-pass' && <Row label="更新">買い切りのため、自動更新・月額の請求はありません</Row>}
          </dl>
        )}
        {billing.kind !== 'loading' && <div className="space-y-2 px-3 py-3">
          {status?.canManage ? (
            <>
              <button type="button" onClick={() => void openPortal()} disabled={portalBusy} className={BTN}>
                {portalBusy ? '契約の管理画面を開いています…' : '契約の管理（支払い方法の変更・解約）'}
              </button>
              <p className="text-xs leading-5 text-term-label">
                解約は契約の管理画面で行います。解約しても、次回の更新日までは PRO を使えます。更新日以降は請求されません。
              </p>
            </>
          ) : !proNow ? (
            <>
              <Link href="/?pro=1" prefetch={false} className={BTN_PRIMARY}>PRO の内容とプランを見る</Link>
              <p className="text-xs leading-5 text-term-label">PRO では、事業構造12項目の詳細分析を読めます。財務と出典は無料で見られます。</p>
            </>
          ) : status?.plan === 'founding-pass' ? (
            <p className="text-xs leading-5 text-term-label">創刊版は買い切りのため、解約の手続きはありません。</p>
          ) : null}
        </div>}
        <NoticeLine notice={portalNotice} />
      </Section>

      <Section id="account-password" title="パスワード">
        {usesPassword ? (
          <>
            <p className="px-3 pt-3 text-sm leading-6 text-term-sub">登録したメールアドレスに、新しいパスワードを決めるためのリンクを送ります。</p>
            <div className="px-3 py-3">
              <button type="button" onClick={() => void handlePasswordReset()} disabled={resetBusy || !user.email} className={BTN}>
                {resetBusy ? '送信しています…' : 'パスワード再設定のメールを送る'}
              </button>
            </div>
            <NoticeLine notice={resetNotice} />
          </>
        ) : (
          <p className="px-3 py-3 text-sm leading-6 text-term-sub">Google でログインしているため、パスワードは Google のアカウント側で管理されています。</p>
        )}
      </Section>

      <Section id="account-delete" title="退会">
        <p className="px-3 pt-3 text-sm leading-6 text-term-sub">
          アカウントを削除すると、保存した事例・メモ・保存した条件・実行計画など、このサービスに保存したデータが消え、元に戻せません。
          支払いの記録は、会計のため個人と結び付かない形で残ります。
        </p>
        <p className="px-3 pt-1 text-sm leading-6 text-term-sub">月額・年額プランを契約中の場合は、先に「契約の管理」から解約してください。</p>
        <div className="flex flex-col gap-2 px-3 py-3 sm:flex-row">
          <button type="button" onClick={() => { setDeleteNotice(null); setConfirmDelete(true); }} className={BTN_DANGER}>アカウントを削除する</button>
          {deleteBlockedBySubscription && status?.canManage && (
            <button type="button" onClick={() => void openPortal()} disabled={portalBusy} className={BTN}>契約の管理を開く</button>
          )}
        </div>
        <NoticeLine notice={deleteNotice} />
      </Section>

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-3">
          <div role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-desc" ref={dialogRef} onKeyDown={onKeyDown} className="w-full max-w-md border border-term-line bg-term-panel text-term-fg shadow-lg">
            <div className="term-panel-title"><h2 id="delete-title" className="term-panel-name text-xs">アカウントの削除</h2></div>
            <div className="space-y-3 p-4">
              <p id="delete-desc" className="text-sm leading-6 text-term-fg">
                <span className="font-mono">{user.email}</span> のアカウントと、このサービスに保存したデータをすべて削除します。この操作は取り消せません。
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setConfirmDelete(false)} disabled={deleteBusy} className={BTN}>やめる</button>
                <button type="button" onClick={() => void handleDelete()} disabled={deleteBusy} className={BTN_DANGER}>
                  {deleteBusy ? '削除しています…' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
