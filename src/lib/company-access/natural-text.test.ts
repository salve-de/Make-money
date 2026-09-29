import { describe, expect, it } from 'vitest';
import type { FinancialEntity } from '@/shared/terminal';
import { hasUnverifiedAiNarrative, isTemplateSentence, naturalizeEntity } from './natural-text';
import { publicEntity, publicSummaryEntity } from './public-entity';

const PAIN = '特定業務における複雑な手作業やスプレッドシート管理による作業ミス、および高額な汎用システムを使いこなせない現場の非効率';

function entity(overrides: Partial<FinancialEntity> & Record<string, unknown> = {}): FinancialEntity {
  return {
    id: 'ent_coaches',
    ticker: 'COACH',
    name: 'Aaron Wilbur (Founder of The Coaches Site)',
    founder: 'Aaron Wilbur',
    tagline: 'ホッケーコーチ向けカンファレンスの録画を、会員制の動画ライブラリに変えた事例。',
    sector: 'CONTENT_MEDIA',
    scale: 'SOLO',
    country: 'CA',
    url: 'https://thecoachessite.com/',
    verifiedBadge: false,
    pnl: {
      monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
      operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
      operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0,
      isRevenueUnconfirmed: true, financialStatus: 'REPORTED',
    },
    operations: {
      teamSize: 0, isTeamSizeUnconfirmed: true, weeklyHours: 0, initialCapitalRequired: 0,
      automationLevel: 0, primaryChannels: [], toolStack: [],
    },
    strategy: {
      blindspot: '伝統的な対面公証人が紙と印鑑に固執し、深夜の緊急な公証ニーズに対応できない死角',
      moatType: 'SWITCHING_COST',
      moatDescription: '法的に認可された遠隔公証人ライセンス',
      secretInsight: '市場の盲点を突き、遠隔オンライン公証代行に特化することで超過利潤を維持する構造。',
      initialTraction: [
        '1. 初期接点：Aaron Wilburのコアとなる解決策をコミュニティや現場に直接提示',
        '2. 急所直撃：「平日に役所へ行く手間」を解消して初期利用者の信頼を即座に獲得',
        '3. 収益化：公証手数料配管により、広告費に依存せず安定した現金キャッシュフローを確立',
      ],
      actionPlaybook: [],
    },
    essence: {
      whatItDoes: '2010年に始めたホッケーコーチ向けカンファレンスの録画を、会員制の動画ライブラリとして提供。',
      targetCustomer: PAIN,
      painRelief: PAIN,
    },
    targetPainWallet: PAIN,
    architecturePattern: 'Aaron Wilbur式業務特化クラウド・月額定額直収配管',
    pipelineStack: 'Next.js × Stripe',
    tags: [],
    opportunityJudgment: {
      verdict: 'ENTRY_CANDIDATE',
      verdictLabel: '参入候補・再現検証',
      oneLineReason: '【Aaron Wilburの攻略判定】 大手が「死角」を放置する中、Aaron Wilburは「痛み」を直撃して高利益率現金を独占。',
      demandDelta: '年 +280%',
      competitionDelta: '特化型寡占',
      entryRequirements: { capital: '中〜大規模', technicalDifficulty: 'MEDIUM', platformRisk: 'MEDIUM' },
    },
    evidenceCards: [{ id: 'card', type: 'UNKNOWN_AUDIT', title: '調査限界', evidenceStatus: 'UNKNOWN', punchline: '原価・利益は未確認。' }],
    unknownsNotes: ['原価、広告費、外注費、税、営業利益、純利益、継続性は未確認。'],
    publishability: 'PUBLISHABLE',
    ...overrides,
  } as FinancialEntity;
}

describe('template sentences', () => {
  it('recognises boilerplate repeated across many cases, whatever the case name', () => {
    expect(isTemplateSentence('無駄な多機能を排し、現場の課題を直接解決する高収益モデル。', [])).toBe(true);
    expect(isTemplateSentence('Photo AI式業務特化クラウド・月額定額直収配管', ['Photo AI'])).toBe(true);
  });

  it('keeps statements about what is unconfirmed or where a fact came from', () => {
    expect(isTemplateSentence('技術スタックは未確認。', [])).toBe(false);
    expect(isTemplateSentence('eBiz Factsが2026-07-31に更新した公開プロフィール。', [])).toBe(false);
  });

  it('keeps case-specific sentences', () => {
    expect(isTemplateSentence('2010年に始めたホッケーコーチ向けカンファレンスの録画を、会員制の動画ライブラリとして提供。', [])).toBe(false);
  });
});

describe('naturalizeEntity', () => {
  it('removes boilerplate, repeated pains and verdicts that only restate a template', () => {
    const result = naturalizeEntity(entity({ description: '講演を録画して会員制にした。無駄な多機能を排し、現場の課題を直接解決する高収益モデル。' }));
    expect(result.essence?.targetCustomer).toBe('');
    expect(result.essence?.painRelief).toBe('');
    expect(result.targetPainWallet).toBe('');
    expect(result.architecturePattern).toBe('');
    expect(result.strategy.initialTraction).toEqual([]);
    expect(result.strategy.secretInsight).toBe('');
    expect(result.opportunityJudgment).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).description).toBe('講演を録画して会員制にした。');
    // 事例固有の文と事実の欄は残す
    expect(result.tagline).toBe(entity().tagline);
    expect(result.strategy.moatDescription).toBe('法的に認可された遠隔公証人ライセンス');
    expect(result.evidenceCards).toEqual(entity().evidenceCards);
    expect(result.unknownsNotes).toEqual(entity().unknownsNotes);
    expect(result.pnl).toEqual(entity().pnl);
  });

  it('shows the same content once, keeping the earlier field', () => {
    const text = '見知らぬ相手にカード番号を送る恐怖に怯え、安全に代金を決済したい買い手と売り手';
    const result = naturalizeEntity(entity({
      essence: { whatItDoes: 'メールアドレスだけで送金できる決済', targetCustomer: text, painRelief: text },
      targetPainWallet: `${text}。`,
    }));
    expect(result.essence?.painRelief).toBe(text);
    expect(result.essence?.targetCustomer).toBe('');
    expect(result.targetPainWallet).toBe('');
  });

  it('hides the whole AI analysis when the re-audit marked it as generated and unverified', () => {
    const flagged = entity({
      reaudit: { narrativeStatus: 'AI_GENERATED_UNVERIFIED_AMOUNTS_REDACTED' },
      meta: { incumbentDilemma: { cannibalizationBarrier: 'x', scaleMismatchReason: 'x', decisionSpeedAdvantage: 'x' } } as FinancialEntity['meta'],
      lootBlueprint: { targetPrey: 'x', structuralFlaw: 'x', stealthEntry: 'x', tollGateSetup: 'x', reproducibilityScore: 85, moatDurabilityScore: 82, capitalEfficiencyScore: 90, executionChecklist: [] },
    });
    expect(hasUnverifiedAiNarrative(flagged)).toBe(true);
    const result = naturalizeEntity(flagged);
    expect(result.strategy.blindspot).toBe('');
    expect(result.strategy.moatDescription).toBe('');
    expect(result.strategy.moatType).toBe('UNKNOWN');
    expect(result.lootBlueprint).toBeUndefined();
    expect(result.opportunityJudgment).toBeUndefined();
    expect(result.meta).toBeUndefined();
    expect(result.hasPremiumAnalysis).toBe(false);
    // 再監査で書き直された事実は残す
    expect(result.essence?.whatItDoes).toBe(flagged.essence?.whatItDoes);
    expect(result.tagline).toBe(flagged.tagline);
    expect(publicEntity(flagged).hasPremiumAnalysis).toBe(false);
    expect(publicSummaryEntity(flagged).strategy.blindspot).toBe('');
  });

  it('keeps a list whose items are mostly case-specific', () => {
    const result = naturalizeEntity(entity({
      strategy: { ...entity().strategy, initialTraction: ['2010年にバンクーバーで第1回カンファレンスを開催（参加98人）', '約1年後に会員制を開始', '3. 収益化：配管により、広告費に依存せず安定した現金キャッシュフローを確立'] },
    }));
    expect(result.strategy.initialTraction).toEqual(['2010年にバンクーバーで第1回カンファレンスを開催（参加98人）', '約1年後に会員制を開始']);
  });

  it('gives the same result when applied twice and never changes the input', () => {
    const source = entity();
    const snapshot = JSON.stringify(source);
    const once = naturalizeEntity(source);
    expect(naturalizeEntity(once)).toEqual(once);
    expect(JSON.stringify(source)).toBe(snapshot);
  });
});
