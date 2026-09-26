import { describe, expect, it } from 'vitest';
import { publicFoundationObservations } from './public-entity';
import type { FoundationObservation } from '@/lib/foundation/business-reader';

function observation(id: string, publicPayload?: unknown): FoundationObservation {
  return {
    id,
    kind: 'business_model.test',
    text: `Observation ${id}`,
    originType: 'reported',
    verificationStatus: 'SUPPORTED',
    observedAt: '2026-09-24T13:29:00Z',
    evidenceIds: ['ev_public'],
    ...(publicPayload === undefined ? {} : { publicPayload }),
  };
}

describe('Foundation Observation public wire projection', () => {
  it('enforces the 64KiB per-entity structured payload budget', () => {
    const payload = {
      a: 'a'.repeat(3800),
      b: 'b'.repeat(3800),
      c: 'c'.repeat(3800),
      d: 'd'.repeat(3800),
    };
    const projected = publicFoundationObservations([
      observation('obs_1', payload),
      observation('obs_2', payload),
      observation('obs_3', payload),
      observation('obs_4', payload),
      observation('obs_5', payload),
    ]);

    expect(projected.slice(0, 4).every((item) => item.publicPayload !== undefined)).toBe(true);
    expect(projected[4]).not.toHaveProperty('publicPayload');
    expect(projected).toHaveLength(5);
  });

  it('allowlists reviewed public display metadata without exposing raw fields', () => {
    const projected = publicFoundationObservations([{
      ...observation('obs_display', { visible: true }),
      publicDisplay: {
        title: 'JV ownership',
        subject: 'Starwood affordable-housing JV',
        note: 'Apollo-managed funds / affiliates, not a direct Apollo corporate holding.',
        facts: [{ label: 'Apollo-managed funds / affiliates', value: 41.5, suffix: '%' }],
        sourceLabel: 'SEC filing',
        sourceUrls: ['https://www.sec.gov/Archives/edgar/data/1711929/example.htm'],
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
        attribution: ['Cite SEC/EDGAR filing URL.'],
        reviewedAt: ['2026-09-25T04:18:00+09:00'],
        internal_policy_id: 'must-not-cross-wire',
      },
      payload: { raw_secret: true },
    } as FoundationObservation & Record<string, unknown>]);

    expect(projected[0]).toMatchObject({
      publicPayload: { visible: true },
      publicDisplay: {
        title: 'JV ownership',
        facts: [{ label: 'Apollo-managed funds / affiliates', value: 41.5, suffix: '%' }],
        sourceLabel: 'SEC filing',
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
        attribution: ['Cite SEC/EDGAR filing URL.'],
        reviewedAt: ['2026-09-25T04:18:00+09:00'],
      },
    });
    expect(projected[0]).not.toHaveProperty('payload');
    expect(projected[0]?.publicRights).not.toHaveProperty('internal_policy_id');
  });

  it('never emits collection-only or raw/internal Observation fields', () => {
    const projected = publicFoundationObservations([{
      ...observation('obs_internal', { visible: true }),
      collectionTier: 'CORE',
      collectionChannel: 'web',
      observer: 'DISCOVERY',
      payloadSchemaRef: 'urn:internal:schema',
      payload: { secret: true },
      transport_typed_record_set_v1: { secret: true },
    } as FoundationObservation & Record<string, unknown>]);

    expect(projected[0]).toEqual({
      id: 'obs_internal',
      kind: 'business_model.test',
      text: 'Observation obs_internal',
      originType: 'reported',
      verificationStatus: 'SUPPORTED',
      observedAt: '2026-09-24T13:29:00Z',
      evidenceIds: ['ev_public'],
      publicPayload: { visible: true },
    });
  });
});
