'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { AuthModal } from '@/components/auth/AuthModal';
import { useAuth } from '@/context/AuthContext';
import {
  REFERRAL_NOTE_LABELS,
  formatExactYen,
  referralRewardJpy,
  type CommerceOrderView,
  type PublicCommerceOffer,
} from '@/shared/marketplace-commerce';
import { CommerceRequestError, commerceRequest, newRequestKey } from './commerce-client';

const BTN = 'inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm disabled:opacity-50 lg:min-h-8 lg:px-3';

type PurchaseState =
  | { kind: 'idle' }
  | { kind: 'buying' }
  | { kind: 'done'; order: CommerceOrderView }
  | { kind: 'error'; message: string };

/**
 * 掲載ページの購入欄と紹介リンク欄。
 * - offer が null なら、Make-Money内では販売していない（外部リンクだけ）。
 * - 購入は現在テスト購入だけで、実際の請求はない。
 * - ?ref= の紹介コードがあれば、開いたことを数え、購入に紐づける。
 */
export function PurchasePanel({ slug, productUrl, offer, offerUnavailable, referralCode }: {
  slug: string;
  productUrl: string;
  offer: PublicCommerceOffer | null;
  offerUnavailable: boolean;
  referralCode: string | null;
}) {
  const { user, token, loading: authLoading } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [purchase, setPurchase] = useState<PurchaseState>({ kind: 'idle' });
  const requestKey = useRef<string | null>(null);

  const [link, setLink] = useState<{ kind: 'idle' | 'working' } | { kind: 'ready'; url: string } | { kind: 'error'; message: string }>({ kind: 'idle' });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!referralCode) return;
    // 数えられなくても購入は止めない。
    void fetch('/api/marketplace/commerce/referral-visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: referralCode }),
      cache: 'no-store',
    }).catch(() => undefined);
  }, [referralCode]);

  if (offerUnavailable) {
    return (
      <section aria-label="購入" className="border-b border-term-line px-3 py-3">
        <p role="alert" className="text-sm text-term-danger">購入情報を読み込めませんでした。時間をおいて再読み込みしてください。</p>
      </section>
    );
  }
  if (!offer || offer.mode === 'off') {
    return (
      <section aria-label="購入" className="border-b border-term-line px-3 py-3">
        <p className="text-sm text-term-fg-strong">Make-Moneyでは購入できません</p>
        <p className="mt-1 text-xs leading-5 text-term-label">申込み・決済は掲載者のサイトで行います。上の「サービスを見る」から進んでください。</p>
      </section>
    );
  }
  if (offer.mode === 'stripe_test') {
    return (
      <section aria-label="購入" className="border-b border-term-line px-3 py-3">
        <p className="text-sm text-term-fg-strong">{formatExactYen(offer.priceJpy)}</p>
        <p className="mt-1 text-xs leading-5 text-term-label">Stripeのテスト決済はまだ接続していません。購入は始められません。</p>
      </section>
    );
  }

  const buy = async () => {
    if (!token || purchase.kind === 'buying') return;
    requestKey.current ??= newRequestKey();
    setPurchase({ kind: 'buying' });
    try {
      const data = await commerceRequest<{ order: CommerceOrderView }>('/api/marketplace/commerce/orders', token, {
        method: 'POST',
        body: { slug, requestKey: requestKey.current, referralCode },
      });
      setPurchase({ kind: 'done', order: data.order });
    } catch (cause) {
      setPurchase({ kind: 'error', message: cause instanceof CommerceRequestError ? cause.message : '購入を記録できませんでした' });
    }
  };

  const makeLink = async () => {
    if (!token || link.kind === 'working') return;
    setLink({ kind: 'working' });
    try {
      const data = await commerceRequest<{ path: string }>('/api/marketplace/commerce/referral-links', token, { method: 'POST', body: { slug } });
      setLink({ kind: 'ready', url: `${window.location.origin}${data.path}` });
    } catch (cause) {
      setLink({ kind: 'error', message: cause instanceof CommerceRequestError ? cause.message : '紹介リンクを作れませんでした' });
    }
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const reward = referralRewardJpy(offer.priceJpy, Math.round(offer.referralRatePercent * 100));
  return (
    <>
      <section aria-label="購入" className="border-b border-term-line">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-2 border-b border-term-line-soft px-3 py-2">
          <span className="text-xs text-term-label">購入価格</span>
          <span className="term-num text-lg text-term-fg-strong">{formatExactYen(offer.priceJpy)}</span>
        </div>
        <div className="px-3 py-3">
          {purchase.kind === 'done' ? (
            <div role="status" aria-label="購入の記録">
              <p className="text-sm text-term-fg-strong">購入を記録しました（テスト購入・請求なし）</p>
              <dl className="mt-2 grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-1 text-sm">
                <dt className="text-xs text-term-label">商品</dt><dd className="text-term-fg">{purchase.order.title}</dd>
                <dt className="text-xs text-term-label">金額</dt><dd className="term-num text-term-fg">{formatExactYen(purchase.order.priceJpy)}</dd>
                <dt className="text-xs text-term-label">注文番号</dt><dd className="term-num text-term-fg">{purchase.order.orderId.slice(0, 8)}</dd>
                <dt className="text-xs text-term-label">紹介</dt><dd className="text-term-fg">{purchase.order.referral.note === 'none' ? '紹介なし' : '紹介経由'}</dd>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={productUrl} target="_blank" rel="noopener noreferrer" className={`${BTN} border-term-accent text-term-accent hover:bg-term-head`}>サービスを開く</a>
                <Link href="/marketplace/activity" className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>取引の記録を見る</Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs leading-5 text-term-label">テスト購入です。実際の請求は行いません。{referralCode && '紹介リンクから開いています。'}</p>
              {authLoading ? (
                <p role="status" className="flex items-center gap-2 text-sm text-term-label"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />ログイン状態を確認中…</p>
              ) : !user ? (
                <button type="button" onClick={() => setAuthOpen(true)} className={`${BTN} rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>ログインして購入</button>
              ) : (
                <button type="button" disabled={purchase.kind === 'buying' || !token} onClick={() => void buy()} className={`${BTN} rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
                  {purchase.kind === 'buying' && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                  {purchase.kind === 'buying' ? '記録中…' : `${formatExactYen(offer.priceJpy)}で購入（テスト）`}
                </button>
              )}
              {purchase.kind === 'error' && <p role="alert" className="mt-2 text-sm text-term-danger">{purchase.message}</p>}
            </>
          )}
        </div>
      </section>

      <section aria-label="紹介" className="border-b border-term-line px-3 py-3">
        <h2 className="text-sm font-semibold text-term-fg-strong">この掲載を紹介して報酬を得る</h2>
        {offer.referralRatePercent > 0 ? (
          <p className="mt-1 text-xs leading-5 text-term-label">
            紹介リンク経由で購入されると、購入額の <span className="term-num">{offer.referralRatePercent}%</span>（1件 <span className="term-num">{formatExactYen(reward)}</span>）が紹介報酬として記録されます。報酬の支払いは別の手続きで、ここでは記録だけを行います。
          </p>
        ) : (
          <p className="mt-1 text-xs leading-5 text-term-label">この掲載は紹介報酬が設定されていません。</p>
        )}
        {offer.referralRatePercent > 0 && (
          <div className="mt-2">
            {!user ? (
              <button type="button" onClick={() => setAuthOpen(true)} className={`${BTN} rounded-sm border-term-line text-term-fg hover:bg-term-head`}>ログインして紹介リンクを作る</button>
            ) : link.kind === 'ready' ? (
              <div className="grid gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-term-label">あなたの紹介リンク</span>
                  <input readOnly value={link.url} onFocus={(event) => event.currentTarget.select()} className="term-num w-full rounded-sm border border-term-line bg-term-bg px-3 py-2.5 text-sm text-term-fg-strong" />
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => void copy(link.url)} className={`${BTN} rounded-sm border-term-line text-term-fg hover:bg-term-head`}>リンクをコピー</button>
                  {copied && <span role="status" className="text-xs text-term-positive">コピーしました</span>}
                  <Link href="/marketplace/activity" className="inline-flex min-h-11 items-center text-sm text-term-sub hover:text-term-fg-strong lg:min-h-8">成果を見る</Link>
                </div>
              </div>
            ) : (
              <button type="button" disabled={link.kind === 'working' || !token} onClick={() => void makeLink()} className={`${BTN} rounded-sm border-term-line text-term-fg hover:bg-term-head`}>
                {link.kind === 'working' && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}紹介リンクを作る
              </button>
            )}
            {link.kind === 'error' && <p role="alert" className="mt-2 text-sm text-term-danger">{link.message}</p>}
          </div>
        )}
        {purchase.kind === 'done' && purchase.order.referral.note !== 'none' && (
          <p className="mt-2 text-xs text-term-dim">この購入：{REFERRAL_NOTE_LABELS[purchase.order.referral.note]}</p>
        )}
      </section>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} defaultMode="signin" />
    </>
  );
}
