import { describe, expect, it } from 'vitest';
import { shouldLoadMoreGridPage } from '@/platform/components/grid/InstitutionalDataGrid';
import {
  foundationPagingPolicy,
  isFoundationPagingStateCurrent,
  mergeFoundationRowsById,
  shouldReplaceFoundationRows,
} from './foundation-paging-state';

describe('Foundation paging state', () => {
  it('only considers render paging current when visible, debounced, and accepted queries agree', () => {
    expect(isFoundationPagingStateCurrent({
      searchQuery: 'Apollo',
      foundationSearchQuery: 'Apollo',
      loadedSearchQuery: 'Apollo',
    })).toBe(true);
    expect(isFoundationPagingStateCurrent({
      searchQuery: 'Starwood',
      foundationSearchQuery: 'Apollo',
      loadedSearchQuery: 'Apollo',
    })).toBe(false);
    expect(isFoundationPagingStateCurrent({
      searchQuery: 'Starwood',
      foundationSearchQuery: 'Starwood',
      loadedSearchQuery: 'Apollo',
    })).toBe(false);
    expect(isFoundationPagingStateCurrent({
      searchQuery: '',
      foundationSearchQuery: '',
      loadedSearchQuery: 'Apollo',
    })).toBe(false);
  });

  it('blocks the stale Apollo cursor while search is being cleared', () => {
    for (const input of [
      {
        searchQuery: '',
        foundationSearchQuery: 'Apollo',
        loadedSearchQuery: 'Apollo',
      },
      {
        searchQuery: '',
        foundationSearchQuery: '',
        loadedSearchQuery: 'Apollo',
      },
    ]) {
      const current = isFoundationPagingStateCurrent(input);
      expect(current).toBe(false);
      const policy = foundationPagingPolicy({
        searchQuery: input.searchQuery,
        foundationHasMore: current ? true : false,
        foundationRetryAvailable: current ? true : false,
        catalogHasMore: false,
      });
      expect(policy.gridHasMore).toBe(false);
      expect(policy.gridRetryAvailable).toBe(false);
      expect(shouldLoadMoreGridPage(250, 0, policy.gridHasMore, policy.gridRetryAvailable)).toBe(false);
    }
  });

  it('resumes ordinary Foundation auto paging after the empty-query page is accepted', () => {
    const current = isFoundationPagingStateCurrent({
      searchQuery: '',
      foundationSearchQuery: '',
      loadedSearchQuery: '',
    });
    expect(current).toBe(true);
    const policy = foundationPagingPolicy({
      searchQuery: '',
      foundationHasMore: true,
      foundationRetryAvailable: false,
      catalogHasMore: false,
    });
    expect(policy.autoLoadFoundation).toBe(true);
    expect(policy.gridHasMore).toBe(true);
    expect(shouldLoadMoreGridPage(250, 0, policy.gridHasMore, policy.gridRetryAvailable)).toBe(true);
  });

  it('keeps Foundation archive paging manual while search is active', () => {
    const policy = foundationPagingPolicy({
      searchQuery: 'Apollo',
      foundationHasMore: true,
      foundationRetryAvailable: false,
      catalogHasMore: false,
    });
    expect(policy.autoLoadFoundation).toBe(false);
    expect(policy.gridHasMore).toBe(false);
    expect(policy.searchContinuationAvailable).toBe(true);
    expect(policy.searchIncomplete).toBe(true);
  });

  it('preserves already displayed rows on retry-from-start', () => {
    expect(shouldReplaceFoundationRows(undefined, true)).toBe(false);
    const current = [{ id: 'apollo' }];
    expect(mergeFoundationRowsById(current, [])).toEqual(current);
    expect(mergeFoundationRowsById(current, [{ id: 'apollo' }, { id: 'starwood' }]))
      .toEqual([{ id: 'apollo' }, { id: 'starwood' }]);
  });
});
