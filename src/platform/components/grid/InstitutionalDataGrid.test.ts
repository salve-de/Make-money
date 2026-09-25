import { describe, expect, it } from 'vitest';
import { shouldLoadMoreGridPage, shouldRenderGridContinuation } from './InstitutionalDataGrid';

describe('InstitutionalDataGrid continuation boundary', () => {
  it('keeps the continuation sentinel active when a search page has zero matches but more pages exist', () => {
    expect(shouldRenderGridContinuation(250, 0, true)).toBe(true);
    expect(shouldLoadMoreGridPage(250, 0, true)).toBe(true);
  });

  it('does not auto-request while an explicit retry is pending', () => {
    expect(shouldLoadMoreGridPage(250, 0, true, true)).toBe(false);
  });

  it('does not request another page after the cursor is exhausted', () => {
    expect(shouldRenderGridContinuation(0, 0, false)).toBe(false);
    expect(shouldLoadMoreGridPage(250, 0, false)).toBe(false);
  });

  it('continues progressive rendering before requesting a remote page', () => {
    expect(shouldRenderGridContinuation(0, 100, true)).toBe(true);
    expect(shouldLoadMoreGridPage(0, 100, true)).toBe(false);
  });
});
