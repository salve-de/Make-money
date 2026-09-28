import { describe, expect, it } from 'vitest';
import { positionLabel } from './entityUrl';

describe('entity position label', () => {
  it('shows 1-based position with grouped total', () => {
    expect(positionLabel(8, 3085)).toBe('9 / 3,085');
  });
  it('returns undefined when the case is not in the list', () => {
    expect(positionLabel(-1, 3085)).toBeUndefined();
  });
});
