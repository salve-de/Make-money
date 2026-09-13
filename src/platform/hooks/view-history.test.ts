import { describe, expect, it } from 'vitest';
import { decodeViewHistory, prependViewedEntity } from './view-history';

describe('view history browser boundary', () => {
  it.each([null, '{', 'null', '{}', '42', '"id"'])('rejects malformed roots: %s', raw => {
    expect(decodeViewHistory(raw)).toEqual([]);
  });
  it('salvages valid IDs in recent order and removes duplicates', () => {
    expect(decodeViewHistory('["a",null,3,"",{},"b","a"]')).toEqual(['a', 'b']);
  });
  it('moves a revisited entity to the front and bounds retained history', () => {
    const ids = Array.from({ length: 35 }, (_, i) => `id${i}`);
    expect(decodeViewHistory(JSON.stringify(ids))).toHaveLength(30);
    const updated = prependViewedEntity(ids.slice(0, 30), 'id20');
    expect(updated).toHaveLength(30);
    expect(updated[0]).toBe('id20');
    expect(new Set(updated).size).toBe(30);
    expect(prependViewedEntity(updated, ' ')).toBe(updated);
  });
});
