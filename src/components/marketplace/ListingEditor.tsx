'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ExternalLink, LoaderCircle, Store } from 'lucide-react';

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
      setError(cause instanceof Error ? cause.message : '掲載情報を保存できませんでした');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof ListingForm>(key: K, value: ListingForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-zinc-100">
      <GlobalHeader currentSection="MARKETPLACE" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6">
        <Link href="/marketplace" className="text-xs text-zinc-500 hover:text-zinc-300">← 掲載サービス一覧</Link>
        <div className="mt-3 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg border border-emerald-500/20 bg-emerald-500/[0.07]">
            <Store className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="mt-1 text-xl font-semibold">サービスを掲載</h1>
          </div>
        </div>

        {!authLoading && !user ? (
          <section className="mt-8 rounded-xl border border-white/[0.08] bg-[#0d1117] p-6">
            <p className="text-sm text-zinc-300">掲載者本人のサービスとして登録するため、ログインしてください。</p>
            <button type="button" onClick={() => void signInWithGoogle()} className="mt-4 rounded-md bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200">
              Googleでログイン
            </button>
          </section>
        ) : authLoading || loading ? (
          <div className="mt-10 flex items-center gap-2 text-sm text-zinc-500"><LoaderCircle className="h-4 w-4 animate-spin" />掲載情報を読み込み中…</div>
        ) : loadFailed ? (
          <section className="mt-4 text-sm">
            <p role="alert" className="text-rose-300">{error}</p>
            <button type="button" className="mt-2 min-h-11 px-3 text-zinc-200" onClick={() => setRetry((value) => value + 1)}>再読み込み</button>
          </section>
        ) : (
          <>
            <section className="mt-6 rounded-xl border border-white/[0.08] bg-[#0d1117] p-5 sm:p-6">
              <div className="mt-5 grid gap-4">
                <Field label="サービス名" value={form.title} maxLength={100} onChange={(value) => update('title', value)} required />
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-300">誰の何を解決するサービスか</span>
                  <textarea value={form.summary} maxLength={240} onChange={(event) => update('summary', event.target.value)} rows={4} className={inputClass} placeholder="例: 小規模工場向けに、紙図面を検索できるデータへ変換するサービス" />
                  <span className="mt-1 block text-right text-[10px] text-zinc-600">{form.summary.length}/240</span>
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-300">カテゴリ</span>
                  <select value={form.category} onChange={(event) => update('category', event.target.value as MarketplaceCategory)} className={inputClass}>
                    {MARKETPLACE_CATEGORIES.map((category) => <option key={category} value={category}>{MARKETPLACE_CATEGORY_LABELS[category]}</option>)}
                  </select>
                </label>
                <Field label="公開したサービスのURL（HTTPS）" value={form.productUrl} maxLength={2048} onChange={(value) => update('productUrl', value)} placeholder="https://your-service.example" required={status === 'published'} />
                <Field label="購入・申込URL（任意）" value={form.checkoutUrl} maxLength={2048} onChange={(value) => update('checkoutUrl', value)} placeholder="https://checkout.example" />
                <Field label="価格表示（任意）" value={form.priceLabel} maxLength={80} onChange={(value) => update('priceLabel', value)} placeholder="例: 月額 2,980円 / 1件ごとに見積" />
                <Field label="掲載者名（任意）" value={form.sellerName} maxLength={50} onChange={(value) => update('sellerName', value)} placeholder="空欄なら名前を公開しません" />
              </div>
              <p className="mt-4 text-xs text-zinc-400">申込み・決済は登録した外部サイトで行います。</p>
              {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button type="button" disabled={saving} onClick={() => void save('published')} className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 disabled:opacity-50">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                  {status === 'published' ? '公開内容を更新' : 'Make-Moneyに公開'}
                </button>
                <button type="button" disabled={saving} onClick={() => void save('draft')} className="rounded-md border border-white/[0.12] px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.05] disabled:opacity-50">
                  {status === 'published' ? '非公開にする' : '下書きを保存'}
                </button>
                {slug && status === 'published' && (
                  <Link href={`/marketplace/${encodeURIComponent(slug)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white">
                    公開ページを見る <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const inputClass = 'w-full rounded-md border border-white/[0.1] bg-[#080a0f] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-400/50';

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
      <span className="mb-1.5 block text-xs font-medium text-zinc-300">{label}{required && <span className="ml-1 text-rose-300">*</span>}</span>
      <input value={value} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} className={inputClass} />
    </label>
  );
}
