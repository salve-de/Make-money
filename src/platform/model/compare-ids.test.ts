import { describe, expect, it } from 'vitest';
import { compareHref, parseCompareIds } from './compare-ids';

describe('compare ids', () => {
  it('keeps up to four valid, unique ids in order', () => {
    expect(parseCompareIds('ent_a, ent_b,ent_a,,ent_c,ent_d,ent_e')).toEqual(['ent_a', 'ent_b', 'ent_c', 'ent_d']);
  });

  it('drops values that are not entity ids', () => {
    expect(parseCompareIds('ent_a,<script>,../etc,ent_paypal_H3K7M2QX')).toEqual(['ent_a', 'ent_paypal_H3K7M2QX']);
    expect(parseCompareIds(undefined)).toEqual([]);
  });

  it('builds a shareable link and falls back to the empty page', () => {
    expect(compareHref(['ent_a', 'ent_b'])).toBe('/compare?ids=ent_a,ent_b');
    expect(compareHref([])).toBe('/compare');
  });
});
