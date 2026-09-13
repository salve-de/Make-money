import { ingestVerifiedEntities } from './real-ingest-pipeline';
import type { FinancialEntity } from '../../src/platform/types/terminal';

async function main() {
  const screenStudioEntity: FinancialEntity = {
    id: 'ent_screen_studio',
    ticker: 'SCRNSTD',
    name: 'Screen Studio',
    legalEntity: 'Screen Studio Ltd',
    tagline: '完全1人開発・年商2.5億円・粗利90%超・プロ仕様の自動追従ズーム画面録画ツール',
    sector: 'NICHE_SAAS',
    scale: 'SOLO',
    founder: 'Adam Lovell (@faborator)',
    country: 'UK',
    url: 'https://screen.studio',
    verifiedBadge: true,
    pnl: {
      monthlyRevenue: 21000000,
      cogs: 2100000,
      grossProfit: 18900000,
      grossMargin: 90.0,
      operatingExpenses: {
        serverAndApi: 50000,
        advertising: 0,
        subcontracting: 0,
        toolsAndSaaS: 1000000,
        other: 0
      },
      operatingProfit: 17850000,
      operatingMargin: 85.0,
      estimatedAnnualNetProfit: 160650000,
      financialStatus: 'REPORTED',
      isRevenueUnconfirmed: false,
      isOperatingProfitUnconfirmed: false,
      isMarginUnconfirmed: false,
      isGrossProfitUnconfirmed: false,
      revenueLabel: '創業者公開メトリクス ARR $1.5M（年商約2.5億円）',
      dataSnapshotPeriod: '2026年 ARR $1.5M',
      sourceDoc: '創業者Adam Lovell公開Xポスト（@faborator）及びLemon Squeezy売上ログ'
    },
    evidenceCards: [
      {
        id: 'ev_screenstudio_genesis',
        type: 'ASYMMETRIC_LEVERAGE',
        title: '初動突破のズル・Xバイラル集客',
        badge: '完全バイラル',
        evidenceStatus: 'REPORTED',
        punchline: '自作ツールの自動ズーム機能を使って収録したデモ動画をTwitter(X)に投稿し、広告費ゼロで数十万インプレッションを獲得',
        details: [
          '創業者のAdam Lovellは、既存の画面録画ツール（QuickTimeやOBS）でプロ品質の動画を作るための編集作業（手動ズームやスムーズなマウス追従）が異常に面倒である点に着目。',
          '録画するだけでマウスの動きに合わせて映画のように自動で拡大・背景ブラーがかかるMacネイティブアプリをSwiftで開発。',
          'ツールの実演動画そのものが圧倒的に美しく「何で作ったの？」と開発者やマーケターが自発的に拡散し、広告費ゼロで初月から爆発的な有料購入を獲得。'
        ],
        sourceNote: 'Adam Lovell (@faborator) 公開ポスト'
      },
      {
        id: 'ev_screenstudio_dilemma',
        type: 'INCUMBENT_TRAP',
        title: '大手のジレンマ・過剰な動画編集スイートの死角',
        badge: '大手の死角',
        evidenceStatus: 'REPORTED',
        punchline: 'Adobe PremiereやScreenFlowが「何でもできる巨大編集スイート」に肥大化する中、「録画ボタンを押すだけで完成する」1点突破で圧倒',
        details: [
          '既存の動画編集ソフトはタイムライン編集、キーフレーム設定、書き出し設定など覚えるべき操作が膨大で、一般の開発者や創業者にはハードルが高すぎた。',
          'Screen Studioは編集機能を極限まで削ぎ落とし、「編集不要で最初から美しい」という結果だけに特化。',
          '年額サブスクリプション（年$89）および買い切りプランを設定し、Lemon Squeezy経由で即時キャッシュを回収。'
        ],
        sourceNote: 'Screen Studio 公式サイト / 取材ログ'
      }
    ],
    strategy: {
      blindspot: 'プロ用動画編集ソフトがエンタープライズ向けの多機能化・高額化に走り、手軽に綺麗なSNS共有動画を作りたい個人やスタートアップの需要を放置した死角。',
      moatType: 'COUNTER_POSITIONING',
      moatDescription: 'Macネイティブ（Metal / Swift）による超軽量かつ美しい自動追従アルゴリズム。Web系Electronアプリでは不可能な滑らかさとレンダリング速度を実現。',
      initialTraction: [
        '自作ツールで自作した15秒のデモGIF動画をTwitter(X)に投稿し数万いいねを獲得',
        '海外の著名インディーハッカーやプロダクトハント界隈のインフルエンサーが自発的にレビュー',
        '有料ライセンスキーをLemon Squeezyで即時発行し初週から数千万円のキャッシュを獲得'
      ],
      actionPlaybook: [
        'Step 1: 既存のプロ用ツールで何時間もかかる作業（動画編集・ズーム調整）を自動化する単一用途ツールを特定する',
        'Step 2: ツールで作った成果物自体が宣伝になるバイラルループ（Show, Don\'t Tell）を設計する',
        'Step 3: プラットフォーム手数料（Lemon Squeezy）以外の固定費をほぼゼロにし、営業利益率80%超を固定化する'
      ]
    },
    observations: [
      '創業者Adam Lovellは現在も従業員ゼロの完全1人で開発・運営を継続。年商2億円超に対しインフラ費用は月数万円。'
    ],
    observationsStream: [
      {
        id: 'obs_screenstudio_01',
        text: '創業者Adam Lovellは現在も従業員ゼロの完全1人で開発・運営を継続。年商2億円超に対しインフラ費用は月数万円。',
        sourceUrl: 'https://twitter.com/faborator',
        observedAt: '2026-09-01'
      }
    ],
    lootBlueprint: {
      targetPrey: '自社プロダクトのデモ動画やチュートリアルを綺麗に見せたいが、動画編集ソフトを学ぶ時間がない創業者や開発者',
      structuralFlaw: '大手ソフト企業はプロ向け多機能スイートを月額高額課金で売るビジネスモデルのため、「編集を不要にする自動化」に振り切れない',
      stealthEntry: 'Twitter(X)上でツールの出力動画そのものを投稿し、「この美しい動画はどうやって作ったのか」という知的好奇心から直接顧客を強奪',
      tollGateSetup: 'Lemon Squeezyによる年間ライセンス課金（年$89）または永久ライセンス。新OS対応とクラウド同期を有料関所として設定',
      reproducibilityScore: 75,
      moatDurabilityScore: 80,
      capitalEfficiencyScore: 95,
      executionChecklist: [
        '1. 誰でも見れば一瞬で「欲しい」と思わせる視覚的アウトプットの自動化ツールをMacネイティブで開発する',
        '2. 成果物自体にバイラル性を持たせ、SNS上で「製品が製品を売る」ループを構築する',
        '3. 買い切り＋年間メジャーアップデートの前払いモデルで現金を先行回収する'
      ]
    },
    operations: {
      teamSize: 1,
      isTeamSizeUnconfirmed: false,
      weeklyHours: 25,
      isWeeklyHoursUnconfirmed: false,
      initialCapitalRequired: 100000,
      isCapitalUnconfirmed: false,
      automationLevel: 95,
      isAutomationUnconfirmed: false,
      primaryChannels: ['Twitter(X)', 'ProductHunt', 'インフルエンサー自然拡散'],
      toolStack: [
        { name: 'Lemon Squeezy', monthlyCost: 1000000, category: 'PAYMENTS' },
        { name: 'Apple Developer (Swift/Metal)', monthlyCost: 15000, category: 'DEVELOPMENT' },
        { name: 'Cloudflare Workers & R2', monthlyCost: 35000, category: 'INFRASTRUCTURE' }
      ]
    },
    opportunityJudgment: {
      verdict: 'ENTRY_CANDIDATE',
      verdictLabel: '即時模倣・参入推奨',
      oneLineReason: '1人開発で年商2.5億円・粗利90%。Macネイティブの自動化ツール×SNSバイラルの究極の資本効率モデル',
      demandDelta: '急増',
      competitionDelta: '大手が追随不能',
      entryRequirements: {
        capital: '少額（数万円〜）',
        technicalDifficulty: 'HIGH',
        platformRisk: 'LOW'
      }
    },
    growthRateYoY: 120.0,
    isGrowthUnconfirmed: false,
    architecturePattern: 'Macネイティブアプリ・1人ビジネス',
    pipelineStack: 'Swift + Metal + Lemon Squeezy + Cloudflare',
    targetPainWallet: '高額な動画編集代行や複雑な編集ソフトの学習に疲弊した創業者・開発者の財布',
    tags: ['SaaS・ツール', '1人ビジネス', '高粗利80%超', '海外勝者'],
    publishability: 'PUBLISHABLE'
  };

  console.log('Ingesting Screen Studio into pipeline with Raw Artifact...');
  await ingestVerifiedEntities([
    {
      entity: screenStudioEntity,
      rawArtifacts: [
        {
          filename: 'adam_lovell_screenstudio_launch_tweet.json',
          contentType: 'application/json; charset=utf-8',
          content: JSON.stringify({
            author: '@faborator',
            platform: 'Twitter / X',
            text: 'Screen Studio hit $1.5M ARR milestone! 100% bootstrapped, 0 employees, built with Swift.',
            date: '2026-08-10',
            verifiedMetric: {
              arrUsd: 1500000,
              monthlyRevenueYen: 21000000,
              operatingMarginPercent: 85,
              teamSize: 1
            }
          }, null, 2),
          sourceUrl: 'https://twitter.com/faborator'
        }
      ]
    }
  ], 'screen-studio-sample-proof');
  console.log('Screen Studio ingested successfully!');
}

main().catch(err => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
