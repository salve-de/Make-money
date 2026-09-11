import { describe, expect, it } from 'vitest';
import { findPaidClientImports } from '../../scripts/architecture/check-boundaries.mjs';
import { extractPaidSentinels, findPaidSentinel } from '../../scripts/architecture/check-paid-bundle.mjs';

describe('paid delivery guards', () => {
  it('rejects transitive client imports and reexports of private company data', () => {
    const graph = new Map([
      ['src/client.tsx', ['src/helper.ts']],
      ['src/helper.ts', ['src/platform/data/mockLedgerData.ts']],
    ]);
    expect(findPaidClientImports(graph, ['src/client.tsx'])).toHaveLength(1);
    expect(findPaidClientImports(graph, [])).toEqual([]);
  });
  it('also protects legacy JSON and supplemental data', () => {
    for (const target of ['data/entities-index.json', 'src/platform/data/additionalInstitutionalEntities3.ts']) {
      expect(findPaidClientImports(new Map([['src/client.tsx', [target]]]), ['src/client.tsx'])).toHaveLength(1);
    }
  });
  it('extracts premium values only and detects raw/serialized public delivery', () => {
    const secret = 'Paid confidential example, extended enough to uniquely identify the content.';
    const publicValue = 'Public description deliberately outside the premium metadata fields.';
    const sentinels = extractPaidSentinels(`const e = { name: ${JSON.stringify(publicValue)}, meta: { pricingPower: { anchorComparison: ${JSON.stringify(secret)} } } };`);
    expect(sentinels).toEqual([secret]);
    expect(findPaidSentinel(publicValue, sentinels)).toBeUndefined();
    expect(findPaidSentinel(JSON.stringify({ meta: secret }), sentinels)).toBe(secret);
    const unicode = [...secret].map((char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`).join('');
    expect(findPaidSentinel(unicode, sentinels)).toBe(secret);
  });
});
