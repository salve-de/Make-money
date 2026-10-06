'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/context/AuthContext';
import { DISTRIBUTION_REFERRAL_PATH, type DistributionStatus } from '@/shared/marketplace-distribution';
import { DistributionRequestError, copyDistributionReferralUrl, distributionRequest, type CopyResult } from './distribution-client';

const BTN = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border px-4 text-sm disabled:opacity-50 lg:min-h-8 lg:px-3';

/**
 * 掲載ページの「SellRelay 経由の紹介リンク」欄。作者の外部申込み・決済へ紹介の印を付けて送るリンクを、
 * 出品者とは別の利用者が発行する。本番の接続（mode=live）で、掲載がSellRelayにつながっている時だけ出す。
 * Make-Money 内のテスト購入の紹介リンク（PurchasePanel）とは別物。
 */
export function RelayReferralPanel({ slug }: { slug: string }) {
  const { user, token, loading } = useAuth();
  const [status, setStatus] = useState<DistributionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    void distributionRequest(token, { query: { slug }, signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setStatus(value); })
      .catch(() => { if (!controller.signal.aborted) setStatus(null); });
    return () => controller.abort();
  }, [loading, token, slug, user?.uid]);

  const issue = async () => {
    if (!token || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      setStatus(await distributionRequest(token, { body: { action: 'referral', slug, kind: 'partner' } }));
    } catch (cause) {
      setMessage(cause instanceof DistributionRequestError ? cause.message : '紹介リンクを作れませんでした');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !status) return null;
  return (
    <>
      <RelayReferralView status={status} busy={busy} message={message} signedIn={!!user} onIssue={() => void issue()} onSignIn={() => setAuthOpen(true)} />
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signin" />
    </>
  );
}

export function RelayReferralView({ status, busy, message, signedIn, onIssue, onSignIn }: {
  status: DistributionStatus;
  busy: boolean;
  message: string | null;
  signedIn: boolean;
  onIssue: () => void;
  onSignIn: () => void;
}) {
  const [copy, setCopy] = useState<CopyResult | null>(null);
  // テスト用の偽接続や未接続は、本番の連携として見せない。
  if (status.mode !== 'live' || (status.state !== 'linked' && status.state !== 'account_required')) return null;
  const path = status.referralUrl && DISTRIBUTION_REFERRAL_PATH.test(status.referralUrl) ? status.referralUrl : null;
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  return (
    <section aria-label="SellRelay経由の紹介" className="border-b border-term-line px-3 py-3">
      <h2 className="text-sm font-semibold text-term-fg-strong">紹介して報酬を得る（SellRelay経由）</h2>
      <p className="mt-1 text-xs leading-5 text-term-label">
        あなたの専用リンクから掲載者の申込み・決済ページへ案内します。報酬の条件・計算・支払いはSellRelayが行います。
      </p>
      <div className="mt-2">
        {!signedIn || status.state === 'account_required' ? (
          <button type="button" onClick={onSignIn} className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>ログインして紹介リンクを作る</button>
        ) : path ? (
          <div className="grid gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-term-label">あなたの紹介リンク</span>
              <input readOnly value={origin ? new URL(path, origin).href : path} onFocus={(event) => event.currentTarget.select()}
                className="term-num w-full min-w-0 rounded-sm border border-term-line bg-term-bg px-3 py-2.5 text-sm text-term-fg-strong" />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}
                onClick={() => void copyDistributionReferralUrl(path, window.location.origin, navigator.clipboard).then(setCopy)}>リンクをコピー</button>
              {copy === 'copied' && <span role="status" className="text-xs text-term-positive">コピーしました</span>}
              {copy && copy !== 'copied' && <span role="alert" className="text-xs text-term-danger">コピーできませんでした。リンクを選んでコピーしてください</span>}
            </div>
          </div>
        ) : status.canRefer ? (
          <button type="button" disabled={busy} onClick={onIssue} className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>
            {busy && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}紹介リンクを作る
          </button>
        ) : (
          <p className="text-sm text-term-sub">このアカウントではまだ紹介リンクを作れません（出品者本人、またはSellRelay側の紹介の許可が未完了）。</p>
        )}
        {message && <p role="alert" className="mt-2 text-sm text-term-danger">{message}</p>}
      </div>
    </section>
  );
}
