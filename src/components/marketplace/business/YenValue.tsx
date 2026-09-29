import { yenParts } from '@/platform/utils/moneyDisplay';

/** 金額を「数値（等幅）＋小さな単位」で出す。表記は moneyDisplay に一本化している。 */
export function YenValue({ jpy, className = '' }: { jpy: number; className?: string }) {
  const { value, unit } = yenParts(jpy);
  return (
    <span className={`term-num ${className}`}>
      {value}
      <span className="ml-0.5 text-xs text-term-label">{unit}</span>
    </span>
  );
}
