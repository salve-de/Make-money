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

describe('スマホ幅の検索は「絞り込み・検索」の画面で行う', () => {
  const toolbar = (searchQuery: string) =>
    renderToStaticMarkup(<DataGridToolbar searchQuery={searchQuery} onSearchChange={() => {}} hideSearch totalCount={20} onOpenScreener={() => {}} />);

  it('ボタンの名前が「絞り込み・検索」で、検索語が無ければ印を出さない', () => {
    const html = toolbar('');
    expect(html).toContain('絞り込み・検索');
    expect(html).not.toContain('検索語あり');
  });

  it('検索語が入っている間は「検索語あり」の印を出す（空白だけなら出さない）', () => {
    expect(toolbar('工場')).toContain('検索語あり');
    expect(toolbar('   ')).not.toContain('検索語あり');
  });
});
