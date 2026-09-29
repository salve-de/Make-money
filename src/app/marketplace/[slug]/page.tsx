import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { ExternalLink } from 'lucide-react';

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

  const BTN = 'inline-flex min-h-11 items-center border px-4 text-sm lg:min-h-8 lg:px-3';
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="MARKETPLACE" />
      <main className="w-full flex-1">
        <div className="term-panel-title">
          <span className="term-panel-name">サービス紹介</span>
          <Link href="/marketplace" className="inline-flex min-h-11 items-center text-term-sub hover:text-term-fg-strong lg:min-h-6">掲載サービス一覧へ戻る</Link>
        </div>
        {unavailable ? (
          <p role="alert" className="px-3 py-4 text-sm text-term-danger">この紹介ページを読み込めませんでした。時間をおいて再読み込みしてください。</p>
        ) : listing ? (
          <article className="max-w-4xl">
            <header className="border-b border-term-line px-3 py-3">
              <p className="text-xs text-term-label">{MARKETPLACE_CATEGORY_LABELS[listing.category]}</p>
              <h1 className="mt-1 text-xl font-semibold text-term-fg-strong sm:text-2xl">{listing.title}</h1>
            </header>
            <dl className="grid grid-cols-1 border-b border-term-line sm:grid-cols-2">
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-2 border-b border-term-line-soft px-3 py-2 sm:border-r">
                <dt className="text-xs text-term-label">掲載者</dt>
                <dd className="text-sm text-term-fg">{listing.sellerName || '掲載者名なし'}</dd>
              </div>
              <div className="grid grid-cols-[110px_minmax(0,1fr)] items-baseline gap-2 border-b border-term-line-soft px-3 py-2">
                <dt className="text-xs text-term-label">価格</dt>
                <dd className={`text-sm ${listing.priceLabel ? 'term-num text-term-fg-strong' : 'text-term-dim'}`}>{listing.priceLabel || '未確認'}</dd>
              </div>
            </dl>
            <p className="whitespace-pre-wrap border-b border-term-line px-3 py-3 text-sm leading-7 text-term-fg">{listing.summary}</p>
            <div className="flex flex-wrap gap-2 px-3 py-3">
              <a href={listing.productUrl} target="_blank" rel="noopener noreferrer" className={`${BTN} border-term-accent text-term-accent hover:bg-term-head`}>
                サービスを見る<ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" />
              </a>
              {listing.checkoutUrl && (
                <a href={listing.checkoutUrl} target="_blank" rel="noopener noreferrer" className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>
                  申込み・購入へ<ExternalLink aria-hidden="true" className="ml-2 h-4 w-4" />
                </a>
              )}
            </div>
            <p className="border-t border-term-line px-3 py-3 text-xs leading-5 text-term-label">掲載者が登録した情報です。申込み・決済は外部サイトで行います。</p>
          </article>
        ) : null}
      </main>
    </div>
  );
}
