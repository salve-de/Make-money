import type { ReactNode } from 'react';

import { BUSINESS_SALE_CATEGORY_LABELS, calcPriceMultiple, type PublicBusinessSaleListing } from '@/shared/business-sale';
import { formatJstDate } from './format';
import { PriceMultipleValue, RevenueBasisLabel } from './BusinessSaleValues';
import { YenValue } from './YenValue';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[104px_minmax(0,1fr)] items-baseline gap-2 border-b border-term-line-soft px-3 py-2 sm:odd:border-r sm:odd:border-term-line-soft">
      <dt className="text-xs text-term-label">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-term-fg">{children}</dd>
    </div>
  );
}

/** 万円表記に丸めた金額の横に、申告どおりの円の額を添える（丸めで桁を見誤らないため）。 */
function ExactYen({ jpy }: { jpy: number }) {
  return <span className="term-num ml-2 text-xs text-term-label">{jpy.toLocaleString('ja-JP')}円</span>;
}

function TextSection({ title, text }: { title: string; text: string }) {
  return (
    <section className="border-b border-term-line px-3 py-3">
      <h2 className="text-xs text-term-label">{title}</h2>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-term-fg">{text}</p>
    </section>
  );
}

/** 公開中の事業1件の内容。数字は売り手の申告で、根拠の欄にその区別を出す。 */
export function BusinessSaleDetail({ listing }: { listing: PublicBusinessSaleListing }) {
  const hasMultiple = calcPriceMultiple(listing.askingPriceJpy, listing.monthlyProfitJpy) !== null;
  return (
    <article className="max-w-4xl">
      <header className="border-b border-term-line px-3 py-3">
        <p className="text-xs text-term-label">{BUSINESS_SALE_CATEGORY_LABELS[listing.category]}</p>
        <h1 className="mt-1 break-words text-xl font-semibold text-term-fg-strong sm:text-2xl">{listing.title}</h1>
      </header>
      <dl className="grid grid-cols-1 border-b border-term-line sm:grid-cols-2">
        <Fact label="開始年"><span className="term-num">{listing.establishedYear}</span>年</Fact>
        <Fact label="掲載者">{listing.sellerName || <span className="text-term-dim">掲載者名なし</span>}</Fact>
        <Fact label="月商"><YenValue jpy={listing.monthlyRevenueJpy} className="text-term-fg-strong" /><ExactYen jpy={listing.monthlyRevenueJpy} /></Fact>
        <Fact label="月の利益">
          <YenValue jpy={listing.monthlyProfitJpy} className="text-term-fg-strong" />
          <ExactYen jpy={listing.monthlyProfitJpy} />
          {listing.monthlyProfitJpy === 0 && <span className="ml-2 text-xs text-term-label">赤字・利益なしを含む</span>}
        </Fact>
        <Fact label="希望価格"><YenValue jpy={listing.askingPriceJpy} className="text-term-fg-strong" /><ExactYen jpy={listing.askingPriceJpy} /></Fact>
        <Fact label="倍率">
          <PriceMultipleValue askingPriceJpy={listing.askingPriceJpy} monthlyProfitJpy={listing.monthlyProfitJpy} />
          <span className="ml-2 text-xs text-term-label">
            {hasMultiple ? '希望価格 ÷ (月の利益 × 12)' : '月の利益が0円のため出しません'}
          </span>
        </Fact>
        <Fact label="売上の根拠">
          <RevenueBasisLabel basis={listing.revenueBasis} />
          {listing.revenueBasis === 'self_reported' && <span className="ml-2 text-xs text-term-label">数字は売り手の申告です</span>}
        </Fact>
        <Fact label="更新日"><span className="term-num">{formatJstDate(listing.updatedAt)}</span></Fact>
      </dl>
      <TextSection title="事業の説明" text={listing.summary} />
      <TextSection title="手放す理由" text={listing.reasonForSale} />
      <TextSection title="引き渡すもの" text={listing.includedAssets} />
    </article>
  );
}
