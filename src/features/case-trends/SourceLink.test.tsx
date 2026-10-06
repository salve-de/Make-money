import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ReaderSource } from '@/shared/reader-case';
import { buildCaseTrends, summarizeCaseTrends } from '@/lib/company-access/case-trends';
import { SourceLink } from './SourceLink';
import { CaseTrendsSummary } from './CaseTrendsSummary';

const source: ReaderSource = { id: 's1', publisher: '公開資料', url: 'https://source.example/report', kind: 'OFFICIAL' };
const unsafeUrls = ['javascript:alert(1)', 'data:text/html,hello', 'ftp://source.example/report',
  'https://user:password@source.example/report', 'https://source.example/\nreport',
  'https://source.example/\u0000report', 'https://source.example/\u007freport', 'not-a-url'];

function view(url: string, estimated = false) {
  const entry = buildCaseTrends({ id: 'ent_source', name: 'Source case', reader: {
    sources: [source], facts: [{ id: 'f1', kind: 'DESCRIPTION', text: '出典に記録された事業。', sourceId: 's1', attribution: 'OFFICIAL' }],
    metrics: [{ id: 'm1', measure: 'REVENUE', periodKind: 'YEAR', period: '2025', amount: 100,
      currency: 'USD', origin: estimated ? 'ESTIMATED' : 'SELF_REPORTED', sourceId: 's1' }], unknowns: [], analysis: [],
  } });
  // Exercise rendering defensively without teaching the projection to accept unsafe input.
  entry.series[0].points[0].source = { ...source, url };
  entry.records[0].source = { ...source, url };
  const before = JSON.stringify(entry);
  const html = renderToStaticMarkup(<CaseTrendsSummary cases={[entry]} corpus={{ version: 1, hash: 'fixture', publishedCaseCount: 1, checkedAt: null }}
    coverage={summarizeCaseTrends([entry])} />);
  expect(JSON.stringify(entry)).toBe(before);
  return html;
}

describe('Trends source links', () => {
  it.each(['http://source.example/report', 'https://source.example/report'])('links an ordinary HTTP(S) source: %s', (url) => {
    const html = renderToStaticMarkup(<SourceLink source={{ ...source, url }} className="source-action" />);
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain('target="_blank" rel="noopener noreferrer"');
    expect(html).toContain('公開資料');
  });

  it.each(unsafeUrls)('keeps the label without an unsafe link: %s', (url) => {
    const html = renderToStaticMarkup(<SourceLink source={{ ...source, url }} className="source-action" />);
    expect(html).toContain('公開資料');
    expect(html).not.toContain('<a');
    expect(html).not.toContain(url);
  });

  it.each(unsafeUrls)('uses the same defense in summary examples: %s', (url) => {
    const html = view(url);
    expect(html).toContain('公開資料');
    expect(html).toContain('$100');
    expect(html).not.toContain('target="_blank"');
    expect(html).not.toContain('password');
  });

  it('keeps the original source link and amount for a valid source', () => {
    const html = view(source.url);
    expect(html.match(/href="https:\/\/source.example\/report"/g)).toHaveLength(1);
    expect(html).toContain('$100');
    expect(html).toContain('2025');
  });

  it('labels estimates as estimates without promoting them to observed change', () => {
    const html = view(source.url, true);
    expect(html).toContain('推定');
    expect(html).not.toContain('data-change=');
    expect(html).toContain('$100');
  });
});
