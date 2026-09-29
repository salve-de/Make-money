import {
  BUSINESS_SALE_REVENUE_BASIS_LABELS,
  calcPriceMultiple,
  formatPriceMultiple,
  type BusinessSaleRevenueBasis,
} from '@/shared/business-sale';

/**
 * 売上の根拠。「Stripeで確認済み」は売上検証の仕組みが付けたものだけ。
 * 色の丸印は使わず文字で出す（端末型UIの状態表示）。
 */
export function RevenueBasisLabel({ basis, className = '' }: { basis: BusinessSaleRevenueBasis; className?: string }) {
  const verified = basis === 'stripe_verified';
  return (
    <span className={`${verified ? 'text-term-positive' : 'text-term-muted'} ${className}`}>
      {BUSINESS_SALE_REVENUE_BASIS_LABELS[basis]}
    </span>
  );
}

/** 希望価格 ÷ (月の利益 × 12)。月の利益が0円以下のときは倍率を出さず、理由を添えて「—」にする。 */
export function PriceMultipleValue({ askingPriceJpy, monthlyProfitJpy, className = '' }: {
  askingPriceJpy: number;
  monthlyProfitJpy: number;
  className?: string;
}) {
  const multiple = calcPriceMultiple(askingPriceJpy, monthlyProfitJpy);
  if (multiple === null) {
    return <span className={`text-term-dim ${className}`} title="月の利益が0円以下のため、倍率は出しません">—</span>;
  }
  return <span className={`term-num text-term-fg ${className}`}>{formatPriceMultiple(multiple)}</span>;
}
