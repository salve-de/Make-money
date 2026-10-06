import Link from 'next/link';
import { notFound } from 'next/navigation';

import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { listPublishedMarketplaceListings, parseMarketplaceOffset, MARKETPLACE_PAGE_SIZE } from '@/lib/marketplace/listing-store';
import { MARKETPLACE_CATEGORY_LABELS } from '@/shared/marketplace-listing';

export const dynamic = 'force-dynamic';

export default async function MarketplacePage({ searchParams }: {
  searchParams: Promise<{ offset?: string | string[] }>;
}) {
  let offset: number;
  try { offset = parseMarketplaceOffset((await searchParams).offset); } catch { notFound(); }
  let listings = null;
  let nextOffset: number | null = null;
  let unavailable = false;
  try {
    const page = await listPublishedMarketplaceListings(MARKETPLACE_PAGE_SIZE, offset);
    listings = page.listings;
    nextOffset = page.nextOffset;
  } catch {
    unavailable = true;
  }

  const BTN = 'inline-flex min-h-11 items-center border px-4 text-sm lg:min-h-8 lg:px-3';
  return (
    <div className="flex term-page flex-col bg-term-bg text-term-fg">
      <GlobalHeader currentSection="MARKETPLACE" />
      <main className="w-full flex-1">
        {/* スマホはヘッダーに「市場」が出ているので、見出し帯ごと出さない（.term-panel-title の display が効くため外側で隠す） */}
        <div className="hidden sm:block">
          <div className="term-panel-title">
            <span className="term-panel-name max-lg:hidden">市場</span>
            <span>掲載者が登録したサービス。申込み・決済は各サイトで行います。</span>
          </div>
        </div>
        <h1 className="sr-only">市場</h1>
        <div className="flex flex-wrap gap-2 border-b border-term-line px-3 py-2">
          <Link href="/marketplace/new" className={`${BTN} border-term-accent text-term-accent hover:bg-term-head`}>出品する</Link>
          <Link href="/build" prefetch={false} className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>作る</Link>
        </div>

        {unavailable ? (
          <p role="alert" className="px-3 py-4 text-sm text-term-danger">掲載サービスを読み込めませんでした。時間をおいて再読み込みしてください。</p>
        ) : listings?.length === 0 ? (
          <section className="px-3 py-4 text-sm">
            <p className="text-term-fg-strong">{offset > 0 ? 'このページに掲載サービスはありません' : 'まだ掲載サービスはありません'}</p>
            <p className="mt-1 text-term-sub">サービスを作ったら「出品する」から紹介ページを作れます。</p>
          </section>
        ) : (
          <section aria-label="掲載サービスの一覧">
            <div className="hidden h-[26px] grid-cols-[160px_minmax(0,1.2fr)_minmax(0,2fr)_180px_40px] items-center gap-3 border-b border-term-line bg-term-head px-3 text-xs text-term-label lg:grid">
              <span>カテゴリ</span><span>サービス名</span><span>内容</span><span>掲載者</span><span />
            </div>
            {listings?.map((listing, index) => (
              <Link key={listing.slug} href={`/marketplace/${encodeURIComponent(listing.slug)}`} className={`grid min-h-11 grid-cols-1 gap-x-3 border-b border-term-line-soft px-3 py-2 text-sm hover:bg-term-select lg:min-h-[29px] lg:grid-cols-[160px_minmax(0,1.2fr)_minmax(0,2fr)_180px_40px] lg:items-center lg:py-1 ${index % 2 ? 'bg-term-row-alt' : ''}`}>
                <span className="text-xs text-term-label lg:text-sm lg:text-term-muted">{MARKETPLACE_CATEGORY_LABELS[listing.category]}</span>
                <span className="truncate text-term-fg-strong">{listing.title}</span>
                <span className="line-clamp-2 text-term-sub lg:truncate">{listing.summary}</span>
                <span className="truncate text-xs text-term-label lg:text-sm">{listing.sellerName || '掲載者名なし'}</span>
                <span aria-hidden="true" className="hidden text-right text-term-label lg:block">→</span>
              </Link>
            ))}
          </section>
        )}
        {!unavailable && (offset > 0 || nextOffset !== null) && (
          <nav aria-label="掲載サービスのページ" className="flex items-center justify-between border-t border-term-line px-3 py-2 text-sm">
            {offset > 0 ? <Link href={`/marketplace?offset=${Math.max(0, offset - MARKETPLACE_PAGE_SIZE)}`} className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>前へ</Link> : <span />}
            {nextOffset !== null && <Link href={`/marketplace?offset=${nextOffset}`} className={`${BTN} border-term-line text-term-fg hover:bg-term-head`}>次へ</Link>}
          </nav>
        )}
        <details className="border-t border-term-line px-3 py-2 text-xs text-term-label"><summary className="min-h-11 cursor-pointer lg:min-h-6">掲載情報について</summary><p className="mt-2">掲載者が登録した内容です。申込み・決済は各サービスのサイトで行います。</p></details>
      </main>
    </div>
  );
}
