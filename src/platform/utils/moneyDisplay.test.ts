import { describe, expect, it } from 'vitest';
import { formatManYenValue, formatYen, yenParts } from './moneyDisplay';

describe('money display', () => {
  it('uses 万円 and 億円 consistently', () => {
    expect(formatYen(1_500_000)).toBe('150万円');
    expect(formatYen(16_200_000)).toBe('1,620万円');
    expect(formatYen(150_000_000)).toBe('1.5億円');
    expect(formatYen(1_625_200_000_000)).toBe('16,252億円');
    expect(formatYen(9_800)).toBe('9,800円');
  });

  it('marks estimates and keeps sign', () => {
    expect(formatYen(1_155_000, { approx: true })).toBe('約116万円');
    expect(yenParts(-104_000)).toEqual({ value: '−10', unit: '万円' });
  });

  it('formats bare 万円 column values', () => {
    expect(formatManYenValue(150_000_000)).toBe('15,000');
  });
});
