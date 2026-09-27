import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { UniversalObservation } from '@/shared/terminal';
import { StructuredObservationPayload } from './StructuredObservationPayload';

describe('StructuredObservationPayload', () => {
  it('renders reviewed ownership values and both SEC sources', () => {
    const observation: UniversalObservation = {
      id: 'obs_real_sec',
      text: 'Ownership interest',
      observationType: 'public_fact.v1',
      publicDisplay: {
        title: 'Ownership interest',
        subject: 'Joint venture',
        facts: [
          { label: 'Apollo-managed funds / affiliates', value: 41.5, suffix: '%' },
          { label: 'Starwood SREIT', value: 58.5, suffix: '%' },
        ],
        sourceLabel: 'SEC filing',
        sourceUrls: [
          'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332741/ck0001711929-20260803.htm',
          'https://www.sec.gov/Archives/edgar/data/1711929/000119312526332795/ck0001711929-20260804.htm',
        ],
      },
    };

    const html = renderToStaticMarkup(
      createElement(StructuredObservationPayload, { observation }),
    );

    expect(html).toContain('Apollo-managed funds / affiliates');
    expect(html).toContain('41.5%');
    expect(html).toContain('Starwood SREIT');
    expect(html).toContain('58.5%');
    expect(html).toContain('SEC filing 1');
    expect(html).toContain('SEC filing 2');
    expect(html).toContain('https://www.sec.gov/Archives/edgar/data/');
  });

  it('renders nothing when reviewed public display metadata is absent', () => {
    const html = renderToStaticMarkup(
      createElement(StructuredObservationPayload, {
        observation: {
          id: 'obs_text_only',
          text: 'Ownership interest',
        },
      }),
    );
    expect(html).toBe('');
  });
});
