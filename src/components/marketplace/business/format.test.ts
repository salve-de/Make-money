import { describe, expect, it } from 'vitest';

import { formatJstDate, formatJstDateTime, parseIntegerInput } from './format';

describe('formatJstDate / formatJstDateTime', () => {
  it('shows Japan time', () => {
    expect(formatJstDateTime('2026-09-10T03:05:00.000Z')).toBe('2026-09-10 12:05');
    expect(formatJstDate('2026-09-20T15:30:00.000Z')).toBe('2026-09-21');
    expect(formatJstDate('2026-09-20T14:59:59.000Z')).toBe('2026-09-20');
  });

  it('shows a dash for a value it cannot read', () => {
    expect(formatJstDate('not a date')).toBe('—');
    expect(formatJstDateTime('')).toBe('—');
  });
});

describe('parseIntegerInput', () => {
  it('returns undefined for an empty field', () => {
    expect(parseIntegerInput('')).toBeUndefined();
    expect(parseIntegerInput('   ')).toBeUndefined();
  });

  it('accepts digits with thousands separators, spaces, full-width digits and a trailing 円', () => {
    expect(parseIntegerInput('1200000')).toBe(1_200_000);
    expect(parseIntegerInput('1,200,000')).toBe(1_200_000);
    expect(parseIntegerInput('1 200 000')).toBe(1_200_000);
    expect(parseIntegerInput('１，２００，０００')).toBe(1_200_000);
    expect(parseIntegerInput('4,500,000円')).toBe(4_500_000);
    expect(parseIntegerInput('0')).toBe(0);
  });

  it('marks anything else invalid instead of guessing a different number', () => {
    for (const raw of ['1.5', '1.5万', '12abc', '-5', '+5', '1e6', '万', '１２.５', '100円分', '12345678901234567']) {
      expect(parseIntegerInput(raw), raw).toBeNaN();
    }
  });
});
