import { describe, expect, it } from 'vitest';
import { projectRadarPlayerProfit } from './radar-profit-display';
import type { MarketRadarTrendItem } from '@/platform/data/marketRadarData';

function trend(monthlyProfit: string): MarketRadarTrendItem {
  return {
    id: 'trend-test', badge: 'TEST', title: 'Test', subtitle: 'Test', growthRate: '+1%', heatScore: 1,
    sparklineData: [1], category: 'AI_INFRA', categoryLabel: 'Test', estimatedMonthlyProfit: monthlyProfit,
    difficulty: 'EASY',
    macroContext: { heading: 'h', whyNow: 'w', targetPainWallet: 'p' },
    gapAndProof: {
      incumbentGap: { incumbentName: 'i', fatalDilemma: 'd', incumbentPricing: 'p' },
      provenPlayer: { name: 'player', teamSize: '1', monthlyProfit, grossMargin: '未確認', paybackDays: '未確認', proofSnippet: 'proof' },
    },
    actionablePlaybook: {
      unbundlingAngle: 'a', first10CustomersLog: 'l', threeToolStack: [], totalMonthlyCost: '未確認',
      fatalPitfalls: 'f', pricingRecommendation: 'p',
    },
  };
}

describe('radar profit display', () => {
  it('never promotes a modeled radar range to an actual profit result', () => {
    expect(projectRadarPlayerProfit(trend('月利 200万〜600万円'))).toMatchObject({
      status: 'ESTIMATED', label: '月利推計', badge: 'EST', value: '月利 200万〜600万円',
    });
  });

  it('fails closed when the player profit is unknown', () => {
    expect(projectRadarPlayerProfit(trend('未確認'))).toMatchObject({
      status: 'UNKNOWN', badge: 'UNKNOWN', value: '未確認',
    });
  });
});
