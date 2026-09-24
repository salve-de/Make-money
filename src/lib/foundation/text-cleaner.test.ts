import { describe, expect, it } from 'vitest';
import { readableObservationText } from './text-cleaner';

describe('readableObservationText', () => {
  it('suppresses the typed transport envelope from human-facing projections', () => {
    expect(readableObservationText('typed-record-set.v1 transport payload')).toBeNull();
    expect(readableObservationText(JSON.stringify({
      observation_type: 'transport.typed_record_set_v1',
      transport_typed_record_set_v1: { schema_version: 'typed-record-set.v1' },
      payload: { summary: 'must stay hidden' },
    }))).toBeNull();
  });

  it('renders deterministic structured fallback text when payload.summary is absent', () => {
    const text = readableObservationText(JSON.stringify({
      observation_type: 'transaction.rmt.current_estimated_adjustment',
      payload: {
        special_dividend: {
          aggregate_amount: 58350533,
          currency: 'USD',
        },
        expected_post_close_ownership: {
          gentherm: '56.4%',
          spinco: '43.6%',
        },
      },
    }));

    expect(text).toContain('transaction.rmt.current_estimated_adjustment:');
    expect(text).toContain('special_dividend.aggregate_amount=58350533');
    expect(text).toContain('expected_post_close_ownership.gentherm=56.4%');
    expect(text).not.toContain('[object Object]');
  });
});
