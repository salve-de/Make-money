import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FoundationSearchContinuation } from './FoundationSearchContinuation';

describe('FoundationSearchContinuation', () => {
  it('renders nothing when continuation is unavailable', () => {
    const html = renderToStaticMarkup(createElement(
      FoundationSearchContinuation,
      {
        available: false,
        failed: false,
        loading: false,
        retryMessage: null,
        onContinue: vi.fn(),
      },
    ));

    expect(html).toBe('');
  });

  it('keeps the current results and exposes retry on failure', () => {
    const html = renderToStaticMarkup(createElement(
      FoundationSearchContinuation,
      {
        available: true,
        failed: true,
        loading: false,
        retryMessage: null,
        onContinue: vi.fn(),
      },
    ));

    expect(html).toContain('追加検索に失敗しました。表示中の結果は保持しています。');
    expect(html).toContain('再試行');
    expect(html).not.toContain('追加で探索できます');
  });

  it('offers manual continuation without implying the search is complete', () => {
    const html = renderToStaticMarkup(createElement(
      FoundationSearchContinuation,
      {
        available: true,
        failed: false,
        loading: false,
        retryMessage: null,
        onContinue: vi.fn(),
      },
    ));

    expect(html).toContain('検索対象の続きがあります。');
    expect(html).toContain('続けて検索');
  });
});
