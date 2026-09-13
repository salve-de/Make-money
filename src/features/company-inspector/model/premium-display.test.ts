import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { PlaybookSections } from '../ui/PlaybookSections';

const base = INSTITUTIONAL_ENTITIES[0];
const secrets = Array.from({ length: 12 }, (_, i) => `CONFIDENTIAL_FIELD_${i + 1}_END`);
const meta = {
  incumbentDilemma: { cannibalizationBarrier: secrets[0], scaleMismatchReason: secrets[1], decisionSpeedAdvantage: secrets[2] },
  pricingPower: { anchorComparison: secrets[3], lossAversionTrigger: secrets[4], budgetCategory: secrets[5] },
  lockInMechanism: { dataHostage: secrets[6], workflowIntegration: secrets[7], switchingFriction: secrets[8] },
  capitalEfficiency: { cashConversionCycle: secrets[9], incrementalMargin: secrets[10], workingCapitalStrategy: secrets[11] },
};
function render(isPro: boolean, includeMeta: boolean, hasEvidenceCards = true) {
  return renderToStaticMarkup(createElement(PlaybookSections, {
    entity: { ...base, hasPremiumAnalysis: true, meta: includeMeta ? meta : undefined },
    onOpenPro: () => {}, isPro, formatMoney: String, isHazardMode: false, hasEvidenceCards,
  }));
}
it('shows a locked placeholder without receiving a premium payload, including with free evidence', () => {
  const html = render(false, false);
  expect(html).toContain('PROプランの内容を確認する');
  expect(html).not.toContain('機関解錠済');
});
it('never embeds confidential text for a free user even if a caller supplies meta', () => {
  for (const hasEvidence of [true, false]) {
    const html = render(false, true, hasEvidence);
    for (const secret of secrets) expect(html).not.toContain(secret);
    expect(html).not.toContain('blur-');
  }
});
it('renders all twelve fields only after entitlement and actual payload are present', () => {
  const html = render(true, true);
  for (const secret of secrets) expect(html).toContain(secret);
  expect(html).toContain('機関解錠済');
  expect(html).not.toContain('PROプランの内容を確認する');
});
it('does not claim successful unlocking when the entitled request lacks its payload', () => {
  const html = render(true, false);
  expect(html).toContain('PRO分析を取得できていません');
  expect(html).not.toContain('機関解錠済');
  expect(html).not.toContain('PROプランの内容を確認する');
});
