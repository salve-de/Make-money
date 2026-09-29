import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { EvidenceStatus } from '@/shared/terminal';
import { DynamicEvidenceDeck } from './DynamicEvidenceDeck';

const STATUS_LABELS: Record<EvidenceStatus, string> = {
  VERIFIED: '一次資料',
  REPORTED: '公表・報道',
  ESTIMATED: '推計',
  POST_MORTEM: '事後資料',
  UNKNOWN: '未確認',
};

it('renders every supported evidence status, including post-mortem evidence', () => {
  for (const status of ['VERIFIED', 'REPORTED', 'ESTIMATED', 'POST_MORTEM', 'UNKNOWN'] satisfies EvidenceStatus[]) {
    const html = renderToStaticMarkup(createElement(DynamicEvidenceDeck, { cards: [{
      id: 'evidence', type: 'SMOKING_GUN', title: 'Source', punchline: 'Observation', evidenceStatus: status,
      sourceNote: 'https://example.com/source',
    }] }));
    expect(html).toContain(STATUS_LABELS[status]);
  }
});

it('does not display a source-backed label when the source link is missing', () => {
  const html = renderToStaticMarkup(createElement(DynamicEvidenceDeck, { cards: [{
    id: 'missing-source', type: 'SMOKING_GUN', title: 'Source', punchline: 'Observation', evidenceStatus: 'VERIFIED',
  }] }));
  expect(html).toContain('出典リンクなし');
  expect(html).not.toContain('一次資料');
});
