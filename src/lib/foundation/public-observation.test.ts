import { describe, expect, it } from 'vitest';
import {
  PUBLIC_OBSERVATION_LIMITS,
  canAdmitPublicPayload,
  sanitizePublicObservationPayload,
} from './public-observation';

describe('public Observation payload limits', () => {
  it('accepts a bounded JSON-safe payload without changing it', () => {
    const input = {
      amount: 123000000,
      currency: 'USD',
      nested: { public_fact: true },
    };
    const result = sanitizePublicObservationPayload(input);
    expect(result?.value).toEqual(input);
    expect(result?.bytes).toBeGreaterThan(0);
  });

  it.each([
    ['string', { value: 'x'.repeat(PUBLIC_OBSERVATION_LIMITS.maxStringBytes + 1) }],
    ['array', Array.from({ length: PUBLIC_OBSERVATION_LIMITS.maxArrayItems + 1 }, (_, index) => index)],
    ['keys', Object.fromEntries(Array.from({ length: PUBLIC_OBSERVATION_LIMITS.maxObjectKeys + 1 }, (_, index) => [`k${index}`, index]))],
    ['depth', { a: { b: { c: { d: { e: { f: { g: true } } } } } } } }],
  ])('drops the whole public payload when the %s limit is exceeded', (_label, input) => {
    expect(sanitizePublicObservationPayload(input)).toBeNull();
  });

  it('drops a payload above the 16KiB serialized observation budget', () => {
    const input = {
      a: 'a'.repeat(4000),
      b: 'b'.repeat(4000),
      c: 'c'.repeat(4000),
      d: 'd'.repeat(4000),
      e: 'e'.repeat(1000),
    };
    expect(sanitizePublicObservationPayload(input)).toBeNull();
  });

  it('enforces the 64KiB entity aggregate budget without truncation', () => {
    expect(canAdmitPublicPayload(60 * 1024, 4 * 1024)).toBe(true);
    expect(canAdmitPublicPayload(60 * 1024, 4 * 1024 + 1)).toBe(false);
  });
});
