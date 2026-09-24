import { describe, expect, it } from 'vitest';
import {
  adaptFoundationDetailToFinancialEntity,
  adaptFoundationSummaryToFinancialEntity,
  isFoundationDossierReady,
} from './foundation-adapter';
import {
  buildFoundationBusinessCaseForEntity,
  type FoundationValueSummary,
} from './business-reader';

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
  it.each(['Equityfinancing: equity_financing=25M USD [2026-09-20] ・ 確認済', 'Seriesd: series_D=114M USD ・ 確認済', 'Primaryseriesf: primary_series_f=233000000 USD ・ 確認済', 'Acquisition price: $10M', 'Valuation: $100M'])('does not turn a non-revenue money signal into monthly sales: %s', moneySignal => {
    const adapted=adaptFoundationSummaryToFinancialEntity(summary({valueProfile:{...summary().valueProfile,moneySignal}}));
    expect(adapted.pnl.isRevenueUnconfirmed).toBe(true);
    expect(adapted.pnl.monthlyRevenue).toBe(0);
    expect(adapted.pnl.sourceDoc).toBeTruthy();
    expect(adapted.publishability).toBe('PUBLISHABLE');
  });
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

  it('publishes evidence-backed Foundation summaries without requiring a domain', () => {
    const adapted = adaptFoundationSummaryToFinancialEntity(summary({
      domain: null,
      canonicalIdentifier: null,
      evidenceIds: ['ev_offline_business'],
      valueProfile: {
        ...summary().valueProfile,
        counts: {
          ...summary().valueProfile.counts,
          evidence: 1,
        },
      },
    }));

    expect(adapted.publishability).toBe('PUBLISHABLE');
    expect(adapted.url).toBe('');
  });

  it('keeps evidence-free Foundation summaries raw even when URL is absent', () => {
    const adapted = adaptFoundationSummaryToFinancialEntity(summary({
      domain: null,
      canonicalIdentifier: null,
      evidenceIds: [],
      valueProfile: {
        ...summary().valueProfile,
        counts: {
          ...summary().valueProfile.counts,
          evidence: 0,
        },
      },
    }));

    expect(adapted.publishability).toBe('RAW');
  });


  it('does not invent SaaS mechanics for an offline manufacturing business', () => {
    const base = summary();
    const adapted = adaptFoundationSummaryToFinancialEntity(summary({
      entityType: 'manufacturer',
      domain: null,
      evidenceIds: ['ev_factory'],
      valueProfile: {
        ...base.valueProfile,
        businessSignal: 'Industrial manufacturing factory serving regional customers',
        mechanismSignal: 'Physical production line and equipment',
        counts: {
          ...base.valueProfile.counts,
          evidence: 1,
        },
      },
    }));

    expect(adapted.publishability).toBe('PUBLISHABLE');
    expect(adapted.sector).toBe('MONOPOLY_MFG');
    expect(adapted.architecturePattern).toBe('製造事業');
    expect(adapted.tags).toContain('製造・産業');
    expect(adapted.tags).not.toContain('SaaS・ツール');
    expect(adapted.evidenceCards?.map((card) => [card.punchline, ...(card.details || [])].join(' ')).join(' '))
      .not.toMatch(/Stripe|サブスクリプション|年払い|高利益率/);
  });

  it('uses explicit unknown labels when industry cannot be established', () => {
    const adapted = adaptFoundationSummaryToFinancialEntity(summary({
      entityType: 'business',
      domain: null,
      evidenceIds: ['ev_unknown'],
    }));

    expect(adapted.sector).toBe('UNKNOWN');
    expect(adapted.architecturePattern).toBe('事業型未確認');
    expect(adapted.tags).toContain('業種未確認');
    expect(adapted.tags).not.toContain('SaaS・ツール');
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

  it('carries structured Foundation observations into the universal intelligence stream', () => {
    const entityId = 'ent_business_bbbbbbbbbbbbbbbbbbbb';
    const detail = buildFoundationBusinessCaseForEntity({
      schema_version: 'research-bundle.v1',
      run_id: 'run_adapter_structured',
      retrieved_at: '2026-09-25T00:00:00Z',
      entities: [{
        entity_id: entityId,
        entity_type: 'business',
        canonical_name: 'Adapter Structured Co',
        aliases: [],
        canonical_identifier: null,
        domain: null,
        status: 'operating',
        observed_at: '2026-09-25T00:00:00Z',
        evidence_ids: ['ev_adapter'],
      }],
      claims: [],
      metrics: [],
      money_signals: [],
      events: [],
      relationships: [],
      observations: [{
        observation_id: 'obs_bbbbbbbbbbbbbbbbbbbbbbbb',
        observation_type: 'future.adapter.signal',
        entity_ids: [entityId],
        text: 'Adapter structured observation',
        origin_type: 'reported',
        verification_status: 'SUPPORTED',
        observed_at: '2026-09-25T00:00:00Z',
        collection_channel: 'web',
        observer: 'DISCOVERY',
        evidence_ids: ['ev_adapter'],
        payload_schema_ref: 'urn:test:adapter:v1',
        payload: {
          nested: { visible: true },
        },
        unknown_future_field: {
          still_visible: true,
        },
      }],
      derived: [],
    }, {
      id: entityId,
      name: 'Adapter Structured Co',
      entityType: 'business',
      aliases: [],
      canonicalIdentifier: null,
      domain: null,
      status: 'operating',
      observedAt: '2026-09-25T00:00:00Z',
      evidenceIds: ['ev_adapter'],
    });

    const adapted = adaptFoundationDetailToFinancialEntity(detail);
    const observation = adapted.observationsStream?.find(
      (item) => item.id === 'obs_bbbbbbbbbbbbbbbbbbbbbbbb',
    );
    expect(observation).toBeTruthy();
    expect(observation).toMatchObject({
      observationType: 'future.adapter.signal',
      collectionChannel: 'web',
      payloadSchemaRef: 'urn:test:adapter:v1',
      payload: {
        nested: { visible: true },
      },
      evidenceIds: ['ev_adapter'],
    });
    expect(observation?.structuredData?.unknown_future_field).toEqual({
      still_visible: true,
    });
  });

});
