import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataGridToolbar } from './DataGridToolbar';

describe('catalog-wide collection filter', () => {
  it.each([0, 7])('remains reachable when only %i collected records are loaded without claiming a total', (newlyCollectedCount) => {
    const html = renderToStaticMarkup(<DataGridToolbar searchQuery="" onSearchChange={() => {}} totalCount={20} onOpenScreener={() => {}} onToggleTag={() => {}} newlyCollectedCount={newlyCollectedCount} />);
    const button = html.match(/<button[^>]*title="新しく登録された事例を表示"[\s\S]*?<\/button>/)?.[0];
    expect(button).toBeDefined();
    expect(button).toContain('新着事例');
    expect(button).not.toContain(`${newlyCollectedCount}件`);
  });
});
