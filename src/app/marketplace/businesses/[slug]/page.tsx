import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';

import { BusinessSaleDetail } from '@/components/marketplace/business/BusinessSaleDetail';
import { BusinessSalePage } from '@/components/marketplace/business/BusinessSalePage';
import { InquiryForm } from '@/components/marketplace/business/InquiryForm';
import { getPublishedBusinessSaleBySlug } from '@/lib/marketplace/business-store';
import { BUSINESS_SALE_SLUG_MAX_LENGTH, BUSINESS_SALE_SLUG_PATTERN } from '@/shared/business-sale';

export const dynamic = 'force-dynamic';

const validSlug = (slug: string) => slug.length <= BUSINESS_SALE_SLUG_MAX_LENGTH && BUSINESS_SALE_SLUG_PATTERN.test(slug);

const loadListing = cache((slug: string) => getPublishedBusinessSaleBySlug(slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!validSlug(slug)) return { title: '事業の売買 | Make Money' };
  try {
    const listing = await loadListing(slug);
    if (!listing) return { title: '事業の売買 | Make Money' };
    return {
      title: `${listing.title} | 事業の売買 | Make Money`,
      description: listing.summary.slice(0, 120),
    };
  } catch {
    return { title: '事業の売買 | Make Money' };
  }
}

export default async function BusinessSaleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!validSlug(slug)) notFound();
  let listing = null;
  let unavailable = false;
  try {
    listing = await loadListing(slug);
  } catch {
    unavailable = true;
  }
  if (!listing && !unavailable) notFound();

  return (
    <BusinessSalePage
      name="事業の詳細"
      aside={<Link href="/marketplace/businesses" className="inline-flex min-h-11 items-center text-term-sub hover:text-term-fg-strong lg:min-h-6">売り出し中の一覧へ戻る</Link>}
    >
      {unavailable ? (
        <p role="alert" className="px-3 py-4 text-sm text-term-danger">この事業のページを読み込めませんでした。時間をおいて再読み込みしてください。</p>
      ) : listing ? (
        <>
          <BusinessSaleDetail listing={listing} />
          <InquiryForm listingId={listing.id} />
        </>
      ) : null}
    </BusinessSalePage>
  );
}
