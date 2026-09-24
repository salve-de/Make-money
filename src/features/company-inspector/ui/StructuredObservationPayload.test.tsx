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
