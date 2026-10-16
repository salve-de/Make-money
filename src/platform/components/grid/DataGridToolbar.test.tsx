import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataGridToolbar } from './DataGridToolbar';

describe('一覧の上のボタン', () => {
  it('「新着事例」「事例を探す」は出さない', () => {
    const html = renderToStaticMarkup(<DataGridToolbar searchQuery="" onSearchChange={() => {}} totalCount={20} onOpenScreener={() => {}} onToggleTag={() => {}} />);
    expect(html).not.toContain('新着事例');
    expect(html).not.toContain('事例を探す');
    expect(html).not.toContain('/discover');
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
