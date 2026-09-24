import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StructuredObservationData } from './StructuredObservationData';

describe('StructuredObservationData', () => {
  it('renders unknown future structured fields instead of dropping them', () => {
    const html = renderToStaticMarkup(
      <StructuredObservationData
        schemaRef="urn:test:future-observation:v42"
        value={{
          amount: 123,
          nested: {
            must_survive_ui: true,
          },
          unknown_future_field: ['alpha', 'beta'],
        }}
      />,
    );

    expect(html).toContain('構造化データ');
    expect(html).toContain('urn:test:future-observation:v42');
    expect(html).toContain('must_survive_ui');
    expect(html).toContain('true');
    expect(html).toContain('unknown_future_field');
    expect(html).toContain('alpha');
  });

  it('renders nothing for an empty structured object', () => {
    const html = renderToStaticMarkup(
      <StructuredObservationData value={{}} />,
    );
    expect(html).toBe('');
  });
});
