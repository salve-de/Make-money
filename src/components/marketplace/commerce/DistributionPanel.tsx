'use client';

import { useEffect, useState } from 'react';
import { LoaderCircle } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import {
  DISTRIBUTION_LIMITS,
  type DistributionStatus,
  type DistributionTerms,
} from '@/shared/marketplace-distribution';
import { DistributionRequestError, distributionRequest } from './distribution-client';

const BTN = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-sm border px-4 text-sm disabled:opacity-50 lg:min-h-8 lg:px-3';
const INPUT = 'w-full rounded-sm border border-term-line bg-term-bg px-3 py-2.5 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent';

/**
 * 掲載者が、公開中の掲載を外部の SellRelay（紹介販売）へつなぐ欄。
 * 本番の接続（mode=live）がある時だけ出す。未接続・テスト用の偽接続では何も出さない（掲載と外部申込みだけ）。
 */
export function DistributionPanel({ listingId, title, summary }: { listingId: string; title: string; summary: string }) {
  const { user, token } = useAuth();
  const [status, setStatus] = useState<DistributionStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void distributionRequest(token, { query: { listingId }, signal: controller.signal })
      .then((value) => { if (!controller.signal.aborted) setStatus(value); })
      // 読み込めない時は欄を出さない（掲載と外部申込みは従来どおり動く）。
      .catch(() => { if (!controller.signal.aborted) setStatus(null); });
    return () => controller.abort();
  }, [token, listingId, user?.uid]);

  const act = async (body: unknown) => {
    if (!token || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      setStatus(await distributionRequest(token, { body }));
    } catch (cause) {
      setMessage(cause instanceof DistributionRequestError ? cause.message : '紹介販売の連携を確認できませんでした');
    } finally {
      setBusy(false);
    }
  };

  if (!token || !status || status.mode !== 'live') return null;
  return (
    <DistributionView
      status={status}
      busy={busy}
      message={message}
      title={title}
      summary={summary}
      onConnect={(terms) => void act({ action: 'connect', listingId, terms })}
      onReconcile={() => void act({ action: 'reconcile', listingId })}
    />
  );
}

export function DistributionView({ status, busy, message, title, summary, onConnect, onReconcile }: {
  status: DistributionStatus;
  busy: boolean;
  message: string | null;
  title: string;
  summary: string;
  onConnect: (terms: DistributionTerms) => void;
  onReconcile: () => void;
}) {
  return (
    <section aria-labelledby="distribution-panel-title" className="mt-6 max-w-3xl border-t border-term-line pt-3">
      <h2 id="distribution-panel-title" className="text-sm font-semibold text-term-fg-strong">SellRelayで紹介者に売ってもらう</h2>
      <p className="mt-1 text-xs leading-5 text-term-label">
        紹介者が専用リンクで客を送り、あなたの申込み・決済ページで売れた分の報酬をSellRelayが計算します。決済先と入金先は変わりません。
      </p>
      {status.state === 'account_required' && (
        <p className="mt-3 border border-term-line px-3 py-2 text-sm text-term-sub">SellRelayで同じ掲載者であることの確認が必要です。</p>
      )}
      {status.state === 'linked' && (
        <p role="status" className="mt-3 text-sm text-term-positive">SellRelayの商品と対応付けました。紹介リンクの発行には、SellRelay側での承認と紹介の許可が必要です。</p>
      )}
      {status.state === 'checking' && (
        <div className="mt-3 grid gap-2">
          <p role="status" className="text-sm text-term-sub">作成の結果を確認中です。商品を二重に作らないよう、SellRelay側の商品一覧と照合します。</p>
          <div><button type="button" disabled={busy} onClick={onReconcile} className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>
            {busy && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}照合をやり直す
          </button></div>
        </div>
      )}
      {status.state === 'unlinked' && status.canLink && <DistributionTermsForm title={title} summary={summary} busy={busy} onSubmit={onConnect} />}
      {message && <p role="alert" className="mt-3 text-sm text-term-danger">{message}</p>}
    </section>
  );
}

const CATEGORY_OPTIONS: [DistributionTerms['category'], string][] = [
  ['business', '業務'], ['productivity', '生産性'], ['design', 'デザイン'], ['development', '開発'], ['lifestyle', '暮らし'],
];
const PLATFORM_OPTIONS: [DistributionTerms['platforms'][number], string][] = [['web', 'Web'], ['ios', 'iOS'], ['android', 'Android']];

/** 入力から SellRelay の条件を作る。範囲外・空欄は null（送らない）。 */
export function termsFromForm(values: {
  name: string; tagline: string; description: string; audience: string; category: DistributionTerms['category'];
  platforms: DistributionTerms['platforms']; price: string; currency: DistributionTerms['currency']; ratePercent: string; months: string;
}): DistributionTerms | null {
  const price = Number(values.price);
  const minor = values.currency === 'USD' ? Math.round(price * 100) : price;
  const rate = Math.round(Number(values.ratePercent) * 100);
  const months = Number(values.months);
  const inRange = (value: number, [min, max]: readonly [number, number]) => Number.isSafeInteger(value) && value >= min && value <= max;
  const textOk = (value: string, [min, max]: readonly [number, number]) => value.trim().length >= min && value.length <= max;
  if (!textOk(values.name, DISTRIBUTION_LIMITS.name) || !textOk(values.tagline, DISTRIBUTION_LIMITS.tagline)
    || !textOk(values.description, DISTRIBUTION_LIMITS.description) || !textOk(values.audience, DISTRIBUTION_LIMITS.audience)
    || values.platforms.length === 0 || values.price.trim() === '' || !inRange(minor, DISTRIBUTION_LIMITS.price)
    || (values.currency === 'JPY' && !Number.isInteger(price))
    || values.ratePercent.trim() === '' || Math.abs(rate - Number(values.ratePercent) * 100) > 1e-6 || !inRange(rate, DISTRIBUTION_LIMITS.rateBp)
    || !inRange(months, DISTRIBUTION_LIMITS.months)) return null;
  return {
    name: values.name.trim(), tagline: values.tagline.trim(), description: values.description.trim(), audience: values.audience.trim(),
    category: values.category, platforms: [...values.platforms].sort(), price: minor, currency: values.currency, rate, months,
  };
}

function DistributionTermsForm({ title, summary, busy, onSubmit }: {
  title: string; summary: string; busy: boolean; onSubmit: (terms: DistributionTerms) => void;
}) {
  const [values, setValues] = useState({
    name: title.slice(0, DISTRIBUTION_LIMITS.name[1]),
    tagline: summary.slice(0, DISTRIBUTION_LIMITS.tagline[1]),
    description: summary,
    audience: '',
    category: 'business' as DistributionTerms['category'],
    platforms: ['web'] as DistributionTerms['platforms'],
    price: '',
    currency: 'JPY' as DistributionTerms['currency'],
    ratePercent: '20',
    months: '12',
  });
  const terms = termsFromForm(values);
  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) => setValues((current) => ({ ...current, [key]: value }));
  const text = (key: 'name' | 'tagline' | 'description' | 'audience', label: string, multiline = false) => {
    const [min, max] = DISTRIBUTION_LIMITS[key];
    return (
      <label className="block">
        <span className="mb-1 block text-xs text-term-label">{label}（{min}〜{max}文字）</span>
        {multiline
          ? <textarea value={values[key]} maxLength={max} rows={4} disabled={busy} onChange={(event) => set(key, event.target.value)} className={INPUT} />
          : <input value={values[key]} maxLength={max} disabled={busy} onChange={(event) => set(key, event.target.value)} className={INPUT} />}
      </label>
    );
  };

  return (
    <form className="mt-3 grid gap-4" onSubmit={(event) => { event.preventDefault(); if (terms && !busy) onSubmit(terms); }}>
      <p className="text-xs leading-5 text-term-label">SellRelayに商品の下書きを作ります。公開・販売開始はSellRelay側であなたが承認するまで行われません。</p>
      {text('name', '商品名')}
      {text('tagline', '一言の説明')}
      {text('description', '商品の説明', true)}
      {text('audience', '使う人')}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-term-label">分類</span>
          <select value={values.category} disabled={busy} onChange={(event) => set('category', event.target.value as DistributionTerms['category'])} className={INPUT}>
            {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <fieldset>
          <legend className="mb-1 block text-xs text-term-label">提供先</legend>
          <div className="flex flex-wrap gap-3">
            {PLATFORM_OPTIONS.map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-2 text-sm text-term-fg lg:min-h-8">
                <input type="checkbox" disabled={busy} checked={values.platforms.includes(value)} className="h-5 w-5 accent-[var(--term-accent)]"
                  onChange={(event) => set('platforms', event.target.checked ? [...values.platforms, value] : values.platforms.filter((item) => item !== value))} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-1 block text-xs text-term-label">通貨</span>
          <select value={values.currency} disabled={busy} onChange={(event) => set('currency', event.target.value as DistributionTerms['currency'])} className={INPUT}>
            <option value="JPY">円（JPY）</option>
            <option value="USD">米ドル（USD）</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-term-label">価格（{values.currency === 'JPY' ? '円・整数' : 'ドル・セントまで'}）</span>
          <input inputMode="decimal" value={values.price} disabled={busy} onChange={(event) => set('price', event.target.value.replace(/[^0-9.]/g, ''))} className={`${INPUT} term-num`} placeholder={values.currency === 'JPY' ? '例: 2980' : '例: 19.99'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-term-label">紹介報酬（売上に対する%・1〜80）</span>
          <input inputMode="decimal" value={values.ratePercent} disabled={busy} onChange={(event) => set('ratePercent', event.target.value.replace(/[^0-9.]/g, ''))} className={`${INPUT} term-num`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-term-label">報酬を払う期間（月・1〜24）</span>
          <input inputMode="numeric" value={values.months} disabled={busy} onChange={(event) => set('months', event.target.value.replace(/[^0-9]/g, ''))} className={`${INPUT} term-num`} />
        </label>
      </div>
      {!terms && <p className="text-xs text-term-dim">すべての項目を範囲内で入れると作成できます。</p>}
      <div>
        <button type="submit" disabled={busy || !terms} className={`${BTN} border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
          {busy && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}SellRelayに下書きを作る
        </button>
      </div>
    </form>
  );
}
