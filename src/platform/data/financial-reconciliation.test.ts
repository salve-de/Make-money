import { expect, it } from 'vitest';
import { FINANCIAL_RECONCILIATIONS, omitUnreviewedFinancialClaims } from './financial-reconciliation';
import { findInstitutionalEntity, INSTITUTIONAL_ENTITIES, SOURCE_INSTITUTIONAL_ENTITIES } from './mockLedgerData';

it('replaces all audited unsupported P&L claims with sourced facts, not invented balanced costs', () => {
  expect(Object.keys(FINANCIAL_RECONCILIATIONS)).toHaveLength(18);
  for (const name of Object.keys(FINANCIAL_RECONCILIATIONS)) {
    const entity = INSTITUTIONAL_ENTITIES.find((row) => row.name === name)!;
    expect(entity, name).toBeDefined();
    expect(entity.pnl.isOperatingProfitUnconfirmed, name).toBe(true);
    expect(entity.pnl.isCostsUnconfirmed, name).toBe(true);
    expect(entity.pnl.isMarginUnconfirmed, name).toBe(true);
    expect(entity.pnl.isNetProfitUnconfirmed, name).toBe(true);
    expect(entity.pnl.operatingProfit, name).toBe(0);
    expect(entity.verifiedBadge, name).toBe(false);
    expect(entity.observationsStream?.[0]?.sourceUrl, name).toMatch(/^https:\/\//);
    expect(entity.observationsStream?.[0]?.observedAt, name).toBe('2026-09-11');
    const original = SOURCE_INSTITUTIONAL_ENTITIES.find((row) => row.id === entity.id)!;
    expect(original.pnl, name).not.toEqual(entity.pnl);
  }
});

it('keeps the Photo AI peak separate from stable MRR and aggregate profit', () => {
  const photo = findInstitutionalEntity('ent_photoai')!;
  expect(photo.pnl.revenueLabel).toBe('ピーク $161,000/月相当');
  expect(photo.evidenceCards?.[0].punchline).toContain('継続MRRではない');
  expect(photo.evidenceCards?.[0].details?.[0]).toContain('全事業合計');
  expect(JSON.stringify(photo.evidenceCards)).not.toMatch(/zsh\.|77\.3%|82%|1,800万/);
});

it('does not turn company-wide Ali Abdaal revenue or Chubbies EBITDA into course/operating profit', () => {
  const ali = INSTITUTIONAL_ENTITIES.find((row) => row.name === 'Ali Abdaal Courses')!;
  expect(ali.pnl.financialStatus).toBe('UNAVAILABLE');
  expect(ali.evidenceCards?.[0].metrics?.[0].label).toContain('全事業');
  const chubbies = INSTITUTIONAL_ENTITIES.find((row) => row.name === 'Chubbies')!;
  expect(chubbies.pnl.revenueLabel).toBe('2025年売上 $122.943M');
  expect(chubbies.pnl.isOperatingProfitUnconfirmed).toBe(true);
  expect(chubbies.evidenceCards?.[0].metrics).toContainEqual({ label: '2025年通期粗利益（売上−原価で算出）', value: '$71,194,000' });
  expect(122943000 - 51749000).toBe(71194000);
});

it('does not republish legacy financial claims in strategy, pricing, tool costs or timelines', () => {
  for (const name of Object.keys(FINANCIAL_RECONCILIATIONS)) {
    const entity = INSTITUTIONAL_ENTITIES.find((row) => row.name === name)!;
    const raw = SOURCE_INSTITUTIONAL_ENTITIES.find((row) => row.id === entity.id)!;
    expect(entity.operations.isCapitalUnconfirmed).toBe(true);
    expect(entity.isGrowthUnconfirmed).toBe(true);
    expect(entity.pricing?.estimatedLtvJpy).toBeUndefined();
    expect(entity.acquisition).toBeUndefined();
    expect(entity.operations.toolStack.map((tool) => tool.name)).toEqual(raw.operations.toolStack.map((tool) => tool.name));
    for (const tool of entity.operations.toolStack) {
      expect(tool.isCostUnconfirmed).toBe(true);
      expect(tool.monthlyCost).toBe(0);
    }
    const legacyText = JSON.stringify({ strategy: entity.strategy, pricing: entity.pricing,
      meta: entity.meta, exposure: entity.exposureAudit, moats: entity.dynamicMoats, timeline: entity.timelineEvents });
    expect(legacyText, name).not.toMatch(/[¥￥$%％]|\d[\d,.]*万円/);
  }
});

it('preserves unrelated factual sentences while withdrawing monetary claims', () => {
  const text = '画像を生成するサービス。月商1,300万円。創業者はPieter Levels。';
  expect(omitUnreviewedFinancialClaims(text)).toBe('画像を生成するサービス。 創業者はPieter Levels。');
});

it('preserves structural enum values containing financial letter sequences', () => {
  expect(omitUnreviewedFinancialClaims({ viabilityStatus: 'EVOLVING_BARRIER', status: 'ACTIVE_PLAYBOOK' })).toEqual({ viabilityStatus: 'EVOLVING_BARRIER', status: 'ACTIVE_PLAYBOOK' });
});
