import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { EvidenceStatus } from '@/shared/terminal';
import { DynamicEvidenceDeck } from './DynamicEvidenceDeck';

// 正直化の表示規則（evidenceStatusLabel）: 裏付けの強さが言える状態だけ印を出し、報道・未確認には印を付けない。
const STATUS_LABELS: Record<EvidenceStatus, string | null> = {
  VERIFIED: '一次資料',
  REPORTED: null,
  ESTIMATED: '推計',
  POST_MORTEM: '事後資料',
  UNKNOWN: null,
};

it('renders every supported evidence status, including post-mortem evidence', () => {
  for (const status of ['VERIFIED', 'REPORTED', 'ESTIMATED', 'POST_MORTEM', 'UNKNOWN'] satisfies EvidenceStatus[]) {
    const html = renderToStaticMarkup(createElement(DynamicEvidenceDeck, { cards: [{
      id: 'evidence', type: 'SMOKING_GUN', title: 'Source', punchline: 'Observation', evidenceStatus: status,
      sourceNote: 'https://example.com/source',
    }] }));
    const expected = STATUS_LABELS[status];
    if (expected) expect(html).toContain(expected);
    else for (const label of ['一次資料', '事後資料', '公表・報道', '未確認']) expect(html).not.toContain(label);
  }
});

it('does not display a source-backed label when the source link is missing', () => {
  const html = renderToStaticMarkup(createElement(DynamicEvidenceDeck, { cards: [{
    id: 'missing-source', type: 'SMOKING_GUN', title: 'Source', punchline: 'Observation', evidenceStatus: 'VERIFIED',
  }] }));
  expect(html).toContain('Observation');
  expect(html).not.toContain('一次資料');
});
