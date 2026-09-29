import { describe, expect, it } from 'vitest';

import {
  BUSINESS_SALE_CATEGORIES,
  BUSINESS_SALE_CATEGORY_LABELS,
  BUSINESS_SALE_NOTICE,
  calcPriceMultiple,
  formatPriceMultiple,
} from './business-sale';
import { MARKETPLACE_CATEGORIES } from './marketplace-listing';

describe('calcPriceMultiple', () => {
  it('divides the asking price by twelve months of profit', () => {
    expect(calcPriceMultiple(3_000_000, 100_000)).toBe(2.5);
    expect(calcPriceMultiple(1_200_000, 100_000)).toBe(1);
    expect(calcPriceMultiple(0, 100_000)).toBe(0);
  });

  it('shows no multiple when profit is zero or negative', () => {
    expect(calcPriceMultiple(3_000_000, 0)).toBeNull();
    expect(calcPriceMultiple(3_000_000, -50_000)).toBeNull();
  });

  it('shows no multiple for invalid numbers', () => {
    expect(calcPriceMultiple(Number.NaN, 100_000)).toBeNull();
    expect(calcPriceMultiple(3_000_000, Number.POSITIVE_INFINITY)).toBeNull();
    expect(calcPriceMultiple(-1, 100_000)).toBeNull();
  });
});

describe('formatPriceMultiple', () => {
  it('uses one decimal below 100x and whole numbers above', () => {
    expect(formatPriceMultiple(2.5)).toBe('2.5倍');
    expect(formatPriceMultiple(3)).toBe('3.0倍');
    expect(formatPriceMultiple(0.04)).toBe('0.0倍');
    expect(formatPriceMultiple(99.94)).toBe('99.9倍');
    expect(formatPriceMultiple(123.4)).toBe('123倍');
    expect(formatPriceMultiple(1234.5)).toBe('1,235倍');
  });
});

describe('business sale categories', () => {
  it('extends the product categories with ecommerce, content, saas and service', () => {
    expect([...BUSINESS_SALE_CATEGORIES]).toEqual([...MARKETPLACE_CATEGORIES, 'ecommerce', 'content', 'saas', 'service']);
    for (const category of BUSINESS_SALE_CATEGORIES) expect(BUSINESS_SALE_CATEGORY_LABELS[category]).toBeTruthy();
  });

  it('keeps the product marketplace categories unchanged', () => {
    expect([...MARKETPLACE_CATEGORIES]).toEqual(['ai_automation', 'business_tool', 'media', 'other']);
  });
});

describe('sale notice', () => {
  it('states the seller declares the figures and that Make-Money does not broker the sale', () => {
    expect(BUSINESS_SALE_NOTICE).toBe(
      '掲載内容は売り手の申告です。金鉱録は売買の仲介・価格の保証・契約の代行をしません。取引の前に、決済記録・契約書・税務書類を必ず確認してください。',
    );
    expect(BUSINESS_SALE_NOTICE).not.toContain('必ず儲か');
  });
});
