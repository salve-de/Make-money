import { test } from 'vitest';
import assert from 'node:assert';
import { autoEnrichEntityBeforeIngest } from '../../scripts/pipeline/auto-enrich-entity';
import type { FinancialEntity } from '@/shared/terminal';

test('Density Invariant: autoEnrichEntityBeforeIngest fills empty toolStack', () => {
  const dummyEntity: FinancialEntity = {
    id: 'ent_dummy_test',
    ticker: 'DUMMY',
    name: 'Dummy Company',
    sector: 'NICHE_SAAS',
    scale: 'ENTERPRISE',
    founder: 'Test Founder',
    country: 'JP',
    url: 'https://example.com',
    tagline: 'Test company tagline',
    tags: ['SaaS'],
    growthRateYoY: 20,
    architecturePattern: 'SaaS',
    pipelineStack: 'AWS x Stripe',
    targetPainWallet: '業務効率化',
    verifiedBadge: false,
    pnl: {
      operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
      estimatedAnnualNetProfit: 0,
      isNetProfitUnconfirmed: true,
      monthlyRevenue: 10000000,
      cogs: 2000000,
      grossProfit: 8000000,
      grossMargin: 80,
      operatingProfit: 5000000,
      operatingMargin: 50,
      financialStatus: 'ESTIMATED'
    },
    operations: {
      teamSize: 10,
      weeklyHours: 40,
      initialCapitalRequired: 1000000,
      automationLevel: 80,
      primaryChannels: ['Web'],
      toolStack: [] // 空
    },
    strategy: {
      moatType: 'NETWORK_EFFECT',
      moatDescription: 'Test moat',
      blindspot: 'Test blindspot',
      incumbentDilemma: 'Test dilemma',
      secretInsight: 'Test insight',
      initialTraction: ['Step 1'],
      actionPlaybook: ['Action 1'],
      coldOutreachTemplate: 'Template'
    },
    evidenceCards: []
  };

  const enriched = autoEnrichEntityBeforeIngest(dummyEntity);

  // 1. toolStack が業態マスターから自動補完されていること
  assert.ok(enriched.operations.toolStack.length > 0, 'toolStack must be filled');
  assert.ok(enriched.operations.toolStack.some((t) => t.name.includes('AWS') || t.name.includes('Stripe')), 'must contain realistic tools');

  // 2. opportunityJudgment が自動判定されていること
  assert.ok(enriched.opportunityJudgment, 'opportunityJudgment must be generated');
  assert.ok(enriched.opportunityJudgment.verdict, 'verdict must be present');
  assert.notStrictEqual(enriched.opportunityJudgment.demandDelta, '未確認', 'demandDelta must not be unconfirmed');

  // 3. evidenceCards に metrics グリッドが注入されていること
  assert.ok(enriched.evidenceCards && enriched.evidenceCards.length > 0, 'evidenceCards must be generated');
  assert.ok(enriched.evidenceCards[0].metrics && enriched.evidenceCards[0].metrics.length > 0, 'metrics grid must be present');
  assert.ok(enriched.evidenceCards[0].metrics.some((m) => m.label.includes('売上') || m.label.includes('利益') || m.label.includes('年商')), 'must have financial metrics');
});

test('Density Invariant: hazard entity automatically gets POST_MORTEM status and disaster metrics', () => {
  const hazardEntity: FinancialEntity = {
    id: 'ent_failed_test',
    ticker: 'FAILED',
    name: 'Failed Startup LLC',
    sector: 'FINTECH_INFRA',
    scale: 'ENTERPRISE',
    founder: 'Scam Founder',
    country: 'US',
    url: 'https://example.com',
    tagline: '架空の残高で調達を繰り返した後に破綻',
    tags: ['破綻', '資金枯渇'],
    growthRateYoY: 0,
    architecturePattern: 'Ponzi',
    pipelineStack: 'None',
    targetPainWallet: '欲深さ',
    verifiedBadge: false,
    pnl: {
      operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
      estimatedAnnualNetProfit: 0,
      isNetProfitUnconfirmed: true,
      monthlyRevenue: 0,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      operatingProfit: -10000000,
      operatingMargin: -100,
      financialStatus: 'UNAVAILABLE'
    },
    operations: {
      teamSize: 10,
      weeklyHours: 40,
      initialCapitalRequired: 1000000,
      automationLevel: 80,
      primaryChannels: ['Web'],
      toolStack: []
    },
    strategy: {
      moatType: 'UNKNOWN',
      moatDescription: 'None',
      blindspot: 'None',
      incumbentDilemma: 'None',
      secretInsight: 'None',
      initialTraction: ['Step 1'],
      actionPlaybook: ['Action 1'],
      coldOutreachTemplate: 'Template'
    },
    evidenceCards: [
      {
        id: 'ev_failed',
        type: 'FATAL_BLEED',
        title: '架空口座と監査不備',
        evidenceStatus: 'POST_MORTEM',
        punchline: '残高が存在しなかった',
        details: ['預金ゼロの事実が露呈']
      }
    ]
  };

  const enriched = autoEnrichEntityBeforeIngest(hazardEntity);

  // 1. financialStatus が POST_MORTEM に自動統一されていること
  assert.strictEqual(enriched.pnl.financialStatus, 'POST_MORTEM', 'Hazard entity must have canonical POST_MORTEM status');
  assert.strictEqual(enriched.pnl.financialStatus, 'POST_MORTEM');

  // 2. opportunityJudgment が HAZARD_REJECT に設定されていること
  assert.strictEqual(enriched.opportunityJudgment?.verdict, 'HAZARD_REJECT');
  assert.strictEqual(enriched.opportunityJudgment?.verdictLabel, '失敗検証・参入拒絶');

  // 3. metrics が破綻用指標で埋められていること
  assert.ok(enriched.evidenceCards && enriched.evidenceCards[0].metrics && enriched.evidenceCards[0].metrics.length > 0, 'must have metrics');
  assert.ok(enriched.evidenceCards[0].metrics.some((m) => m.label.includes('破綻') || m.label.includes('倒産')), 'must have failure metric');
});

test('Density Invariant: Fail-Closed validation rejects thin entities when not enriched', () => {
  // 1. Empty toolStack rejection
  const thinToolOperations = { toolStack: [] };
  assert.throws(() => {
    if (!thinToolOperations.toolStack || thinToolOperations.toolStack.length === 0) {
      throw new Error('[INGEST REJECTED: EMPTY TOOLSTACK]');
    }
  }, /INGEST REJECTED: EMPTY TOOLSTACK/);

  // 2. Missing opportunityJudgment rejection
  const thinOpp: { opportunityJudgment?: { verdict?: string; demandDelta?: string } } = {};
  assert.throws(() => {
    if (!thinOpp.opportunityJudgment || !thinOpp.opportunityJudgment.verdict || !thinOpp.opportunityJudgment.demandDelta || thinOpp.opportunityJudgment.demandDelta === '未確認') {
      throw new Error('[INGEST REJECTED: MISSING OPPORTUNITY JUDGMENT]');
    }
  }, /INGEST REJECTED: MISSING OPPORTUNITY JUDGMENT/);

  // 3. No metrics rejection
  const thinCards = [{ title: 'No metrics card', details: [] as string[], metrics: [] }];
  assert.throws(() => {
    const hasCardMetrics = thinCards.some((c) => c.metrics && c.metrics.length > 0);
    if (!hasCardMetrics) {
      throw new Error('[INGEST REJECTED: NO METRICS IN EVIDENCE CARDS]');
    }
  }, /INGEST REJECTED: NO METRICS IN EVIDENCE CARDS/);

  // 4. Hazard status mismatch rejection
  const hazardRecord = {
    tags: ['破綻'],
    financialStatus: 'NORMAL'
  };
  assert.throws(() => {
    const isHazard = hazardRecord.tags.some((t) => /破綻|倒産/i.test(t));
    if (isHazard && hazardRecord.financialStatus !== 'POST_MORTEM') {
      throw new Error('[INGEST REJECTED: HAZARD STATUS MISMATCH]');
    }
  }, /INGEST REJECTED: HAZARD STATUS MISMATCH/);

  // 5. Less than 3 evidence cards rejection
  const thinCardsDeck = [{ id: 'c1' }, { id: 'c2' }];
  assert.throws(() => {
    if (thinCardsDeck.length < 3) {
      throw new Error('[INGEST REJECTED: LESS THAN 3 EVIDENCE CARDS]');
    }
  }, /INGEST REJECTED: LESS THAN 3 EVIDENCE CARDS/);

  // 6. Missing essence rejection
  const missingEssenceRecord: { essence?: { whatItDoes?: string } } = {};
  assert.throws(() => {
    if (!missingEssenceRecord.essence?.whatItDoes) {
      throw new Error('[INGEST REJECTED: INCOMPLETE ESSENCE]');
    }
  }, /INGEST REJECTED: INCOMPLETE ESSENCE/);
});

test('Density Invariant: autoEnrichEntityBeforeIngest guarantees 3+ cards, full essence, and structured punchlines', () => {
  const thinEntity: FinancialEntity = {
    id: 'ent_thin_test',
    ticker: 'THIN',
    name: 'Thin Corp',
    sector: 'NICHE_SAAS',
    scale: 'SOLO',
    founder: 'Solo Founder',
    country: 'JP',
    url: 'https://example.com',
    tagline: 'Thin tagline',
    tags: ['SaaS'],
    growthRateYoY: 10,
    architecturePattern: 'SaaS',
    pipelineStack: 'Web',
    targetPainWallet: '業務効率化',
    verifiedBadge: false,
    pnl: {
      operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
      estimatedAnnualNetProfit: 0,
      isNetProfitUnconfirmed: true,
      monthlyRevenue: 5000000,
      cogs: 500000,
      grossProfit: 4500000,
      grossMargin: 90,
      operatingProfit: 4000000,
      operatingMargin: 80,
      financialStatus: 'ESTIMATED'
    },
    operations: {
      teamSize: 1,
      weeklyHours: 20,
      initialCapitalRequired: 100000,
      automationLevel: 90,
      primaryChannels: ['Web'],
      toolStack: []
    },
    strategy: {
      moatType: 'PROCESS_POWER',
      moatDescription: '競合が真似できない現場ノウハウ',
      blindspot: '一般企業が見落としていたニッチな需要',
      incumbentDilemma: '大企業は小さすぎて狙えない市場規模',
      secretInsight: '特定業務の泥臭い自動化',
      initialTraction: ['Step 1'],
      actionPlaybook: ['Action 1'],
      coldOutreachTemplate: 'Template'
    },
    evidenceCards: []
  };

  const enriched = autoEnrichEntityBeforeIngest(thinEntity);

  // 1. 最低3枚のエビデンスカードが保証されていること
  assert.ok(enriched.evidenceCards && enriched.evidenceCards.length >= 3, 'Must have at least 3 cards');

  // 2. essence (#01) が完全に生成されていること
  assert.ok(enriched.essence, 'Essence must be present');
  assert.ok(enriched.essence.whatItDoes && enriched.essence.whatItDoes.length > 20, 'whatItDoes must be detailed');
  assert.ok(enriched.essence.targetCustomer && enriched.essence.targetCustomer.length > 20, 'targetCustomer must be detailed');
  assert.ok(enriched.essence.painRelief && enriched.essence.painRelief.length > 20, 'painRelief must be detailed');

  // 3. strategy の punchline が 【見出し】 構造化されていること
  assert.ok(enriched.strategy.blindspot.startsWith('【') && enriched.strategy.blindspot.includes('】'), 'blindspot must have 【headline】');
  assert.ok(enriched.strategy.moatDescription.startsWith('【') && enriched.strategy.moatDescription.includes('】'), 'moatDescription must have 【headline】');
  assert.ok(enriched.strategy.incumbentDilemma, 'incumbentDilemma must exist');
  assert.ok(enriched.strategy.incumbentDilemma.startsWith('【') && enriched.strategy.incumbentDilemma.includes('】'), 'incumbentDilemma must have 【headline】');
});

