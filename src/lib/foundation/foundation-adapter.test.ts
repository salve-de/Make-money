import { describe, expect, it } from 'vitest';
import { isFoundationDossierReady } from './foundation-adapter';
import type { FoundationValueSummary } from './business-reader';

function summary(overrides: Partial<FoundationValueSummary> = {}): FoundationValueSummary {
  return {
    id: 'ent_demo_0123456789abcdef0123',
    name: 'Demo company',
    entityType: 'company',
    aliases: [],
    canonicalIdentifier: null,
    domain: null,
    status: 'ACTIVE',
    observedAt: '2026-09-09T00:00:00Z',
    evidenceIds: ['evidence-1'],
    valueProfile: {
      tier: 'CANDIDATE',
      score: 2,
      labels: [],
      businessSignal: null,
      painSignal: null,
      moneySignal: null,
      tractionSignal: null,
      mechanismSignal: null,
      timeSignal: '2026-09-09 ・ 観測',
      counts: { claims: 0, metrics: 0, moneySignals: 0, events: 0, observations: 0, derived: 0, evidence: 1 },
    },
    ...overrides,
  };
}

describe('Foundation display boundary', () => {
  it('keeps candidate summaries out of the main ledger', () => {
    expect(isFoundationDossierReady(summary())).toBe(false);
  });

  it('requires a high-density, evidence-backed projection before replacement', () => {
    expect(isFoundationDossierReady(summary({
      evidenceIds: ['evidence-1', 'evidence-2'],
      valueProfile: {
        tier: 'HIGH_SIGNAL',
        score: 10,
        labels: ['事業', '課題', '価格/財務', '初動/成長', '仕組み', '時系列'],
        businessSignal: '事業',
        painSignal: '課題',
        moneySignal: '売上',
        tractionSignal: '初動',
        mechanismSignal: '仕組み',
        timeSignal: '時系列',
        counts: { claims: 2, metrics: 2, moneySignals: 1, events: 1, observations: 2, derived: 1, evidence: 2 },
      },
    }))).toBe(true);
  });

  it('does not treat a low-evidence high-signal label as complete', () => {
    expect(isFoundationDossierReady(summary({
      valueProfile: {
        ...summary().valueProfile,
        tier: 'HIGH_SIGNAL',
        score: 10,
        labels: ['事業', '課題', '価格/財務', '初動/成長', '仕組み'],
      },
    }))).toBe(false);
  });
});
