import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FoundationSearchContinuation } from './FoundationSearchContinuation';

describe('FoundationSearchContinuation', () => {
  it('renders nothing when continuation is unavailable', () => {
    const html = renderToStaticMarkup(createElement(FoundationSearchContinuation, {
      available: false,
      failed: false,
      loading: false,
      retryMessage: null,
      onContinue: vi.fn(),
    }));
    expect(html).toBe('');
  });

  it('keeps the generic failure fallback when no specific retry message exists', () => {
    const html = renderToStaticMarkup(createElement(FoundationSearchContinuation, {
      available: true,
      failed: true,
      loading: false,
      retryMessage: null,
      onContinue: vi.fn(),
    }));
    expect(html).toContain('Foundation検索の続き取得に失敗しました');
    expect(html).toContain('現在の検索結果は保持されています');
    expect(html).toContain('再試行');
    expect(html).not.toContain('過去の公開事例を追加で探索できます');
  });

  it('shows manual continuation for a healthy bounded search', () => {
    const html = renderToStaticMarkup(createElement(FoundationSearchContinuation, {
      available: true,
      failed: false,
      loading: false,
      retryMessage: null,
      onContinue: vi.fn(),
    }));
    expect(html).toContain('Foundation検索は未完了');
    expect(html).toContain('続けて検索');
  });
});
