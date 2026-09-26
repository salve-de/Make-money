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
      publicRights: {
        commercialUse: 'allowed',
        publicFactDisplay: 'allowed',
        projectionMode: 'fact_only',
        sourceContentPublicDisplay: 'restricted',
        sourceContentRedistribution: 'restricted',
        publicExcerptDisplay: 'restricted',
        publicMediaDisplay: 'blocked',
        providers: ['U.S. Securities and Exchange Commission'],
        attribution: [
          'Cite the SEC/EDGAR filing URL and identify the filing source; do not imply SEC endorsement.',
        ],
        reviewedAt: ['2026-09-25T04:18:00+09:00'],
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
    expect(html).toContain('公開・権利');
    expect(html).toContain('商用表示: 許可');
    expect(html).toContain('公開方式: 事実のみ');
    expect(html).toContain('原文再配布: 制限あり');
    expect(html).toContain('画像・メディア: 非公開');
    expect(html).toContain('U.S. Securities and Exchange Commission');
    expect(html).toContain('Cite the SEC/EDGAR filing URL');
    expect(html).toContain('権利確認: 2026-09-25');
    expect(html).not.toContain('type starwood_apollo.minority_equity_recapitalization.v1');
  });
});
