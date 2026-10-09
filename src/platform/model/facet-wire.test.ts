import { describe, expect, it } from 'vitest';
import { decodeFacets, encodeFacets } from './facet-wire';

describe('facet-wire', () => {
  const rows = [
    { scale: 'SOLO', margin: 60, capital: 0, moat: 'SWITCHING_COST', words: ['開発・IT', '個人向け'] },
    { scale: 'ENTERPRISE', margin: 20, capital: null, moat: 'UNKNOWN', words: ['開発・IT'] },
  ];
  it('送って戻すと同じ値になり、言葉は一覧の番号で1回だけ送る', () => {
    const wire = encodeFacets('g1', rows);
    expect(wire.words).toEqual(['開発・IT', '個人向け']);
    expect(decodeFacets(JSON.parse(JSON.stringify(wire)))).toEqual(rows);
  });
  it('形が違えば null（件数を出さないだけ）', () => {
    expect(decodeFacets(null)).toBeNull();
    expect(decodeFacets({ words: ['a'], rows: [['SOLO', 1, 0, 'm', [5]]] })).toBeNull();
    expect(decodeFacets({ words: [], rows: [['SOLO']] })).toBeNull();
  });
});
