import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FoundationEvidenceContext, RawObservation } from './FoundationInspectorPane';

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

  it('renders rights-filtered evidence metadata and quality state', () => {
    const html = renderToStaticMarkup(
      <FoundationEvidenceContext
        sources={[{
          id: 'src.test.official',
          providerName: 'Structured Demo',
          sourceType: 'official_release',
          canonicalUrl: 'https://example.com/report',
          sourceStrength: 'A',
          rightsStatus: 'metadata_only',
          rightsPolicyId: 'rights.test.v1',
        }]}
        evidence={[{
          id: 'ev_1234567890abcdef12345678',
          sourceId: 'src.test.official',
          sourceUrl: 'https://example.com/report',
          sourceTitle: 'Structured Demo report',
          sourceType: 'official_release',
          publisherOrSpeaker: 'Structured Demo',
          publishedAt: '2026-09-24T13:00:00Z',
          retrievedAt: '2026-09-24T13:29:00Z',
          sourceStrength: 'A',
          rightsStatus: 'metadata_only',
          rightsPolicyId: 'rights.test.v1',
          summary: 'Official structured evidence.',
          extractedFacts: ['Revenue was reported.'],
        }]}
        quality={{
          unknowns: ['margin remains unknown'],
          conflicts: ['revenue timing differs across disclosures'],
          warnings: ['verify next filing'],
          schemaValidation: 'PASS',
        }}
      />,
    );

    expect(html).toContain('EVIDENCE METADATA');
    expect(html).toContain('Structured Demo report');
    expect(html).toContain('Revenue was reported.');
    expect(html).toContain('QUALITY / UNCERTAINTY');
    expect(html).toContain('margin remains unknown');
    expect(html).toContain('revenue timing differs across disclosures');
    expect(html).toContain('rights.test.v1');
  });

});
