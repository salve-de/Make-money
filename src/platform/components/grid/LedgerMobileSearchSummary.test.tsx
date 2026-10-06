import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LedgerMobileSearchSummary } from './InstitutionalDataGrid';
import { AdvancedScreenerModal } from '../screener/AdvancedScreenerModal';

describe('スマホ幅の検索表示', () => {
  it('検索語が入っている時だけ「検索「語」・N件」と消去ボタンを出す', () => {
    const html = renderToStaticMarkup(<LedgerMobileSearchSummary query="工場" count={1234} onClear={() => {}} />);
    expect(html).toContain('検索「工場」');
    expect(html).toContain('1,234件');
    expect(html).toContain('aria-label="検索語を消去"');
    expect(html).toContain('lg:hidden');
    expect(renderToStaticMarkup(<LedgerMobileSearchSummary query="  " count={5} onClear={() => {}} />)).toBe('');
  });

  it('絞り込み画面の最上部に検索欄があり、検索語があれば消去ボタンも出る。PC では出さない', () => {
    const open = (query: string) =>
      renderToStaticMarkup(<AdvancedScreenerModal isOpen onClose={() => {}} onApplyFilters={() => {}} searchQuery={query} onSearchChange={() => {}} />);
    const empty = open('');
    expect(empty).toContain('placeholder="会社名・ティッカー・事業で検索"');
    expect(empty).toContain('lg:hidden');
    expect(empty.indexOf('screener-search')).toBeLessThan(empty.indexOf('事業の規模'));
    expect(empty).not.toContain('検索語を消去');
    expect(open('工場')).toContain('検索語を消去');
    const withoutSearch = renderToStaticMarkup(<AdvancedScreenerModal isOpen onClose={() => {}} onApplyFilters={() => {}} />);
    expect(withoutSearch).not.toContain('screener-search');
  });
});
