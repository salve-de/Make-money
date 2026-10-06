import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LedgerListTitle } from './InstitutionalDataGrid';

describe('LedgerListTitle', () => {
  it('shows the condition summary and count, and falls back to no-conditions', () => {
    const withCondition = renderToStaticMarkup(<LedgerListTitle count={3} conditionsLabel="検索「AI」・一人で運営" />);
    expect(withCondition).toContain('検索「AI」・一人で運営');
    expect(withCondition).not.toContain('条件なし');
    expect(withCondition).toContain('3件');
    expect(renderToStaticMarkup(<LedgerListTitle count={0} conditionsLabel="" />)).toContain('条件なし');
  });
});
