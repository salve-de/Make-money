'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ExternalLink, LoaderCircle } from 'lucide-react';

import { useAuth } from '@/context/AuthContext';
import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import {
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_CATEGORY_LABELS,
  type MarketplaceCategory,
  type MarketplaceListingStatus,
  type MarketplaceListingSource,
  type OwnedMarketplaceListing,
} from '@/shared/marketplace-listing';

interface ListingForm {
  title: string;
  summary: string;
  category: MarketplaceCategory;
  productUrl: string;
  checkoutUrl: string;
  priceLabel: string;
  sellerName: string;
}

const EMPTY_FORM: ListingForm = {
  title: '',
  summary: '',
  category: 'other',
  productUrl: '',
  checkoutUrl: '',
  priceLabel: '',
  sellerName: '',
};

async function responseJson(response: Response): Promise<Record<string, unknown>> {
  try {
    const value: unknown = await response.json();
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export function ListingEditor(props: { sessionId: string; listingId: string }) {
  const { user } = useAuth();
  return <ListingEditorForm key={`${user?.uid ?? 'anonymous'}:${props.sessionId}:${props.listingId}`} {...props} />;
}

function ListingEditorForm({ sessionId, listingId: initialListingId }: { sessionId: string; listingId: string }) {
  const router = useRouter();
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const { user, token, loading: authLoading, signInWithGoogle } = useAuth();
  const [form, setForm] = useState<ListingForm>(EMPTY_FORM);
  const [sourceType, setSourceType] = useState<MarketplaceListingSource>(sessionId ? 'builder' : 'external');
  const [buildSessionId, setBuildSessionId] = useState<string | null>(sessionId || null);
  const [status, setStatus] = useState<MarketplaceListingStatus>('draft');
  const [slug, setSlug] = useState<string | null>(null);
  const [listingId, setListingId] = useState(initialListingId || '');
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !token) return;
    const controller = new AbortController();
    void (async () => {
      setLoading(true);
      setLoadFailed(false);
      setError(null);
      try {
        const query = new URLSearchParams();
        if (sessionId) query.set('sessionId', sessionId);
        if (initialListingId) query.set('listingId', initialListingId);
        const response = await fetch(`/api/marketplace/listings?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await responseJson(response);
        if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : '掲載情報を読み込めませんでした');
        const listing = data.listing as OwnedMarketplaceListing | null;
        if (listing) {
          setForm({
            title: listing.title,
            summary: listing.summary,
            category: listing.category,
            productUrl: listing.productUrl,
            checkoutUrl: listing.checkoutUrl || '',
            priceLabel: listing.priceLabel,
            sellerName: listing.sellerName,
          });
          setSourceType(listing.sourceType);
          setBuildSessionId(listing.sessionId);
          setStatus(listing.status);
          setSlug(listing.slug);
          setListingId(listing.listingId);
        } else if (typeof data.defaultTitle === 'string') {
          setForm((current) => ({ ...current, title: data.defaultTitle as string }));
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setLoadFailed(true);
          setError(cause instanceof Error ? cause.message : '掲載情報を読み込めませんでした');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [authLoading, token, sessionId, initialListingId, retry]);

  const save = async (nextStatus: MarketplaceListingStatus) => {
    if (!token || saving || loading || loadFailed) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/marketplace/listings', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          listingId: listingId || null,
          sessionId: buildSessionId,
          sourceType,
          status: nextStatus,
        }),
      });
      const data = await responseJson(response);
      if (!active.current) return;
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : '掲載情報を保存できませんでした');
      const listing = data.listing as OwnedMarketplaceListing;
      setForm({
        title: listing.title,
        summary: listing.summary,
        category: listing.category,
        productUrl: listing.productUrl,
        checkoutUrl: listing.checkoutUrl || '',
        priceLabel: listing.priceLabel,
        sellerName: listing.sellerName,
      });
      setStatus(listing.status);
      setSlug(listing.slug);
      setListingId(listing.listingId);
      if (!sessionId && !initialListingId) {
        router.replace(`/marketplace/new?listingId=${encodeURIComponent(listing.listingId)}`);
      }
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : '掲載情報を保存できませんでした');
    } finally {
      if (active.current) setSaving(false);
    }
  };

  const update = <K extends keyof ListingForm>(key: K, value: ListingForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const BTN = 'inline-flex min-h-11 items-center justify-center border px-4 text-sm disabled:opacity-50 lg:min-h-8 lg:px-3';
  return (
    <div className="flex min-h-screen flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="MARKETPLACE" />
      <main className="w-full flex-1">
        <div className="term-panel-title">
          <span className="term-panel-name">サービスを掲載</span>
          <Link href="/marketplace" className="inline-flex min-h-6 items-center text-term-sub hover:text-term-fg-strong">掲載サービス一覧へ戻る</Link>
        </div>
        <h1 className="sr-only">サービスを掲載</h1>

        {!authLoading && !user ? (
          <section className="px-3 py-4 text-sm">
            <p className="text-term-fg-strong">ログインすると掲載できます</p>
            <p className="mt-1 text-term-sub">掲載者本人のサービスとして登録するため、ログインしてください。</p>
            <button type="button" onClick={() => void signInWithGoogle()} className={`${BTN} mt-3 rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
              Googleでログイン
            </button>
          </section>
        ) : authLoading || loading ? (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-term-label"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />掲載情報を読み込み中…</div>
        ) : loadFailed ? (
          <section className="px-3 py-4 text-sm">
            <p role="alert" className="text-term-danger">{error}</p>
            <button type="button" className={`${BTN} mt-2 rounded-sm border-term-line text-term-fg hover:bg-term-head`} onClick={() => setRetry((value) => value + 1)}>再読み込み</button>
          </section>
        ) : (
          <section className="max-w-3xl px-3 py-3">
            <div className="grid gap-4">
              <Field label="サービス名" value={form.title} maxLength={100} onChange={(value) => update('title', value)} required />
              <label className="block">
                <span className="mb-1 block text-xs text-term-label">誰の何を解決するサービスか</span>
                <textarea value={form.summary} maxLength={240} onChange={(event) => update('summary', event.target.value)} rows={4} className={inputClass} placeholder="例: 小規模工場向けに、紙図面を検索できるデータへ変換するサービス" />
                <span className="term-num mt-1 block text-right text-xs text-term-dim">{form.summary.length}/240</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-term-label">カテゴリ</span>
                <select value={form.category} onChange={(event) => update('category', event.target.value as MarketplaceCategory)} className={inputClass}>
                  {MARKETPLACE_CATEGORIES.map((category) => <option key={category} value={category}>{MARKETPLACE_CATEGORY_LABELS[category]}</option>)}
                </select>
              </label>
              <Field label="公開したサービスのURL（HTTPS）" value={form.productUrl} maxLength={2048} onChange={(value) => update('productUrl', value)} placeholder="https://your-service.example" required={status === 'published'} />
              <Field label="購入・申込URL（任意）" value={form.checkoutUrl} maxLength={2048} onChange={(value) => update('checkoutUrl', value)} placeholder="https://checkout.example" />
              <Field label="価格表示（任意）" value={form.priceLabel} maxLength={80} onChange={(value) => update('priceLabel', value)} placeholder="例: 月額 2,980円 / 1件ごとに見積" />
              <Field label="掲載者名（任意）" value={form.sellerName} maxLength={50} onChange={(value) => update('sellerName', value)} placeholder="空欄なら名前を公開しません" />
            </div>
            <p className="mt-4 text-xs text-term-label">申込み・決済は登録した外部サイトで行います。</p>
            {error && <p role="alert" className="mt-3 text-sm text-term-danger">{error}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" disabled={saving} onClick={() => void save('published')} className={`${BTN} gap-2 rounded-sm border-term-accent bg-transparent text-term-accent hover:bg-term-head`}>
                {saving && <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />}
                {status === 'published' ? '公開内容を更新' : 'Make-Moneyに公開'}
              </button>
              <button type="button" disabled={saving} onClick={() => void save('draft')} className={`${BTN} rounded-sm border-term-line bg-transparent text-term-fg hover:bg-term-head`}>
                {status === 'published' ? '非公開にする' : '下書きを保存'}
              </button>
              {slug && status === 'published' && (
                <Link href={`/marketplace/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-term-sub hover:text-term-fg-strong lg:min-h-8">
                  公開ページを見る <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

const inputClass = 'w-full rounded-sm border border-term-line bg-term-bg px-3 py-2.5 text-sm text-term-fg-strong outline-none placeholder:text-term-dim focus:border-term-accent';

function Field({
  label,
  value,
  maxLength,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  maxLength: number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-term-label">{label}{required && <span className="ml-1 text-term-danger">*</span>}</span>
      <input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className={inputClass} />
    </label>
  );
}
