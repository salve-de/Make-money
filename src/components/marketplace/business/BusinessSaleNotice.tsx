import { BUSINESS_SALE_NOTICE } from '@/shared/business-sale';

/** 事業の売買の全ページの下部と、送信ボタンの直前に出す注意書き。文面は shared に一本化している。 */
export function BusinessSaleNotice({ className = '' }: { className?: string }) {
  return (
    <p role="note" className={`text-xs leading-5 text-term-sub ${className}`}>
      {BUSINESS_SALE_NOTICE}
    </p>
  );
}
