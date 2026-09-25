import { describe, expect, it } from 'vitest';
import { markFailedFoundationCursor } from './useFoundationCatalog';

describe('Foundation cursor retry recovery', () => {
  it('removes a failed cursor from the consumed set and keeps continuation available', () => {
    const requested = new Set(['cursor-a', 'cursor-b']);
    const setHasMore = vi.fn();

    restoreFailedFoundationCursor(requested, 'cursor-a', setHasMore);

    expect(requested.has('cursor-a')).toBe(false);
    expect(requested.has('cursor-b')).toBe(true);
    expect(setHasMore).toHaveBeenCalledOnce();
    expect(setHasMore).toHaveBeenCalledWith(true);
  });
});
