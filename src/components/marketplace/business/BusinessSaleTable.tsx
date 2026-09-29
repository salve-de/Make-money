import Link from 'next/link';

import { BUSINESS_SALE_CATEGORY_LABELS, type PublicBusinessSaleSummary } from '@/shared/business-sale';
import { PriceMultipleValue, RevenueBasisLabel } from './BusinessSaleValues';
import { YenValue } from './YenValue';

/** PC は8列の表、スマホは3段（事業名／区分・開始年・根拠／数字4つ）に並べ替わる。横にはみ出さない。 */
const GRID = 'lg:grid lg:grid-cols-[minmax(0,1fr)_128px_56px_92px_92px_104px_60px_116px] lg:items-center lg:gap-3';
const MOBILE_LABEL = 'text-xs text-term-label lg:hidden';

/** 公開中の事業の一覧。連絡先や売り手の識別子は、この部品に渡る型にそもそも含まれない。 */
export function BusinessSaleTable({ listings }: { listings: PublicBusinessSaleSummary[] }) {
  return (
    <section aria-label="売り出し中の事業の一覧">
      <div className={`hidden h-[26px] border-b border-term-line bg-term-head px-3 text-xs text-term-label ${GRID}`}>
        <span>事業名</span>
        <span>区分</span>
        <span className="text-right">開始年</span>
        <span className="text-right">月商</span>
        <span className="text-right">月の利益</span>
        <span className="text-right">希望価格</span>
        <span className="text-right" title="希望価格 ÷ (月の利益 × 12)">倍率</span>
        <span>売上の根拠</span>
      </div>
      {listings.map((item, index) => (
        <Link
          key={item.slug}
          href={`/marketplace/businesses/${encodeURIComponent(item.slug)}`}
          className={`block min-h-11 border-b border-term-line-soft px-3 py-2 hover:bg-term-select lg:min-h-[29px] lg:py-1 ${GRID} ${index % 2 ? 'bg-term-row-alt' : ''}`}
        >
          <span className="block truncate text-sm text-term-fg-strong lg:order-1 lg:text-[13px]">{item.title}</span>
          <span className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-xs text-term-label lg:contents">
            <span className="lg:order-2 lg:truncate lg:text-[13px] lg:text-term-muted">{BUSINESS_SALE_CATEGORY_LABELS[item.category]}</span>
            <span className="term-num lg:order-3 lg:text-right lg:text-[13px] lg:text-term-muted">
              {item.establishedYear}
              <span className="lg:hidden">年開始</span>
            </span>
            <RevenueBasisLabel basis={item.revenueBasis} className="lg:order-8 lg:truncate lg:text-[13px]" />
          </span>
          <span className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-sm sm:grid-cols-4 lg:contents lg:text-[13px]">
            <span className="lg:order-4 lg:text-right">
              <span className={MOBILE_LABEL}>月商 </span>
              <YenValue jpy={item.monthlyRevenueJpy} className="text-term-fg" />
            </span>
            <span className="lg:order-5 lg:text-right">
              <span className={MOBILE_LABEL}>月の利益 </span>
              <YenValue jpy={item.monthlyProfitJpy} className="text-term-fg" />
            </span>
            <span className="lg:order-6 lg:text-right">
              <span className={MOBILE_LABEL}>希望価格 </span>
              <YenValue jpy={item.askingPriceJpy} className="text-term-fg-strong" />
            </span>
            <span className="lg:order-7 lg:text-right">
              <span className={MOBILE_LABEL}>倍率 </span>
              <PriceMultipleValue askingPriceJpy={item.askingPriceJpy} monthlyProfitJpy={item.monthlyProfitJpy} />
            </span>
          </span>
        </Link>
      ))}
    </section>
  );
}
