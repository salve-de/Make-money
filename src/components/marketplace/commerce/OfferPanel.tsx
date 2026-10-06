'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import {
  COMMERCE_PRICE_MAX_JPY,
  COMMERCE_PRICE_MIN_JPY,
  REFERRAL_RATE_MAX_PERCENT,
  formatExactYen,
  referralRewardJpy,
  type CommercePaymentMode,
  type OwnedCommerceOffer,
} from '@/shared/marketplace-commerce';
import { CommerceRequestError, commerceRequest } from './commerce-client';

const BTN = 'inline-flex min-h-11 items-center justify-center gap-2 border px-4 text-sm disabled:opacity-50 lg:min-h-8 lg:px-3';
const INPUT = 'w-full rounded-sm border border-term-line bg-term-bg px-3 py-2.5 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent';

/** 出品者が、掲載ごとに「Make-Money内で販売するか・価格・紹介報酬」を決める。掲載の保存後に使える。 */
export function OfferPanel({ listingId, published }: { listingId: string; published: boolean }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [mode, setMode] = useState<CommercePaymentMode>('test');
  const [saved, setSaved] = useState<OwnedCommerceOffer | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [price, setPrice] = useState('');
  const [rate, setRate] = useState('10');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await commerceRequest<{ offer: OwnedCommerceOffer | null; mode: CommercePaymentMode }>(
          `/api/marketplace/commerce/offer?listingId=${encodeURIComponent(listingId)}`, token, { signal: controller.signal });
        setMode(data.mode);
        setSaved(data.offer);
        if (data.offer) {
          setEnabled(data.offer.enabled);
          setPrice(String(data.offer.priceJpy));
          setRate(String(data.offer.referralRatePercent));
        }
      } catch (cause) {
        if (!controller.signal.aborted) setLoadError(cause instanceof Error ? cause.message : '販売条件を読み込めませんでした');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [token, listingId, retry]);

  const priceNumber = Number(price);
  const rateNumber = Number(rate);
  const priceOk = price.trim() !== '' && Number.isInteger(priceNumber) && priceNumber >= COMMERCE_PRICE_MIN_JPY && priceNumber <= COMMERCE_PRICE_MAX_JPY;
  const rateOk = rate.trim() !== '' && Number.isFinite(rateNumber) && rateNumber >= 0 && rateNumber <= REFERRAL_RATE_MAX_PERCENT;
  const example = priceOk && rateOk ? referralRewardJpy(priceNumber, Math.round(rateNumber * 100)) : null;

  const save = async () => {
    if (!token || saving || !priceOk || !rateOk) return;
    setSaving(true);
    setMessage(null);
    try {
      const data = await commerceRequest<{ offer: OwnedCommerceOffer }>('/api/marketplace/commerce/offer', token, {
        method: 'PUT',
        body: { listingId, enabled, priceJpy: priceNumber, referralRatePercent: rateNumber },
      });
      setSaved(data.offer);
      setMessage({ kind: 'ok', text: '販売条件を保存しました' });
    } catch (cause) {
      setMessage({ kind: 'error', text: cause instanceof CommerceRequestError ? cause.message : '販売条件を保存できませんでした' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="offer-panel-title" className="mt-6 max-w-3xl border-t border-term-line pt-3">
      <h2 id="offer-panel-title" className="text-sm font-semibold text-term-fg-strong">Make-Money内で販売する</h2>
      <p className="mt-1 text-xs leading-5 text-term-label">価格と紹介報酬を決めると、掲載ページに購入ボタンと紹介リンクが出ます。現在はテスト購入で、実際の請求は行いません。</p>
      {loading ? (
        <div role="status" className="mt-3 flex items-center gap-2 text-sm text-term-label"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />販売条件を読み込み中…</div>
      ) : loadError ? (
        <div className="mt-3 text-sm">
          <p role="alert" className="text-term-danger">{loadError}</p>
          <button type="button" className={`${BTN} mt-2 rounded-sm border-term-line text-term-fg hover:bg-term-head`} onClick={() => setRetry((value) => value + 1)}>再読み込み</button>
        </div>
      ) : (
        <div className="mt-3 grid gap-4">
          {mode === 'off' && <p className="border border-term-line px-3 py-2 text-sm text-term-sub">この環境では購入を受け付けていません。条件は保存できますが、購入ボタンは出ません。</p>}
          {!published && <p className="border border-term-line px-3 py-2 text-sm text-term-sub">掲載を公開すると、購入できるようになります。</p>}
          <label className="flex min-h-11 items-center gap-3 text-sm text-term-fg lg:min-h-8">
            <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} className="h-5 w-5 accent-[var(--term-accent)]" />
            Make-Money内で販売する
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-term-label">価格（円・税込）</span>
            <input inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value.replace(/[^0-9]/g, ''))} className={`${INPUT} term-num`} placeholder="例: 2980" aria-invalid={price !== '' && !priceOk} />
            <span className="mt-1 block text-xs text-term-dim">{formatExactYen(COMMERCE_PRICE_MIN_JPY)}から{formatExactYen(COMMERCE_PRICE_MAX_JPY)}までの整数</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-term-label">紹介報酬（購入額に対する%）</span>
            <input inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value.replace(/[^0-9.]/g, ''))} className={`${INPUT} term-num`} aria-invalid={rate !== '' && !rateOk} />
            <span className="mt-1 block text-xs text-term-dim">0%から{REFERRAL_RATE_MAX_PERCENT}%。0%なら紹介報酬なし。{example !== null && `この価格では1件あたり ${formatExactYen(example)}`}</span>
          </label>
          {message && <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${message.kind === 'error' ? 'text-term-danger' : 'text-term-positive'}`}>{message.text}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={saving || !priceOk || !rateOk} onClick={() => void save()} className={`${BTN} rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
              {saving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}販売条件を保存
            </button>
            {saved && <span className="text-xs text-term-label">保存済み：{formatExactYen(saved.priceJpy)}・紹介報酬 {saved.referralRatePercent}%・{saved.enabled ? '販売中' : '販売停止'}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
