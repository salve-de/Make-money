import { describe, expect, it } from 'vitest';
import {
  canContinueFoundationSearch,
  foundationSearchRetryMessage,
  foundationPagingPolicy,
  isFoundationPagingStateCurrent,
  mergeFoundationRowsById,
  shouldApplyFoundationContinuationFailure,
  shouldReplaceFoundationRows,
} from './useFoundationPaging';
import { shouldLoadMoreGridPage } from '@/platform/components/grid/InstitutionalDataGrid';

describe('Foundation search paging policy', () => {
  it('never lets Foundation archive continuation participate in automatic grid paging during search', () => {
    expect(foundationPagingPolicy({
      searchQuery: 'Apollo',
      foundationHasMore: true,
      foundationRetryAvailable: false,
      catalogHasMore: false,
    })).toEqual({
      autoLoadFoundation: false,
      gridHasMore: false,
      gridRetryAvailable: false,
      searchContinuationAvailable: true,
      searchContinuationFailed: false,
      searchIncomplete: true,
    });
  });

  it('keeps curated automatic paging independent from manual Foundation continuation', () => {
    expect(foundationPagingPolicy({
      searchQuery: 'Apollo',
      foundationHasMore: true,
      foundationRetryAvailable: false,
      catalogHasMore: true,
    })).toMatchObject({
      autoLoadFoundation: false,
      gridHasMore: true,
      searchContinuationAvailable: true,
      searchIncomplete: true,
    });
  });

  it('turns a failed search continuation into an explicit retry without marking the grid retry state', () => {
    expect(foundationPagingPolicy({
      searchQuery: 'Starwood',
      foundationHasMore: true,
      foundationRetryAvailable: true,
      catalogHasMore: false,
    })).toEqual({
      autoLoadFoundation: false,
      gridHasMore: false,
      gridRetryAvailable: false,
      searchContinuationAvailable: true,
      searchContinuationFailed: true,
      searchIncomplete: true,
    });
  });

  it('preserves the existing automatic Foundation paging outside search mode', () => {
    expect(foundationPagingPolicy({
      searchQuery: '',
      foundationHasMore: true,
      foundationRetryAvailable: false,
      catalogHasMore: false,
    })).toEqual({
      autoLoadFoundation: true,
      gridHasMore: true,
      gridRetryAvailable: false,
      searchContinuationAvailable: false,
      searchContinuationFailed: false,
      searchIncomplete: false,
    });
  });

  it('preserves the existing grid retry path outside search mode', () => {
    expect(foundationPagingPolicy({
      searchQuery: '',
      foundationHasMore: false,
      foundationRetryAvailable: true,
      catalogHasMore: false,
    })).toMatchObject({
      autoLoadFoundation: true,
      gridRetryAvailable: true,
      searchContinuationAvailable: false,
      searchContinuationFailed: false,
    });
  });
});

describe('Foundation search continuation query binding', () => {
  it('does not issue the old Apollo cursor while Starwood is inside the debounce window', () => {
    expect(canContinueFoundationSearch({
      searchQuery: 'Starwood',
      foundationSearchQuery: 'Apollo',
      loadedQuery: 'Apollo',
      loading: false,
      hasContinuation: true,
    })).toBe(false);
  });

  it('allows manual continuation only after the loaded and debounced query agree', () => {
    expect(canContinueFoundationSearch({
      searchQuery: 'Apollo',
      foundationSearchQuery: 'Apollo',
      loadedQuery: 'Apollo',
      loading: false,
      hasContinuation: true,
    })).toBe(true);
  });

  it('does not apply an Apollo failure after the active query changes to Starwood', () => {
    expect(shouldApplyFoundationContinuationFailure({
      requestId: 7,
      currentRequestId: 8,
      requestQuery: 'Apollo',
      currentSearchQuery: 'Starwood',
      loadedQuery: 'Starwood',
    })).toBe(false);
  });

  it('does not let an older request overwrite a newer generation of the same query', () => {
    expect(shouldApplyFoundationContinuationFailure({
      requestId: 7,
      currentRequestId: 9,
      requestQuery: 'Apollo',
      currentSearchQuery: 'Apollo',
      loadedQuery: 'Apollo',
    })).toBe(false);
  });

  it('ignores an automatic empty-query page failure after a search commits', () => {
    expect(shouldApplyFoundationContinuationFailure({
      requestId: 11,
      currentRequestId: 12,
      requestQuery: '',
      currentSearchQuery: 'Apollo',
      loadedQuery: 'Apollo',
    })).toBe(false);
  });

  it('ignores an old automatic page failure after search is cleared again', () => {
    expect(shouldApplyFoundationContinuationFailure({
      requestId: 11,
      currentRequestId: 13,
      requestQuery: '',
      currentSearchQuery: '',
      loadedQuery: '',
    })).toBe(false);
  });

  it('applies a failure only to the exact current request and query', () => {
    expect(shouldApplyFoundationContinuationFailure({
      requestId: 9,
      currentRequestId: 9,
      requestQuery: 'Apollo',
      currentSearchQuery: 'Apollo',
      loadedQuery: 'Apollo',
    })).toBe(true);
  });
});

describe('Foundation render paging state', () => {
  it('accepts paging only when visible, debounced, and loaded queries agree', () => {
    expect(isFoundationPagingStateCurrent({
      searchQuery: 'Apollo',
      foundationSearchQuery: 'Apollo',
      loadedSearchQuery: 'Apollo',
    })).toBe(true);
  });

  it('hides the old Apollo cursor immediately when the user types Starwood', () => {
    expect(isFoundationPagingStateCurrent({
      searchQuery: 'Starwood',
      foundationSearchQuery: 'Apollo',
      loadedSearchQuery: 'Apollo',
    })).toBe(false);
  });

  it('keeps the old cursor hidden after debounce until the Starwood response is accepted', () => {
    expect(isFoundationPagingStateCurrent({
      searchQuery: 'Starwood',
      foundationSearchQuery: 'Starwood',
      loadedSearchQuery: 'Apollo',
    })).toBe(false);
  });

  it('exposes Starwood continuation only after the Starwood response is accepted', () => {
    expect(isFoundationPagingStateCurrent({
      searchQuery: 'Starwood',
      foundationSearchQuery: 'Starwood',
      loadedSearchQuery: 'Starwood',
    })).toBe(true);
  });

  it('does not reuse a search cursor when returning to the normal catalog', () => {
    expect(isFoundationPagingStateCurrent({
      searchQuery: '',
      foundationSearchQuery: '',
      loadedSearchQuery: 'Apollo',
    })).toBe(false);
  });
});

describe('search clear -> ordinary Foundation paging recovery', () => {
  function visiblePaging(input: {
    searchQuery: string;
    foundationSearchQuery: string;
    loadedSearchQuery: string | null;
    foundationHasMore: boolean;
    foundationRetryAvailable: boolean;
  }) {
    const current = isFoundationPagingStateCurrent({
      searchQuery: input.searchQuery,
      foundationSearchQuery: input.foundationSearchQuery,
      loadedSearchQuery: input.loadedSearchQuery,
    });

    const policy = foundationPagingPolicy({
      searchQuery: input.searchQuery,
      foundationHasMore:
        current ? input.foundationHasMore : false,
      foundationRetryAvailable:
        current ? input.foundationRetryAvailable : false,
      catalogHasMore: false,
    });

    return { current, policy };
  }

  it('does not expose or issue the stale Apollo cursor after search is cleared', () => {
    const immediatelyCleared = visiblePaging({
      searchQuery: '',
      foundationSearchQuery: 'Apollo',
      loadedSearchQuery: 'Apollo',
      foundationHasMore: true,
      foundationRetryAvailable: true,
    });

    expect(immediatelyCleared.current).toBe(false);
    expect(immediatelyCleared.policy.gridHasMore).toBe(false);
    expect(immediatelyCleared.policy.gridRetryAvailable).toBe(false);
    expect(
      shouldLoadMoreGridPage(
        250,
        0,
        immediatelyCleared.policy.gridHasMore,
        immediatelyCleared.policy.gridRetryAvailable,
      ),
    ).toBe(false);

    const debounceCommitted = visiblePaging({
      searchQuery: '',
      foundationSearchQuery: '',
      loadedSearchQuery: 'Apollo',
      foundationHasMore: true,
      foundationRetryAvailable: true,
    });

    expect(debounceCommitted.current).toBe(false);
    expect(debounceCommitted.policy.gridHasMore).toBe(false);
    expect(debounceCommitted.policy.gridRetryAvailable).toBe(false);
    expect(
      shouldLoadMoreGridPage(
        250,
        0,
        debounceCommitted.policy.gridHasMore,
        debounceCommitted.policy.gridRetryAvailable,
      ),
    ).toBe(false);
  });

  it('resumes ordinary Foundation auto paging only after the empty-query page is accepted', () => {
    const normalCatalog = visiblePaging({
      searchQuery: '',
      foundationSearchQuery: '',
      loadedSearchQuery: '',
      foundationHasMore: true,
      foundationRetryAvailable: false,
    });

    expect(normalCatalog.current).toBe(true);
    expect(normalCatalog.policy.autoLoadFoundation).toBe(true);
    expect(normalCatalog.policy.gridHasMore).toBe(true);
    expect(normalCatalog.policy.gridRetryAvailable).toBe(false);
    expect(
      shouldLoadMoreGridPage(
        250,
        0,
        normalCatalog.policy.gridHasMore,
        normalCatalog.policy.gridRetryAvailable,
      ),
    ).toBe(true);
  });
});

describe('Foundation retry status copy', () => {
  it('distinguishes latest-publication read failures', () => {
    expect(foundationSearchRetryMessage({
      latestRetryable: true,
      archiveRetryable: false,
    })).toContain('最新公開分');
  });

  it('distinguishes historical archive failures', () => {
    expect(foundationSearchRetryMessage({
      latestRetryable: false,
      archiveRetryable: true,
    })).toContain('過去事例');
  });

  it('reports both incomplete read paths when both fail', () => {
    expect(foundationSearchRetryMessage({
      latestRetryable: true,
      archiveRetryable: true,
    })).toContain('最新公開分と過去事例');
  });

  it('does not label a normal continuation as a failure', () => {
    expect(foundationSearchRetryMessage({
      latestRetryable: false,
      archiveRetryable: false,
    })).toBeNull();
  });
});

describe('Foundation retry-from-start row preservation', () => {
  it('replaces rows for a genuine fresh first-page load', () => {
    expect(shouldReplaceFoundationRows(undefined, false)).toBe(true);
  });

  it('preserves existing rows when retrying the initial archive page', () => {
    expect(shouldReplaceFoundationRows(undefined, true)).toBe(false);
  });

  it('preserves rows for an ordinary cursor continuation', () => {
    expect(shouldReplaceFoundationRows('foundation-search-v2:cursor', false)).toBe(false);
  });

  it('keeps an already discovered result when retry-from-start finds no additional rows', () => {
    const apollo = {
      id: 'ent_org_4a819d424adf6b2a118f',
      name: 'Apollo Global Management',
    };

    expect(mergeFoundationRowsById([apollo], [], false)).toEqual([apollo]);
  });

  it('deduplicates existing rows while appending newly found results', () => {
    const apollo = {
      id: 'ent_org_4a819d424adf6b2a118f',
      name: 'Apollo Global Management',
    };
    const starwood = {
      id: 'ent_org_0e1d9b556075d9fc7f36',
      name: 'Starwood Real Estate Income Trust, Inc.',
    };

    expect(mergeFoundationRowsById([apollo], [apollo, starwood], false))
      .toEqual([apollo, starwood]);
  });
});
