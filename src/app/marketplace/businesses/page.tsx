import Link from 'next/link';
import type { Metadata } from 'next';

import { BusinessSaleFilters } from '@/components/marketplace/business/BusinessSaleFilters';
import { BusinessSalePage } from '@/components/marketplace/business/BusinessSalePage';
import { BusinessSaleTable } from '@/components/marketplace/business/BusinessSaleTable';
import { listPublishedBusinessSales } from '@/lib/marketplace/business-store';
import { BUSINESS_SALE_LIST_LIMIT, type PublicBusinessSaleSummary } from '@/shared/business-sale';
import { parseBusinessSaleFilter, type BusinessSaleFilter } from '@/shared/business-sale-input';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '事業の売買 | Make Money',
  description: '売り手が申告した月商・月の利益・希望価格を並べた、小さな事業の売り出し一覧。掲載内容は売り手の申告で、金鉱録は売買を仲介しません。',
};

const BTN = 'inline-flex min-h-11 items-center border px-4 text-sm lg:min-h-8 lg:px-3';

type SearchValue = string | string[] | undefined;
/** 同じ項目が2回以上付いた指定は無効として扱う。 */
const single = (value: SearchValue) => (typeof value === 'string' ? value : undefined);

/** URL の絞り込み指定を読む。不正な項目は、その項目だけ無視して残りは使う。 */
function readFilter(query: { category?: SearchValue; maxPrice?: SearchValue }): BusinessSaleFilter {
  const category = parseBusinessSaleFilter({ category: single(query.category) });
  const price = parseBusinessSaleFilter({ maxPrice: single(query.maxPrice) });
  return { ...(category.ok ? category.value : {}), ...(price.ok ? price.value : {}) };
}

export default async function BusinessSaleListPage({ searchParams }: {
  searchParams: Promise<{ category?: SearchValue; maxPrice?: SearchValue }>;
}) {
  const filter = readFilter(await searchParams);
  const filtered = filter.category !== undefined || filter.maxPrice !== undefined;
  let listings: PublicBusinessSaleSummary[] | null;
  try {
    listings = await listPublishedBusinessSales(filter);
  } catch {
    listings = null;
  }

  return (
    <BusinessSalePage
      name="事業の売買"
      srHeading="事業の売買"
      aside={<span className="hidden sm:inline">売り手が申告した数字を並べています。金鉱録は売買を仲介しません。</span>}
    >
      <div className="flex flex-wrap gap-2 border-b border-term-line px-3 py-2">
        <Link href="/marketplace/businesses/new" className={`${BTN} border-term-accent text-term-accent hover:bg-term-head`}>事業を掲載する</Link>
        <Link href="/marketplace/businesses/mine" className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>自分の掲載・問い合わせ</Link>
      </div>
      <BusinessSaleFilters category={filter.category} maxPrice={filter.maxPrice} />
      {listings === null ? (
        <p role="alert" className="px-3 py-4 text-sm text-term-danger">売り出し中の事業を読み込めませんでした。時間をおいて再読み込みしてください。</p>
      ) : listings.length === 0 ? (
        <section className="px-3 py-4 text-sm">
          <p className="text-term-fg-strong">{filtered ? '条件に合う事業はありません' : 'まだ売り出し中の事業はありません'}</p>
          <p className="mt-1 text-term-sub">
            {filtered ? '区分や価格の上限を変えてみてください。' : '事業を売りに出すときは、「事業を掲載する」から下書きを作ります。'}
          </p>
        </section>
      ) : (
        <>
          <BusinessSaleTable listings={listings} />
          <p className="px-3 py-2 text-xs text-term-label">
            <span className="term-num text-term-accent">{listings.length}</span>件
            {listings.length >= BUSINESS_SALE_LIST_LIMIT && <span className="ml-2">（新しい順に{BUSINESS_SALE_LIST_LIMIT}件まで表示）</span>}
          </p>
        </>
      )}
    </BusinessSalePage>
  );
}
