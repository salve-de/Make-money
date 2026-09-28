import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';

import { GlobalHeader } from '@/platform/components/navigation/GlobalHeader';
import { listPublishedMarketplaceListings } from '@/lib/marketplace/listing-store';
import { MARKETPLACE_CATEGORY_LABELS } from '@/shared/marketplace-listing';

export const dynamic = 'force-dynamic';

export default async function MarketplacePage() {
  let listings = null;
  let unavailable = false;
  try {
    listings = await listPublishedMarketplaceListings();
  } catch {
    unavailable = true;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#07080B] text-zinc-100">
      <GlobalHeader currentSection="MARKETPLACE" />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6 lg:px-8">
        <section className="border-b border-white/[0.14] pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold">サービス一覧</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/marketplace/new" className="inline-flex items-center gap-2 rounded-md bg-emerald-400 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-300">
                <Plus className="h-3.5 w-3.5" /> サービスを掲載
              </Link>
              <Link href="/discover" className="inline-flex items-center gap-2 rounded-md border border-white/[0.12] px-3 py-2 text-xs text-zinc-300 hover:bg-white/[0.05]">
                アイデアを探して作る <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {unavailable ? (
          <section className="mt-8 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-6 text-sm text-amber-100/80">掲載サービスを読み込めませんでした。時間をおいて再読み込みしてください。</section>
        ) : listings?.length === 0 ? (
          <section className="mt-8 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] p-8 text-center">
            <h2 className="text-sm font-semibold text-zinc-200">まだ掲載サービスはありません</h2>
            <p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-zinc-500">Builderでも外部ツールでも、サービスを公開したら掲載ページを作れます。</p>
          </section>
        ) : (
          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {listings?.map((listing) => (
              <Link key={listing.slug} href={`/marketplace/${encodeURIComponent(listing.slug)}`} className="group rounded-xl border border-white/[0.08] bg-[#0b0f15] p-5 transition-colors hover:border-emerald-400/25 hover:bg-white/[0.035]">
                <div className="text-[10px] font-mono text-emerald-300">{MARKETPLACE_CATEGORY_LABELS[listing.category]}</div>
                <h2 className="mt-2 line-clamp-2 text-base font-semibold text-zinc-100">{listing.title}</h2>
                <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-zinc-400">{listing.summary}</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/[0.07] pt-3 text-xs">
                  <span className="truncate text-zinc-500">{listing.sellerName || '掲載者名なし'}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-emerald-300 group-hover:text-emerald-200">詳細 <ArrowRight className="h-3.5 w-3.5" /></span>
                </div>
              </Link>
            ))}
          </section>
        )}
        <details className="mt-6 text-xs text-zinc-400"><summary className="cursor-pointer">掲載情報について</summary><p className="mt-2">掲載者が登録した内容です。申込み・決済は各サービスのサイトで行います。</p></details>
      </main>
    </div>
  );
}
