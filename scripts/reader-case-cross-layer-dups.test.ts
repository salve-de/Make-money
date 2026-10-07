import assert from 'node:assert/strict';
import test from 'node:test';

import type { DisplayFiles } from '../src/shared/display-build';
import { crossLayerDuplicates } from './reader-case/cross-layer-dups';

const files = (over: Record<string, unknown>): DisplayFiles => ({ 'list-lines': [], 'summary-lines': [], 'detail-lines': [], 'success-points': [], 'case-chapters': [], ...over }) as unknown as DisplayFiles;

test('同じ数字が章と成功の秘訣に出ていれば指摘する', () => {
  const f = files({
    'success-points': [{ entityId: 'e1', points: [{ factId: 'f1', factHash: 'x', head: '開始から6か月で847人', body: '' }] }],
    'case-chapters': [{ entityId: 'e1', factId: 'f1', factHash: 'x', chapters: { timeline: [{ text: '2025年8月: 847人が使う', source: 'https://example.com' }] } }],
  });
  assert.ok(crossLayerDuplicates('e1', f).some((p) => p.includes('847人')));
});

test('重ならなければ指摘しない。他の事例の文は見ない', () => {
  const f = files({
    'summary-lines': [{ entityId: 'e1', factId: 'f', factHash: 'x', text: '開発者向けの道具を作る。' }, { entityId: 'e2', factId: 'f', factHash: 'x', text: '847人が使う。' }],
    'success-points': [{ entityId: 'e1', points: [{ factId: 'f1', factHash: 'x', head: '847人', body: '' }] }],
  });
  assert.deepEqual(crossLayerDuplicates('e1', f), []);
});
