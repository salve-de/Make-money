import { describe, expect, it } from 'vitest';
import manifest from '../../data/catalog-release.json';
import { canonicalCatalogId, catalogDetailHash, catalogIds, filterToCatalog, isCatalogId } from './catalog-membership';

const [ID, HASH] = Object.entries(manifest.details)[0] as [string, string];

describe('catalog membership', () => {
  it('目録の ID だけを通し、大文字小文字・前後の空白は正式な ID に直す', () => {
    expect(isCatalogId(ID)).toBe(true);
    expect(isCatalogId(`  ${ID.toUpperCase()} `)).toBe(true);
    expect(canonicalCatalogId(ID.toUpperCase())).toBe(ID);
    expect(isCatalogId('ent_not_in_catalog')).toBe(false);
    expect(isCatalogId(undefined)).toBe(false);
    expect(isCatalogId('')).toBe(false);
  });
  it('詳細のハッシュは目録の値を返し、目録外は undefined', () => {
    expect(catalogDetailHash(ID)).toBe(HASH);
    expect(catalogDetailHash('ent_not_in_catalog')).toBeUndefined();
  });
  it('行の絞り込みは目録外を落とす', () => {
    expect(filterToCatalog([{ id: ID }, { id: 'ent_not_in_catalog' }])).toEqual([{ id: ID }]);
    expect(catalogIds().length).toBe(manifest.publishedCount);
  });
});
