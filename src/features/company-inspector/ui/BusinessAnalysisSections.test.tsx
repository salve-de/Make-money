import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { BusinessAnalysisSections } from './BusinessAnalysisSections';
import { ExecutiveIntuitiveSummary } from './ExecutiveIntuitiveSummary';

describe('restored case information', () => {
 it('renders both customer and pain and independent competitive explanations', () => {
  const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
  entity.essence = { whatItDoes: '事業の説明', targetCustomer: '飲食店の担当者', painRelief: '日報集計を省く' };
  entity.targetPainWallet = '週末の集計負荷';
  entity.strategy.moatDescription = '固有の配送網'; entity.strategy.incumbentDilemma = '既存契約との衝突';
  const html = renderToStaticMarkup(<ExecutiveIntuitiveSummary entity={entity} isHazardMode={false} formatMoney={String} />);
  for (const v of ['飲食店の担当者','週末の集計負荷','固有の配送網','既存契約との衝突']) expect(html).toContain(v);
 });
 it('restores action lists, acquisition cost and checklists without duplicates', () => {
  const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
  entity.acquisition = { primaryFunnel:'展示会', cacJpy:1200, tactics:['実演会'] };
  entity.strategy.actionPlaybook = ['商談相手の選定'];
  entity.lootBlueprint = { ...entity.lootBlueprint!, executionChecklist:['商談相手の選定','見積書作成'] };
  const html=renderToStaticMarkup(<BusinessAnalysisSections entity={entity} isHazardMode={false} formatMoney={String} isPro={false} />);
  for(const v of ['展示会','1200','実演会','商談相手の選定','見積書作成']) expect(html).toContain(v);
  expect(html.split('商談相手の選定')).toHaveLength(2);
 });
 it('does not expose premium detail when not entitled', () => {
  const entity=structuredClone(INSTITUTIONAL_ENTITIES[0]);
  entity.meta = { incumbentDilemma:{cannibalizationBarrier:'PRIVATE_DETAIL',scaleMismatchReason:'規模差',decisionSpeedAdvantage:'速度差'},pricingPower:{anchorComparison:'比較値',lossAversionTrigger:'損失',budgetCategory:'予算'},lockInMechanism:{dataHostage:'蓄積',workflowIntegration:'業務',switchingFriction:'移行'},capitalEfficiency:{cashConversionCycle:'前金',incrementalMargin:'限界利益',workingCapitalStrategy:'資金'} };
  const render=(isPro:boolean)=>renderToStaticMarkup(<BusinessAnalysisSections entity={entity} isHazardMode={false} formatMoney={String} isPro={isPro} />);
  expect(render(false)).not.toContain('PRIVATE_DETAIL');
  for(const v of ['PRIVATE_DETAIL','規模差','速度差','比較値','予算','蓄積','移行','前金','限界利益'])expect(render(true)).toContain(v);
 });
});
