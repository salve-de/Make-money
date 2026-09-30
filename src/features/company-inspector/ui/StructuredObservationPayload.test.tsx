import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { UniversalObservation } from '@/shared/terminal';
import { StructuredObservationPayload } from './StructuredObservationPayload';

describe('StructuredObservationPayload reviewed public display', () => {
  it('renders ownership semantics and source link without implying a direct Apollo corporate holding', () => {
    const observation: UniversalObservation = {
      id: 'obs_real_sec',
      text: 'Starwood affordable-housing JV ownership',
      observationType: 'starwood_apollo.minority_equity_recapitalization.v1',
      publicPayload: {
        apollo_equity_interest_percent: 41.5,
        starwood_equity_interest_percent: 58.5,
      },
      publicDisplay: {
        title: 'Starwood affordable-housing JV ownership',
        subject: 'Ownership split in the Starwood SREIT affordable-housing joint venture',
        note: 'The 41.5% interest is reported for funds managed by and affiliates of Apollo Global Management; it is not presented as a direct corporate holding of Apollo Global Management.',
        facts: [
          { label: 'Apollo-managed funds / affiliates', value: 41.5, suffix: '%' },
          { label: 'Starwood SREIT', value: 58.5, suffix: '%' },
        ],
        sourceLabel: 'SEC filing',
        sourceUrls: [
          'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332741/ck0001711929-20260803.htm',
        ],
      },
    };

    const html = renderToStaticMarkup(
      createElement(StructuredObservationPayload, { observation }),
    );

    expect(html).toContain('Starwood affordable-housing JV ownership');
    expect(html).toContain('Apollo-managed funds / affiliates');
    expect(html).toContain('41.5%');
    expect(html).toContain('Starwood SREIT');
    expect(html).toContain('58.5%');
    expect(html).toContain('not presented as a direct corporate holding');
    expect(html).toContain('SEC filing');
    expect(html).toContain('https://www.sec.gov/Archives/edgar/data/');
    expect(html).not.toContain('type starwood_apollo.minority_equity_recapitalization.v1');
  });
});

describe('StructuredObservationPayload attribution (Tier 2 facts-only sources)', () => {
  it('renders provider, date, the self-reported label and the facts-only notice', () => {
    const observation: UniversalObservation = {
      id: 'obs_self_reported',
      text: 'Self-reported figure',
      observationType: 'public_fact.v1',
      publicDisplay: {
        title: 'Self-reported figure',
        subject: 'Company',
        facts: [{ label: 'Self-reported by Example Tool', value: 12000, suffix: 'USD' }],
        sourceLabel: 'Indie Hackers',
        sourceUrls: ['https://www.indiehackers.com/product/example-tool'],
        attribution: {
          displayTier: 'facts_only',
          providerName: 'Indie Hackers',
          publishedAt: '2025-03-01T00:00:00Z',
          rule: 'Provider name + canonical URL + publication date.',
          selfReported: true,
        },
      },
    };
    const html = renderToStaticMarkup(createElement(StructuredObservationPayload, { observation }));
    expect(html).toContain('data-testid="public-display-attribution"');
    expect(html).toContain('出典: Indie Hackers');
    expect(html).toContain('掲載 2025-03-01');
    expect(html).toContain('本人申告・独立確認なし');
    expect(html).not.toContain('事実のみ表示（原文・画像は転載しない）');
    expect(html).toContain('https://www.indiehackers.com/product/example-tool');
  });

  it('renders no attribution block for a Tier 1 display without one', () => {
    const observation: UniversalObservation = {
      id: 'obs_tier1',
      text: 'Ownership interest',
      publicDisplay: {
        title: 'Ownership interest',
        subject: 'Joint venture',
        facts: [{ label: 'Direct interest', value: 41.5, suffix: '%' }],
        sourceLabel: 'SEC filing',
        sourceUrls: ['https://www.sec.gov/Archives/edgar/data/1711929/example.htm'],
      },
    };
    const html = renderToStaticMarkup(createElement(StructuredObservationPayload, { observation }));
    expect(html).not.toContain('public-display-attribution');
    expect(html).not.toContain('本人申告');
  });
});
