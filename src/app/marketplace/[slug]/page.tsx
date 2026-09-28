import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { ArrowLeft, ExternalLink, Store } from 'lucide-react';

import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { getPublishedMarketplaceListing } from '@/lib/marketplace/listing-store';
import { MARKETPLACE_CATEGORY_LABELS } from '@/shared/marketplace-listing';

export const dynamic = 'force-dynamic';

const loadListing = cache((slug: string) => getPublishedMarketplaceListing(slug));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const listing = await loadListing(slug);
    if (!listing) return { title: '掲載サービス' };
    return {
      title: `${listing.title} | Make-Money`,
      description: listing.summary,
      openGraph: { title: listing.title, description: listing.summary, type: 'website' },
      twitter: { card: 'summary', title: listing.title, description: listing.summary },
    };
  } catch {
    return { title: 'Make-Money サービス紹介' };
  }
}

export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let listing = null;
  let unavailable = false;
  try {
    listing = await loadListing(slug);
  } catch {
    unavailable = true;
  }
  if (!listing && !unavailable) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-zinc-100">
      <GlobalHeader currentSection="MARKETPLACE" />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 sm:px-6">
        <Link href="/marketplace" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"><ArrowLeft className="h-3.5 w-3.5" />掲載サービス一覧</Link>
        {unavailable ? (
          <section className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-6 text-sm text-amber-100/80">この紹介ページを読み込めませんでした。時間をおいて再読み込みしてください。</section>
        ) : listing ? (
          <article className="mt-5 rounded-xl border border-white/[0.08] bg-[#0b0f15] p-5">
            <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-300"><Store className="h-4 w-4" />{MARKETPLACE_CATEGORY_LABELS[listing.category]}</div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{listing.title}</h1>
            {listing.sellerName && <p className="mt-2 text-xs text-zinc-500">掲載者: {listing.sellerName}</p>}
            <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{listing.summary}</p>
            {listing.priceLabel && (
              <div className="mt-5 rounded-lg border border-white/[0.08] bg-white/[0.025] p-4">
                <div className="text-[10px] text-zinc-500">価格</div>
                <div className="mt-1 text-sm font-semibold text-zinc-100">{listing.priceLabel}</div>
              </div>
            )}
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={listing.productUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300">
                サービスを見る <ExternalLink className="h-4 w-4" />
              </a>
              {listing.checkoutUrl && (
                <a href={listing.checkoutUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/[0.05]">
                  申込み・購入へ <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <p className="mt-6 border-t border-white/[0.07] pt-4 text-[11px] leading-5 text-zinc-600">掲載者が登録した情報です。申込み・決済は外部サイトで行います。</p>
          </article>
        ) : null}
      </main>
    </div>
  );
}
