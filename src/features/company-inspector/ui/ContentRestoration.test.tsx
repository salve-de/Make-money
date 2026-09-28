import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { INSTITUTIONAL_ENTITIES } from '@/platform/data/mockLedgerData';
import { aggregateMacroIntelligence } from '@/lib/intelligence/macro-aggregator';
import { MARKET_RADAR_TRENDS } from '@/platform/data/marketRadarData';
import { GenesisSection, GoldenStackSection } from '@/platform/components/playbook/GenesisAndStackSection';
import { RadarOpportunityDetail } from '@/platform/components/radar/RadarOpportunityDetail';
import { SourcesSection } from './SourcesSection';
import { ToolRadarSection } from '@/platform/components/playbook/ToolRadarSection';
import { TOOL_CATEGORIES } from '@/lib/intelligence/macro-aggregator';
import { ExecutiveIntuitiveSummary } from './ExecutiveIntuitiveSummary';

describe('case content remains accessible in compact layouts', () => {
  it('renders the business headline, lead and substantive analysis alongside metrics', () => {
    const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
    entity.tagline = '事業固有の短い要約';
    entity.strategy.secretInsight = '固有の収益構造の説明';
    entity.strategy.blindspot = '具体的な競争上の着眼点';
    const html = renderToStaticMarkup(<ExecutiveIntuitiveSummary entity={entity} isHazardMode={false} formatMoney={String} />);
    expect(html).toContain(entity.tagline);
    expect(html).toContain(entity.strategy.secretInsight);
    expect(html).toContain(entity.strategy.blindspot);
  });

  it('keeps summaries, steps and tool roles even without a predefined guide', () => {
    const data = aggregateMacroIntelligence([]);
    const tactic = { ...data.genesisTactics[0], id: 'new-tactic', summary: '初動獲得の具体的な記録', executionSteps: ['具体的な最初の手順'] };
    const recipe = { ...data.goldenStackRecipes[0], id: 'new-recipe', tools: [{ category: '保存', toolName: 'Example DB', role: '顧客ごとの履歴を保存' }] };
    const html = renderToStaticMarkup(<><GenesisSection genesisTactics={[tactic]} /><GoldenStackSection goldenStackRecipes={[recipe]} /></>);
    expect(html).toContain(tactic.summary);
    expect(html).toContain(tactic.executionSteps[0]);
    expect(html).toContain(recipe.tools[0].role);
    expect(html).toContain('構成案の前提・費用');
  });

  it('keeps the concrete opportunity plan when a trend has no display guide', () => {
    const trend = structuredClone(MARKET_RADAR_TRENDS[0]);
    trend.id = 'new-trend';
    trend.actionablePlaybook.unbundlingAngle = '具体的な参入の切り口';
    trend.actionablePlaybook.first10CustomersLog = '具体的な顧客獲得案';
    const html = renderToStaticMarkup(<RadarOpportunityDetail trend={trend} />);
    expect(html).toContain(trend.actionablePlaybook.unbundlingAngle);
    expect(html).toContain(trend.actionablePlaybook.first10CustomersLog);
    expect(html).toContain('ツール構成・費用案');
  });
  it('preserves source titles without requiring a URL', () => {
    const entity = structuredClone(INSTITUTIONAL_ENTITIES[0]);
    entity.url = '';
    entity.evidenceCards = [{ id: 'source', type: 'SMOKING_GUN', title: '資料', evidenceStatus: 'REPORTED', punchline: '記録', sourceNote: '2025年 決算説明資料 12ページ' }];
    expect(renderToStaticMarkup(<SourcesSection entity={entity} isHazardMode={false} />)).toContain('2025年 決算説明資料 12ページ');
  });

  it('keeps collected tools without a hardcoded product guide', () => {
    const category = TOOL_CATEGORIES[0];
    const html = renderToStaticMarkup(<ToolRadarSection selectedToolCategory={category.key} setSelectedToolCategory={() => {}} activeCategoryMeta={category} activeCategoryRadar={{ category: category.key, categoryLabel: category.label, timeline: [], summaryInsight: '', tools: [{ name: 'New collected tool', currentShare: 0, deltaShare: 0, trendDirection: 'FLAT', historyShares: [], estimatedCost: '', detectionMethod: '', whyMigrating: '事例固有の利用目的', proofQuote: '', usedByEntities: [] }] }} />);
    expect(html).toContain('New collected tool');
    expect(html).toContain('事例固有の利用目的');
  });

});
