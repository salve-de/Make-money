import { describe, expect, it } from 'vitest';
import { legacyText, legacyNumber } from './legacy-fields';
describe('historical inspector field compatibility', () => {
  it('preserves historical strings and numbers', () => {
    expect(legacyText({ moat: 'legacy moat' }, 'moat')).toBe('legacy moat');
    expect(legacyNumber({ teamSize: 3 }, 'teamSize')).toBe(3);
  });
  it('does not turn missing or malformed data into facts', () => {
    expect(legacyText({}, 'moat')).toBeUndefined();
    expect(legacyText({ moat: 4 }, 'moat')).toBeUndefined();
    expect(legacyNumber({ teamSize: NaN }, 'teamSize')).toBeUndefined();
    expect(legacyText(null, 'moat')).toBeUndefined();
    expect(legacyText(Object.create({ moat: 'inherited' }), 'moat')).toBeUndefined();
  });
});
