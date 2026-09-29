import Link from 'next/link';

import { formatYen } from '@/platform/utils/moneyDisplay';
import { BUSINESS_SALE_CATEGORIES, BUSINESS_SALE_CATEGORY_LABELS, type BusinessSaleCategory } from '@/shared/business-sale';

/** 希望価格の上限の選択肢（円）。API の ?maxPrice= と同じ単位。 */
export const PRICE_CEILING_STEPS = [500_000, 1_000_000, 3_000_000, 5_000_000, 10_000_000, 30_000_000, 100_000_000] as const;

const CONTROL = 'min-h-11 rounded-sm border border-term-line bg-term-bg px-2 text-sm text-term-fg-strong outline-none focus:border-term-accent lg:min-h-8 lg:text-[13px]';

/** 区分と希望価格の上限で絞り込む。GET のフォームなので、絞り込み結果も URL に残る。 */
export function BusinessSaleFilters({ category, maxPrice }: { category?: BusinessSaleCategory; maxPrice?: number }) {
  const custom = maxPrice !== undefined && !(PRICE_CEILING_STEPS as readonly number[]).includes(maxPrice);
  const steps = custom ? [...PRICE_CEILING_STEPS, maxPrice].sort((a, b) => a - b) : [...PRICE_CEILING_STEPS];
  return (
    <form method="get" action="/marketplace/businesses" className="flex flex-wrap items-end gap-x-3 gap-y-2 border-b border-term-line px-3 py-2">
      <label className="flex flex-col gap-1 text-xs text-term-label">
        区分
        <select name="category" defaultValue={category ?? ''} className={CONTROL}>
          <option value="">すべて</option>
          {BUSINESS_SALE_CATEGORIES.map((value) => (
            <option key={value} value={value}>{BUSINESS_SALE_CATEGORY_LABELS[value]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-term-label">
        希望価格の上限
        <select name="maxPrice" defaultValue={maxPrice === undefined ? '' : String(maxPrice)} className={CONTROL}>
          <option value="">上限なし</option>
          {steps.map((value) => (
            <option key={value} value={value}>{formatYen(value)}以下</option>
          ))}
        </select>
      </label>
      <button type="submit" className="inline-flex min-h-11 items-center border border-term-line bg-transparent px-4 text-sm text-term-fg hover:bg-term-head lg:min-h-8 lg:px-3">
        絞り込む
      </button>
      {(category !== undefined || maxPrice !== undefined) && (
        <Link href="/marketplace/businesses" className="inline-flex min-h-11 items-center text-sm text-term-sub hover:text-term-fg-strong lg:min-h-8">
          絞り込みを解除
        </Link>
      )}
    </form>
  );
}
