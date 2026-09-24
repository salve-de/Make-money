import { describe, expect, it } from 'vitest';
import { readableObservationText } from './text-cleaner';

function record(payload: unknown): string {
  return JSON.stringify({
    observation_type: 'test.payload',
    payload,
  });
}

describe('readableObservationText typed payloads', () => {
  it.each([
    [['alpha', 2, true], '[alpha, 2, true]'],
    ['plain payload', 'plain payload'],
    [42, '42'],
    [false, 'false'],
    [null, 'null'],
  ])('renders schema-valid non-object payload %j', (payload, expected) => {
    expect(readableObservationText(record(payload))).toContain(expected);
  });

  it('prefers object summary and otherwise formats nested structure', () => {
    expect(readableObservationText(record({ summary: 'Preferred summary', amount: 21 })))
      .toBe('Preferred summary');
    const fallback = readableObservationText(record({
      special_dividend: { aggregate_amount: 58350533, currency: 'USD' },
    }));
    expect(fallback).toContain('special dividend');
    expect(fallback).toContain('58350533');
  });

  it('suppresses the lossless transport envelope from readable UI text', () => {
    expect(readableObservationText('typed-record-set.v1 transport payload')).toBeNull();
    expect(readableObservationText(JSON.stringify({
      observation_type: 'transport.typed_record_set_v1',
      payload: { hidden: true },
    }))).toBeNull();
  });
});
