import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RawObservation } from './FoundationInspectorPane';

describe('FoundationInspectorPane structured observations', () => {
  it('renders arbitrary nested observation payloads instead of dropping them', () => {
    const html = renderToStaticMarkup(
      <RawObservation item={{
        id: 'obs_1234567890abcdef12345678',
        kind: 'business_model.revenue_signal',
        text: 'Official report states annual revenue.',
        originType: 'reported',
        verificationStatus: 'SUPPORTED',
        observedAt: '2026-09-24T13:29:00Z',
        collectionTier: null,
        collectionChannel: 'web',
        observer: 'DISCOVERY',
        payloadSchemaRef: 'urn:test:structured:v1',
        payload: {
          amount: 123000000,
          currency: 'USD',
          nested: {
            arbitrary_future_field: true,
          },
        },
        evidenceIds: ['ev_1234567890abcdef12345678'],
      }} />,
    );

    expect(html).toContain('STRUCTURED PAYLOAD');
    expect(html).toContain('business_model.revenue_signal');
    expect(html).toContain('123000000');
    expect(html).toContain('arbitrary_future_field');
    expect(html).toContain('urn:test:structured:v1');
    expect(html).toContain('DISCOVERY');
  });
});
