import { describe, expect, it } from 'vitest';
import { isValidCatalogPageProgress } from './catalog-page';

describe('catalog page progression contract', () => {
  const valid = {
    offset: 100,
    dataLength: 100,
    generation: 'release-v1',
    total: 205,
    nextOffset: 200,
  };

  it('accepts a contiguous next page and a final page', () => {
    expect(isValidCatalogPageProgress(valid)).toBe(true);
    expect(isValidCatalogPageProgress({ ...valid, offset: 200, dataLength: 5, nextOffset: null })).toBe(true);
    expect(isValidCatalogPageProgress({ ...valid, offset: 0, dataLength: 0, total: 0, nextOffset: null })).toBe(true);
  });

  it.each([
    { ...valid, generation: '' },
    { ...valid, nextOffset: 250 },
    { ...valid, nextOffset: null },
    { ...valid, offset: 200, total: 199, dataLength: 0, nextOffset: null },
    { ...valid, dataLength: 0, nextOffset: 100 },
  ])('rejects a broken or inconsistent page boundary %#', (value) => {
    expect(isValidCatalogPageProgress(value)).toBe(false);
  });
});
