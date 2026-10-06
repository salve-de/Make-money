import { describe, expect, it } from 'vitest';
import type { VerifiedRevenue } from '@/shared/verification';
import {
  formatMinorAmount,
  readVerificationError,
  readVerifiedEntities,
  readVerifiedRevenue,
  staleVerificationDays,
  verifiedRevenueRows,
} from './verified-revenue-view';

const base: VerifiedRevenue = {
  entityId: 'photo-ai',
  provider: 'stripe',
  accountDomain: 'photoai.com',
  currency: 'USD',
  last30dRevenueMinor: 12_345_67,
  mrrMinor: 9_800_00,
  activeSubscriptions: 412,
  periodStart: Date.UTC(2026, 7, 30, 6) / 1000,
  periodEnd: Date.UTC(2026, 8, 29, 6) / 1000,
  verifiedAt: Date.UTC(2026, 8, 29, 6, 40) / 1000,
};

describe('formatMinorAmount', () => {
  it('reads minor units by currency: yen has no decimals, dollars have two', () => {
    expect(formatMinorAmount(1_234_567, 'JPY')).toBe('1,234,567円');
    expect(formatMinorAmount(123_456, 'usd')).toBe('$1,234.56');
    expect(formatMinorAmount(-5_000, 'JPY')).toBe('-5,000円');
  });

  it('still shows the amount for a code the runtime does not know', () => {
    expect(formatMinorAmount(1_050, 'ZZZ')).toMatch(/10\.50.*ZZZ|ZZZ.*10\.50/);
  });
});

describe('verifiedRevenueRows', () => {
  it('shows the verified figures with the period in Japan time', () => {
    const rows = verifiedRevenueRows(base);
    expect(rows.map((row) => [row.label, row.value])).toEqual([
      ['30日間の売上', '$12,345.67'],
      ['月額の継続売上（MRR）', '$9,800.00'],
      ['有効な契約', '412件'],
      ['集計期間', '2026/08/30 〜 2026/09/29'],
      ['照合したサイト', 'photoai.com'],
      ['確認日時', '2026/09/29 15:40'],
    ]);
  });

  it('writes — instead of zero when MRR or the contract count could not be counted', () => {
    const rows = verifiedRevenueRows({ ...base, mrrMinor: null, activeSubscriptions: null });
    expect(rows[1]).toMatchObject({ value: '—', confirmed: false });
    expect(rows[2]).toMatchObject({ value: '—', confirmed: false });
  });
});

describe('staleVerificationDays', () => {
  it('flags a verification only after 60 days', () => {
    const verifiedAt = base.verifiedAt;
    expect(staleVerificationDays(verifiedAt, verifiedAt + 60 * 86_400)).toBeNull();
    expect(staleVerificationDays(verifiedAt, verifiedAt + 61 * 86_400)).toBe(61);
  });
});

describe('response readers', () => {
  it('accepts a well-formed verification and rejects a broken one', () => {
    expect(readVerifiedRevenue(base)).toEqual(base);
    expect(readVerifiedRevenue({ ...base, last30dRevenueMinor: '100' })).toBeNull();
    expect(readVerifiedRevenue({ ...base, currency: 'usd' })).toBeNull();
    expect(readVerifiedRevenue(null)).toBeNull();
  });

  it('keeps only valid rows from the verified list', () => {
    expect(readVerifiedEntities({ verified: [{ entityId: 'a', verifiedAt: 1 }, { entityId: 2 }, null] })).toEqual([{ entityId: 'a', verifiedAt: 1 }]);
    expect(readVerifiedEntities({ error: 'x' })).toEqual([]);
  });

  it('uses the server message and the permissions to add, with a fallback', () => {
    expect(readVerificationError({ error: '権限がありません', code: 'permission_missing', permissions: ['アカウント'] }, 'x'))
      .toEqual({ error: '権限がありません', permissions: ['アカウント'] });
    expect(readVerificationError(null, '確認できませんでした')).toEqual({ error: '確認できませんでした', permissions: undefined });
  });

  it('keeps where to put the site token when the site could not be proven, and drops a broken one', () => {
    const ownership = {
      domain: 'photoai.com',
      token: 'kinrokoku-verify-abc',
      fileUrl: 'https://photoai.com/.well-known/kinrokoku-verification.txt',
      dnsName: '_kinrokoku-verification.photoai.com',
    };
    expect(readVerificationError({ error: '確認できませんでした', code: 'site_unproven', ownership }, 'x').ownership).toEqual(ownership);
    expect(readVerificationError({ error: 'x', ownership: { domain: 'photoai.com', token: 1 } }, 'x').ownership).toBeUndefined();
  });
});
