import assert from 'node:assert';
import { test } from 'vitest';
import { autoEnrichEntityBeforeIngest } from '../../scripts/pipeline/auto-enrich-entity';
import type { FinancialEntity } from '@/shared/terminal';

function makeEntity(): FinancialEntity {
  return {
    id: 'ent_ingest_test',
    ticker: 'TEST',
    name: 'Ingest Test Company',
    sector: 'NICHE_SAAS',
    scale: 'SOLO',
    founder: 'Test Founder',
    country: 'JP',
    url: 'https://example.com',
    tagline: '確認済みの入力だけを保持するテスト事業',
    tags: ['SaaS'],
    growthRateYoY: 10,
    architecturePattern: '未確認',
    pipelineStack: '未確認',
    targetPainWallet: '業務効率化',
    verifiedBadge: false,
    pnl: {
      operatingExpenses: {
        serverAndApi: 0,
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 0,
        other: 0,
      },
      estimatedAnnualNetProfit: 0,
      isNetProfitUnconfirmed: true,
      monthlyRevenue: 0,
      isRevenueUnconfirmed: true,
      cogs: 0,
      grossProfit: 0,
      grossMargin: 0,
      operatingProfit: 0,
      operatingMargin: 0,
      financialStatus: 'UNAVAILABLE',
    },
    operations: {
      teamSize: 1,
      weeklyHours: 0,
      initialCapitalRequired: 0,
      automationLevel: 0,
      primaryChannels: [],
      toolStack: [],
    },
    strategy: {
      moatType: 'UNKNOWN',
      moatDescription: '未確認',
      blindspot: '未確認',
      incumbentDilemma: '未確認',
      secretInsight: '未確認',
      initialTraction: [],
      actionPlaybook: [],
      coldOutreachTemplate: '',
    },
    evidenceCards: [],
  };
}

test('ingest sanitizer preserves unknown tools and missing evidence instead of fabricating facts', () => {
  const enriched = autoEnrichEntityBeforeIngest(makeEntity());

  assert.deepStrictEqual(enriched.operations.toolStack, []);
  assert.deepStrictEqual(enriched.evidenceCards, []);
  assert.strictEqual(enriched.opportunityJudgment, undefined);
  assert.strictEqual(enriched.essence, undefined);
  assert.ok(enriched.tags.includes('収集事例'));
  assert.doesNotMatch(JSON.stringify(enriched), /Stripe Billing|Snowflake|Datadog|粗利80%/);
});

test('ingest sanitizer never pads an existing evidence deck to an arbitrary card count', () => {
  const entity = makeEntity();
  entity.evidenceCards = [{
    id: 'ev_observed',
    type: 'THE_CRIME',
    title: '確認済み観測',
    evidenceStatus: 'VERIFIED',
    punchline: '確認済みの事実だけを保持',
    details: ['原文に存在する記録'],
  }];

  const enriched = autoEnrichEntityBeforeIngest(entity);

  assert.strictEqual(enriched.evidenceCards?.length, 1);
  assert.strictEqual(enriched.evidenceCards?.[0]?.id, 'ev_observed');
  assert.strictEqual(enriched.evidenceCards?.[0]?.metrics, undefined);
});

test('hazard normalization changes only deterministic status/tag metadata and does not invent evidence', () => {
  const entity = makeEntity();
  entity.tags = ['破綻'];
  entity.evidenceCards = [{
    id: 'ev_failed',
    type: 'FATAL_BLEED',
    title: '既存の破綻証拠',
    evidenceStatus: 'POST_MORTEM',
    punchline: '資金が尽きた事実を確認',
    details: ['確認済みの破綻記録'],
  }];

  const enriched = autoEnrichEntityBeforeIngest(entity);

  assert.strictEqual(enriched.pnl.financialStatus, 'POST_MORTEM');
  assert.ok(enriched.tags.includes('失敗・撤退の検証'));
  assert.strictEqual(enriched.evidenceCards?.length, 1);
  assert.strictEqual(enriched.evidenceCards?.[0]?.metrics, undefined);
  assert.strictEqual(enriched.opportunityJudgment, undefined);
});

test('sanitization removes internal jargon without manufacturing a business narrative', () => {
  const entity = makeEntity();
  entity.strategy.blindspot = 'サバンナOSとカニバリズム障壁を確認';
  entity.tagline = '地雷検死の原文';
  entity.pnl.financialStatus = 'ESTIMATED';

  const enriched = autoEnrichEntityBeforeIngest(entity);
  const serialized = JSON.stringify(enriched);

  assert.doesNotMatch(serialized, /サバンナOS|カニバリズム障壁|地雷検死/);
  assert.match(enriched.strategy.blindspot, /人間の本能・心理の急所/);
  assert.match(enriched.strategy.blindspot, /大企業のジレンマ/);
  assert.strictEqual(enriched.pnl.financialStatus, 'ESTIMATED');
  assert.ok(!Object.prototype.hasOwnProperty.call(enriched, 'financialStatus'));
});
