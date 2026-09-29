import { describe, expect, it } from 'vitest';
import type { PlanListing } from '@/lib/payments/plans';
import { formatRenewal, planPriceText, purchasablePlans, yearlyMonthlyEquivalent } from './billing-client';

const plans: PlanListing[] = [
  { id: 'founding-pass', name: '創刊版', priceJpy: 1980, interval: 'once', available: true },
  { id: 'pro-monthly', name: '月額', priceJpy: 980, interval: 'month', available: true },
  { id: 'pro-yearly', name: '年額', priceJpy: 9800, interval: 'year', available: false },
];

describe('billing display helpers', () => {
  it('lists only plans on sale, monthly first', () => {
    expect(purchasablePlans(plans).map((plan) => plan.id)).toEqual(['pro-monthly', 'founding-pass']);
    expect(purchasablePlans([{ ...plans[1], priceJpy: null }])).toEqual([]);
  });

  it('writes prices with the billing interval', () => {
    expect(planPriceText(plans[1])).toBe('¥980 / 月');
    expect(planPriceText(plans[2])).toBe('¥9,800 / 年');
    expect(planPriceText(plans[0])).toBe('¥1,980 買い切り');
    expect(yearlyMonthlyEquivalent(plans[2])).toBe('月あたり約¥817');
    expect(yearlyMonthlyEquivalent(plans[1])).toBeNull();
  });

  it('describes the next renewal or the last day after cancellation', () => {
    const renewsAt = Date.UTC(2026, 9, 29, 3, 0, 0);
    expect(formatRenewal({ renewsAt, cancelAtPeriodEnd: false })).toBe('次回の更新日 2026年10月29日');
    expect(formatRenewal({ renewsAt, cancelAtPeriodEnd: true })).toBe('2026年10月29日まで利用できます（更新しません）');
    expect(formatRenewal({ renewsAt: null, cancelAtPeriodEnd: false })).toBeNull();
  });
});
