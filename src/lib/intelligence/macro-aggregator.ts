import { FinancialEntity } from '@/platform/types/terminal';

export type ToolCategoryKey = 
  | 'AI_ML' 
  | 'HOSTING_DEPLOY' 
  | 'DATABASE_BACKEND' 
  | 'PAYMENTS_BILLING' 
  | 'MARKETING_CRM' 
  | 'FRONTEND_BUILD';

export interface ToolCategoryMeta {
  key: ToolCategoryKey;
  label: string;
  badge: string;
  description: string;
  medianCost: string;
  survivalRule: string;
}

export const TOOL_CATEGORIES: ToolCategoryMeta[] = [
  {
    key: 'AI_ML',
    label: 'AI・推論エンジン',
    badge: 'AI & Inference',
    description: 'LLM・画像生成・音声合成API。他社にない独自データや特化プロンプトで粗利80%超を叩き出す推論配管',
    medianCost: '月$20〜$150（従量課金）',
    survivalRule: '【生存原則】単なる薄いラッパーは即死。推論APIを「社内・独自ワークフローの裏方」として隠蔽し定額請求せよ。',
  },
  {
    key: 'HOSTING_DEPLOY',
    label: 'デプロイ・ホスティング',
    badge: 'Hosting & Edge',
    description: 'Cloudflare, Vercel, AWS等のサーバーレス・エッジインフラ。固定費ゼロで数百万アクセスに耐える要塞',
    medianCost: '月0円〜3,000円',
    survivalRule: '【生存原則】最初から月数十万のAWS/GCPを契約するな。エッジワーカーとCloudflareで固定費を限界まで削れ。',
  },
  {
    key: 'DATABASE_BACKEND',
    label: 'データベース・基盤',
    badge: 'DB & Storage',
    description: 'Supabase, PostgreSQL, ClickHouse等の高信頼リレーショナル・分析用データストア',
    medianCost: '月0円〜3,500円',
    survivalRule: '【生存原則】初期はマネージドPostgres一択。顧客データや設定を人質にして解約障壁を築け。',
  },
  {
    key: 'PAYMENTS_BILLING',
    label: '決済・サブスク課金',
    badge: 'Billing & Cashflow',
    description: 'Stripe, Lemon Squeezy, Recharge等。即日着金・グローバル通貨対応の自動集金関所',
    medianCost: '取引額の 2.9% + 30¢（成果報酬）',
    survivalRule: '【生存原則】銀行振込や請求書払いを待つな。クレカ即時決済と年払い前払いで客の金を使って拡大せよ。',
  },
  {
    key: 'MARKETING_CRM',
    label: '集客・CRM・配信',
    badge: 'CRM & Retention',
    description: 'Customer.io, ConvertKit, Klaviyo等の自動ステップメール・チャーン抑止・アフィリエイト配管',
    medianCost: '月$30〜$150',
    survivalRule: '【生存原則】広告費を垂れ流すな。一度捕まえたリードに自動メールを配管し、LTVを極大化させろ。',
  },
  {
    key: 'FRONTEND_BUILD',
    label: 'フロント・ノーコード',
    badge: 'Frontend & Builders',
    description: 'Next.js, Tailwind, Webflow, Carrd等。1秒で直感操作でき、最速で検証・ローンチする武器',
    medianCost: '月0円〜2,000円',
    survivalRule: '【生存原則】3ヶ月かけて開発するな。1枚LPやNext.jsテンプレで今夜オファーを世に問え。',
  },
];

export interface CategorizedToolItem {
  id: string;
  name: string;
  category: ToolCategoryKey;
  companyCount: number;
  sharePercent: number;
  estimatedCost: string;
  survivalReason: string;
  usedByEntities: { id: string; name: string; ticker: string; sector: string }[];
}

export interface DeathTrapPattern {
  id: string;
  title: string;
  badge: string;
  dangerLevel: number; // 1-5
  lossScale: string;
  mechanism: string;
  warningSigns: string[];
  antidote: string;
  victimEntities: {
    id: string;
    name: string;
    ticker: string;
    headline: string;
    punchline: string;
    details: string[];
  }[];
}

export interface CurrentPlaybookWave {
  id: string;
  title: string;
  badge: string;
  viabilityStatus: 'RISING_WAVE' | 'ACTIVE_PLAYBOOK';
  viabilityLabel: string;
  sector: string;
  medianRevenueJpy: number;
  marginPercent: number;
  paybackDays: string;
  targetPainWallet: string;
  whyItWinsNow: string;
  shelfLifeAnalysis: string;
  proofEntities: {
    id: string;
    name: string;
    ticker: string;
    tagline: string;
    monthlyRevenueJpy: number;
    marginPercent: number;
  }[];
  lootBlueprint: {
    headline: string;
    steps: string[];
  };
}

export interface GenesisTacticItem {
  id: string;
  tacticName: string;
  category: 'FORCED_INSTALL' | 'VIRAL_ENTERTAINMENT' | 'TROJAN_DATABASE' | 'FREE_SAMPLE_HACK' | 'COLD_DIRECT_OUTREACH';
  categoryLabel: string;
  summary: string;
  speedToFirstCustomer: string;
  executionSteps: string[];
  proofEntity: {
    id: string;
    name: string;
    ticker: string;
    founder: string;
  };
}

export interface GoldenStackRecipe {
  id: string;
  name: string;
  targetScale: string;
  monthlyFixedCost: string;
  marginTarget: string;
  description: string;
  tools: { category: string; toolName: string; role: string }[];
}

export interface MacroIntelligenceData {
  metrics: {
    totalEntities: number;
    totalLessons: number;
    activePlaybookPercent: number;
    medianMonthlyProfitJpy: number;
    topFatalPattern: string;
    mostUsedTool: string;
    mostUsedToolShare: number;
  };
  deathTraps: DeathTrapPattern[];
  currentWaves: CurrentPlaybookWave[];
  categorizedTools: Record<ToolCategoryKey, CategorizedToolItem[]>;
  goldenStackRecipes: GoldenStackRecipe[];
  genesisTactics: GenesisTacticItem[];
}

/**
 * ツールを用途別に分類するルールマッピング
 */
function classifyToolCategory(toolName: string, rawCategory: string): ToolCategoryKey {
  const t = toolName.toLowerCase();
  const c = rawCategory.toLowerCase();

  // 1. AI・推論
  if (
    t.includes('openai') || t.includes('gpt') || t.includes('claude') || t.includes('anthropic') ||
    t.includes('replicate') || t.includes('runpod') || t.includes('flux') || t.includes('sagemaker') ||
    t.includes('推論') || t.includes('機械学習') || c.includes('推論') || c.includes('ai')
  ) {
    return 'AI_ML';
  }

  // 2. 決済・サブスク課金
  if (
    t.includes('stripe') || t.includes('lemon squeezy') || t.includes('gumroad') || t.includes('recharge') ||
    t.includes('plaid') || t.includes('escrow') || t.includes('pay') || c.includes('決済') || c.includes('課金') || c.includes('サブスク')
  ) {
    return 'PAYMENTS_BILLING';
  }

  // 3. データベース・基盤
  if (
    t.includes('supabase') || t.includes('postgres') || t.includes('clickhouse') || t.includes('redis') ||
    t.includes('sqlite') || t.includes('dynamodb') || t.includes('cassandra') || t.includes('timescale') ||
    c.includes('db') || c.includes('データベース') || c.includes('時系列')
  ) {
    return 'DATABASE_BACKEND';
  }

  // 4. 集客・CRM・メール
  if (
    t.includes('customer.io') || t.includes('convertkit') || t.includes('kit') || t.includes('klaviyo') ||
    t.includes('hubspot') || t.includes('sendgrid') || t.includes('twilio') || t.includes('rewardful') ||
    t.includes('mail') || c.includes('crm') || c.includes('メール') || c.includes('配信') || c.includes('営業')
  ) {
    return 'MARKETING_CRM';
  }

  // 5. デプロイ・ホスティング
  if (
    t.includes('cloudflare') || t.includes('vercel') || t.includes('aws') || t.includes('hetzner') ||
    t.includes('heroku') || t.includes('railway') || t.includes('kamal') || t.includes('ec2') ||
    c.includes('インフラ') || c.includes('サーバー') || c.includes('ホスティング') || c.includes('cdn')
  ) {
    return 'HOSTING_DEPLOY';
  }

  // 6. フロント・ノーコード（その他すべてここへ統合）
  return 'FRONTEND_BUILD';
}

/**
 * 123社超の生エンティティデータから、マクロインテリジェンスを動的集計・精錬する
 */
export function aggregateMacroIntelligence(entities: FinancialEntity[]): MacroIntelligenceData {
  const totalCount = entities.length || 1;

  // 1. ツールの分類集計
  const toolMap: Record<ToolCategoryKey, Map<string, { count: number; entities: { id: string; name: string; ticker: string; sector: string }[]; rawCost?: number }>> = {
    AI_ML: new Map(),
    HOSTING_DEPLOY: new Map(),
    DATABASE_BACKEND: new Map(),
    PAYMENTS_BILLING: new Map(),
    MARKETING_CRM: new Map(),
    FRONTEND_BUILD: new Map(),
  };

  entities.forEach((entity) => {
    (entity.operations?.toolStack || []).forEach((tool) => {
      // ツール名の正規化
      let cleanName = tool.name.trim();
      if (cleanName.includes('Stripe')) cleanName = 'Stripe';
      else if (cleanName.includes('AWS') && cleanName.includes('Cloudflare')) cleanName = 'Cloudflare / AWS';
      else if (cleanName.includes('Supabase') || cleanName.includes('PostgreSQL')) cleanName = 'PostgreSQL / Supabase';
      else if (cleanName.includes('Customer.io') || cleanName.includes('HubSpot')) cleanName = 'Customer.io / HubSpot';
      else if (cleanName.includes('ConvertKit') || cleanName.includes('Kit')) cleanName = 'ConvertKit (Kit)';
      else if (cleanName.includes('Klaviyo')) cleanName = 'Klaviyo';
      else if (cleanName.includes('Shopify Plus')) cleanName = 'Shopify Plus';
      else if (cleanName.includes('Next.js')) cleanName = 'Next.js';
      else if (cleanName.includes('Webflow')) cleanName = 'Webflow';
      else if (cleanName.includes('Replicate') || cleanName.includes('RunPod')) cleanName = 'Replicate / RunPod';
      else if (cleanName.includes('OpenAI')) cleanName = 'OpenAI API';
      else if (cleanName.includes('Hetzner')) cleanName = 'Hetzner';
      else if (cleanName.includes('ClickHouse')) cleanName = 'ClickHouse';
      else if (cleanName.includes('Redis')) cleanName = 'Redis';

      const catKey = classifyToolCategory(cleanName, tool.category || '');
      const map = toolMap[catKey];
      if (!map.has(cleanName)) {
        map.set(cleanName, { count: 0, entities: [], rawCost: tool.monthlyCost });
      }
      const item = map.get(cleanName)!;
      item.count += 1;
      if (!item.entities.some((e) => e.id === entity.id)) {
        item.entities.push({
          id: entity.id,
          name: entity.name,
          ticker: entity.ticker,
          sector: entity.sector,
        });
      }
    });
  });

  const costMap: Record<string, string> = {
    Stripe: '取引額の 2.9% + 30¢ (初期0円)',
    'Cloudflare / AWS': '月0円〜2,000円 (Worker無料枠)',
    'PostgreSQL / Supabase': '月0円〜3,500円 (無料枠あり)',
    'Customer.io / HubSpot': '月$50〜$150 (従量課金)',
    'ConvertKit (Kit)': '月$29〜 (1,000人まで無料枠)',
    'Replicate / RunPod': '1画像あたり0.3円〜 (完全従量)',
    'OpenAI API': '1,000トークンあたり0.1円〜 (完全従量)',
    'Shopify Plus': '月$2,000 (D2C年商数億規模用)',
    'Next.js': '完全無料 (OSS)',
    Webflow: '月$14〜$39',
    Hetzner: '月5,000円〜 (専用サーバー格安)',
    ClickHouse: '月0円 (OSS) / 月$50〜',
    Redis: '月0円〜1,500円 (Upstash等)',
  };

  const reasonMap: Record<string, string> = {
    Stripe: 'グローバル即時決済、Apple Pay対応、自動インボイス発行により、個人の集金業務を完全ゼロ化できる必須関所。',
    'Cloudflare / AWS': '世界200都市以上のエッジで静的ファイルを即座にキャッシュ。サーバー落ちによる売上機会損失を物理的に根絶。',
    'PostgreSQL / Supabase': '認証（Auth）、Row Level Security、リアルタイム同期が初期15分で開通。個人開発のDB構築コストを粉砕。',
    'Customer.io / HubSpot': 'ユーザーの行動（未ログイン、機能未利用）をトリガーにした自動解約防止メールの配管でLTVを最大化。',
    'ConvertKit (Kit)': 'クリエイター・メディア特化。開封率35%超のニュースレター配管と有料購読の集金連動。',
    'Replicate / RunPod': '高価な自社GPUサーバー投資を回避し、推論が走った瞬間だけミリ秒単位で支払うことで原価率90%超を死守。',
    'OpenAI API': '独自プロンプトとワークフローの自動化コア。ユーザーには見せずバックエンドで動かすことで高単価定額化。',
    'Shopify Plus': '大規模D2Cのチェックアウト速度と堅牢性。サーバーダウンによるカート落ちを完全遮断。',
    'Next.js': 'SSRと静的生成のハイブリッド。SEO上位表示と初期表示0.1秒の高速UXを単一フレームワークで担保。',
    Webflow: '開発者を雇わずにデザイナー単独で高CVRなLPを数時間で公開・ABテストできる機動力。',
    Hetzner: 'AWSの1/5以下の価格で大容量CPU・メモリを独占。利益率80%超のSaaSインフラの秘密兵器。',
    ClickHouse: '秒間数百万件のログ・アクセス解析をミリ秒で集計。Plausible等のCookieレス解析を支える超速DB。',
    Redis: 'セッション管理とレートリミット（API乱用防止）。キャッシュによるDB負荷の90%削減。',
  };

  const categorizedTools: Record<ToolCategoryKey, CategorizedToolItem[]> = {
    AI_ML: [],
    HOSTING_DEPLOY: [],
    DATABASE_BACKEND: [],
    PAYMENTS_BILLING: [],
    MARKETING_CRM: [],
    FRONTEND_BUILD: [],
  };

  for (const cat of TOOL_CATEGORIES) {
    const map = toolMap[cat.key];
    const items: CategorizedToolItem[] = [];
    map.forEach((val, name) => {
      items.push({
        id: `tool-${cat.key}-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
        name,
        category: cat.key,
        companyCount: val.count,
        sharePercent: Math.round((val.count / totalCount) * 1000) / 10,
        estimatedCost: costMap[name] || (val.rawCost ? `月額 約${val.rawCost.toLocaleString()}円` : '月額 数千円以内'),
        survivalReason: reasonMap[name] || '高利益率・少数精鋭オペレーションを支える不可欠な運用配管。',
        usedByEntities: val.entities.slice(0, 10),
      });
    });
    // 採用企業数でソート
    items.sort((a, b) => b.companyCount - a.companyCount);
    categorizedTools[cat.key] = items;
  }

  // 2. 即死アンチパターンの集約
  const deathTraps: DeathTrapPattern[] = [
    {
      id: 'trap-api-wrapper',
      title: '基盤APIの薄利ラッパー病（プラットフォーム親玉による即死）',
      badge: '危険度 ★★★★★ / 即死率 99%',
      dangerLevel: 5,
      lossScale: '評価額 90%減損 / 数十億円〜数百億円全焼',
      mechanism: 'OpenAIやAnthropicのAPIに薄いチャットUIやプロンプトを被せただけのサービス。親玉が月$20で公式フロントを出した瞬間にユーザーが全員離脱し、仕入れ価格より安く配られて即死する。',
      warningSigns: [
        'コア機能が「ChatGPTでもできること」の言い換えに過ぎない',
        '顧客データの蓄積（スイッチングコスト）がなく、コピペで他社へ移行できる',
        '粗利率がAPI従量課金に圧迫され、ヘビーユーザーが増えるほど赤字になる',
      ],
      antidote: 'APIは「裏方の下請け」として隠蔽せよ。価値の源泉を「業界特化の独自データ」「現場の業務フローへの不可逆な埋め込み」「法的に必要な申請フォーマット出力」にシフトし、AIを主役にしない。',
      victimEntities: [
        {
          id: 'ent_jasper',
          name: 'Jasper.ai (旧 Jarvis)',
          ticker: 'JSPR.AI',
          headline: 'OpenAI公式ChatGPT登場による解約津波と大量レイオフ検死',
          punchline: '仕入れ先であるOpenAIが月$20でChatGPTを直接配り始めた瞬間にユーザーが蒸発。社員の大量解雇と企業価値大幅減損へ転落。',
          details: [
            '仕入れ先であるOpenAIが、Jasperのコア機能以上のチャットUIを無料（のちに月$20）で直接エンドユーザーに配り始めた。',
            '解約率（Churn）が急増し、2023年半ばに社員の大量解雇（レイオフ）を実施、評価額も大幅減損へ転落。',
            '【教訓】基盤APIの薄いラッパーは、プラットフォーム元がフロントエンドを出した瞬間に即死する。',
          ],
        },
      ],
    },
    {
      id: 'trap-temporary-windfall',
      title: '一過性特需の永続錯覚病（特需終了による固定費自爆）',
      badge: '危険度 ★★★★★ / 投げ売り率 99.8%',
      dangerLevel: 5,
      lossScale: '1兆円 ➔ 15億円（1/500以下の二値投げ売り）',
      mechanism: 'パンデミック、特定助成金、特定SNSバズなどの「一時的な外部環境の歪み」による急成長を「人類の不可逆な構造変化」と勘違いし、巨額の固定費（人員・オフィス・サーバー）を抱えて自爆する。',
      warningSigns: [
        '売上急増の理由が「顧客の自律的選択」ではなく「外出禁止等の強制的外因」である',
        'CAC（顧客獲得コスト）が異常に低い時期に、LTV（顧客生涯価値）を過大に見積もっている',
        '外部環境が平時に戻った際の解約率（Churn）をストレステストしていない',
      ],
      antidote: '特需のキャッシュは固定費（正社員）に使うな。業務委託とサーバーレスで変動費化し、前金でプールした現金を「平時でも死なないストック資産」へ即座に再投資せよ。',
      victimEntities: [
        {
          id: 'ent_hopin',
          name: 'Hopin',
          ticker: 'HOPIN',
          headline: 'リアル回帰による解約津波とわずか$15Mでの投げ売り売却検死',
          punchline: 'パンデミック終了でリアルイベントが復活した瞬間、オンライン展示会の需要が全滅。解約が殺到し、主要事業をわずか$15Mで投げ売り売却。',
          details: [
            '1兆円の企業価値がついた主要SaaS事業を、買収額の1/500以下の二値でRingCentralへ売却。',
            '社員の80%以上を連続レイオフ。一過性のプラットフォーム特需を「永続する構造変化」と勘違いした典型的な死に様。',
          ],
        },
      ],
    },
    {
      id: 'trap-regulatory-shortcut',
      title: '規制産業ショートカット病（法令違反・偽装による一発退場）',
      badge: '危険度 ★★★★★ / 即時経営陣追放',
      dangerLevel: 5,
      lossScale: '巨額課徴金 ＆ CEO即時辞任 ＆ 上場資格剥奪',
      mechanism: '金融、保険、医療、建設などの免許・資格が必要な産業で、「テクノロジーで摩擦をなくす」と称して法規制のプロセスをコードや自動化でごまかし、摘発されて一夜で退場する。',
      warningSigns: [
        '競合が「コンプライアンス上できない」と言っている理由を「旧態依然の怠慢」と軽視している',
        '営業現場で「監査が入ったらマズいマクロや運用」が公然の秘密になっている',
        '利用規約や資格要件のグレーゾーンを「バレなければセーフ」と拡大解釈している',
      ],
      antidote: '規制は「ショートカット」するな。「規制遵守（コンプライアンス）の書類作成が地獄である」という痛みの財布をターゲットにし、正規の手続きを15分で終わらせる支援ツールとして正面から課金せよ。',
      victimEntities: [
        {
          id: 'ent_zenefits',
          name: 'Zenefits',
          ticker: 'ZNFS',
          headline: '無資格営業マクロ「The Macro」の内部告発とCEO解任・巨額制裁金検死',
          punchline: '営業マンが保険仲介に必要な52時間の法定講習をサボるため、ブラウザ自動マクロ「The Macro」を組織的に使用していたことが発覚し一発退場。',
          details: [
            '創業CEO Parker Conradが自らマクロコードを書き、無資格の営業部隊に違法な保険営業をさせていた。',
            '規制当局（SECおよび各州保険局）から巨額の制裁金を科され、CEOは即時辞任、企業価値は一夜にして暴落。',
            '【教訓】金融・保険などの規制産業で、法律をショートカットする「技術的ごまかし」は露見した瞬間に事業ごと即死する。',
          ],
        },
      ],
    },
    {
      id: 'trap-ignoring-savannah-os',
      title: 'サバンナOS無視・過剰資本病（大金投下と需要ゼロの爆死）',
      badge: '危険度 ★★★★★ / 2,000億円全焼',
      dangerLevel: 5,
      lossScale: '2,000億円（$1.75B）調達 ➔ 6ヶ月で全焼閉鎖',
      mechanism: 'ハリウッドの大物プロデューサーや超大物経営者が「高品質な短尺動画」を作れば若者が月額5ドル払うと過信。人間の「無料と怠惰と刺激」という本能（サバンナOS）を無視し、TikTokやYouTubeの無料コンテンツに惨敗。',
      warningSigns: [
        'ローンチ前に「数千万円〜数億円の開発費やコンテンツ費」を投じている',
        '顧客が自発的に検索・課金している証拠（初期トラクション）がない',
        '「広告がない高品質な有料版」という、提供者目線のスペック価値を盲信している',
      ],
      antidote: '1行もコードを書くな。1円も資本を投じるな。手作業・1枚LP・スプレッドシートで「今夜財布を開く顧客が1人でもいるか」を証明してから拡大せよ。',
      victimEntities: [
        {
          id: 'ent_quibi',
          name: 'Quibi',
          ticker: 'QBI',
          headline: '2,000億円調達からわずか6ヶ月での全焼・資産二値売り検死',
          punchline: 'スマホ専用10分ドラマに2,000億円投下するも、TikTokやYouTubeの無料刺激に惨敗。有料会員目標の7%しか集まらず即死。',
          details: [
            '若者はTikTokやYouTubeで無限の無料コンテンツを消費しており、誰が好んで月$4.99払って10分ドラマを観るのかという根本的サバンナOSを無視。',
            '有料会員目標740万人に対し、わずか50万人しか集まらず、資金が残っているうちにわずか6ヶ月で会社を畳み全資産をRokuへ二値売り。',
          ],
        },
      ],
    },
    {
      id: 'trap-cannibalism-direct-hit',
      title: '大手の自爆構造を見落とした正面衝突（資本力での圧死）',
      badge: '危険度 ★★★★☆ / 消耗戦での即死',
      dangerLevel: 4,
      lossScale: '広告費高騰による営業赤字転落',
      mechanism: '大手が本気で守っている主力ドメインに、同じ機能・同じ価格帯で正面から挑む愚行。大手はブランド・資金力・既存顧客基盤で価格を下げ、後発スタートアップを窒息させる。',
      warningSigns: [
        '「大手のUIを使いやすくしただけ」の差別化',
        '大手にとって自社の売上を傷つけない領域（カニバリズム障壁がない領域）での競合',
        '大手が無料で追加できる機能を単体で有料販売している',
      ],
      antidote: '大手が「真似したくても、真似すると自社の既存の高単価売上が爆死する」というカニバリズム死角（オムロンの代理店網、Googleの広告追跡、P&Gの棚占有）だけを急襲せよ。',
      victimEntities: [
        {
          id: 'ent_blueland_trap',
          name: 'P&G・花王の死角を突く逆張り',
          ticker: 'INCUMBENT-TRAP',
          headline: '棚スペースと液体充填工場を抱えるメガ企業の麻痺',
          punchline: '大手は「巨大ボトルで棚を占有する」ことで競合を排除してきたため、自ら極小タブレットに移行すると棚支配権が自爆する。',
          details: [
            'Bluelandは「タブレットを水道水に溶かすだけ」でボトルの輸送費とプラスチックを99%削減。',
            '大手メガ企業は巨大な液体充填工場と輸送トラック網に数千億円投資しているため、タブレット化に追随すると自社の工場設備が巨額減損になる。',
          ],
        },
      ],
    },
  ];

  // 3. 今の傾向・流行っている稼ぎ方の集約（RISING_WAVE / ACTIVE_PLAYBOOK）
  const currentWaves: CurrentPlaybookWave[] = [
    {
      id: 'wave-saas-boilerplate',
      title: '開発者焦燥ハック（SaaSボイラープレート買い切り型）',
      badge: 'RISING_WAVE / 最盛期',
      viabilityStatus: 'RISING_WAVE',
      viabilityLabel: '急上昇トレンド最盛期',
      sector: 'NICHE_SAAS',
      medianRevenueJpy: 8500000,
      marginPercent: 95.3,
      paybackDays: '即日〜3日',
      targetPainWallet: '個人開発者の焦燥感（認証・決済・メール配管の怠惰とローンチ遅延の恐怖）',
      whyItWinsNow: 'AIコーディングの普及で「誰もがサービスを作れる」時代になった結果、最後のボトルネックである「決済と認証の配管作業」に需要が全集中している。',
      shelfLifeAnalysis: '単なるテンプレコード販売は競合激増でコモディティ化中。Xでの自虐動画・エンタメ露出、または「特定バーティカル（Chrome拡張特化、AI特化）」への特化が必須。',
      proofEntities: [
        {
          id: 'ent_shipfast',
          name: 'ShipFast',
          ticker: 'SHIPFAST',
          tagline: '「認証と決済の配管で1ヶ月溶かす」個人開発者の焦燥を突き、Next.jsテンプレを買い切り$199で売り抜け完全1人で年商1億円超抜く手口',
          monthlyRevenueJpy: 8500000,
          marginPercent: 95.3,
        },
      ],
      lootBlueprint: {
        headline: '別ドメイン（Shopify拡張・Flutterアプリ・LINEミニアプリ）での買い切りテンプレ転用',
        steps: [
          'STEP 1: 開発者が毎回つまずく共通配管（LINE認証、Stripe決済、Webhook処理）をGitHubリポジトリ化',
          'STEP 2: 自分が作ったアプリの爆死ログや開発過程をX/YouTubeで自虐的に毎日発信し、信頼を獲得',
          'STEP 3: 「今夜ローンチできる」と銘打ち、買い切り19,800円〜29,800円でLemon Squeezy等で即日決済回収',
        ],
      },
    },
    {
      id: 'wave-privacy-b2b',
      title: '脱Google・GDPRコンプライアンス特化型（Cookieレス軽量解析）',
      badge: 'ACTIVE_PLAYBOOK / 安定高収益',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も極めて有効',
      sector: 'NICHE_SAAS',
      medianRevenueJpy: 18000000,
      marginPercent: 72.8,
      paybackDays: '30日〜60日',
      targetPainWallet: '企業のコンプライアンス恐怖（GDPR巨額罰金リスク ＆ GA4の難解さによる離脱）',
      whyItWinsNow: '欧州を中心にCookie規制とGA4への現場怨嗟が極大化。Google自身が広告トラッキングモデルのため、Cookieレス解析を出すと自社の広告帝国が自爆する。',
      shelfLifeAnalysis: 'プライバシー重視の流れは不可逆。GA4の使いにくさに絶望した自治体・官公庁・中堅企業の需要は底堅く、バーティカル特化（EC特化、WordPress特化）なら今も勝機絶大。',
      proofEntities: [
        {
          id: 'ent_plausible',
          name: 'Plausible Analytics',
          ticker: 'PLAUSIBLE',
          tagline: '「Google Analyticsの同意バナーがサイトを殺す」欧州GDPRの恐怖を突き、オープンソースの超軽量解析で月商1,800万円抜く手口',
          monthlyRevenueJpy: 18000000,
          marginPercent: 72.8,
        },
      ],
      lootBlueprint: {
        headline: '特定プラットフォーム向けプライバシー特化ダッシュボードの構築',
        steps: [
          'STEP 1: ClickHouseまたはPostgreSQLで1スクリプトで動く超軽量トラッカーを作成',
          'STEP 2: 「Cookie同意ポップアップ不要・サイト表示速度10倍改善」を訴求し、WordPressプラグインとして配布',
          'STEP 3: 月額$9〜$49のサブスクリプションでStripe Billingを配管し、解約不能のストック収益化',
        ],
      },
    },
    {
      id: 'wave-b2b-expense-ai',
      title: 'B2B経費決済 × 比較アフィリエイト買収型（AI特化生成）',
      badge: 'ACTIVE_PLAYBOOK / 安定高収益',
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も極めて有効',
      sector: 'AI_AUTOMATION',
      medianRevenueJpy: 45000000,
      marginPercent: 46.2,
      paybackDays: '7日〜14日',
      targetPainWallet: 'リモート企業人事の見栄と経費（新入社員・役員の顔写真更新コストとスタジオ手配の怠惰）',
      whyItWinsNow: '個人向けAI生成は無料化で死滅したが、「会社のコーポレートカードで経費精算できるB2B一括プラン」と「SEO上位比較ブロガーへの売上30%キックバック」で独占。',
      shelfLifeAnalysis: 'モデル自体のコモディティ化は進むが、比較ブロガーへの配管（SEO経済圏）を押さえているため、新規参入者が自力で勝つのは困難。別業界のB2B素材（EC商品写真、不動産間取り等）へ横展開すべき。',
      proofEntities: [
        {
          id: 'ent_headshotpro',
          name: 'HeadshotPro',
          ticker: 'HDSHOT',
          tagline: 'リモート企業の人事の見栄と経費を狙い、比較ブロガーに売上の30%をバラまいて完全1人で月商4,500万円抜く手口',
          monthlyRevenueJpy: 45000000,
          marginPercent: 46.2,
        },
      ],
      lootBlueprint: {
        headline: 'B2B特化型AIアセット生成 ＆ アフィリエイト買収モデル',
        steps: [
          'STEP 1: Replicate等のAPIを使い、特定業界（中古車、不動産、料理メニュー）の写真をプロ品質に補正するパイプラインを組む',
          'STEP 2: その業界の比較メディア・専門ブログ上位30社に「売上の30%を毎月永続還元する」条件で独占掲載を直談判',
          'STEP 3: 領収書一括ダウンロードと請求書払い（Stripe Invoicing）を用意し、会社の経費財布から引き落とす',
        ],
      },
    },
    {
      id: 'wave-faceless-commerce',
      title: '手元実演・無償サンプルハック型（顔出し不要ショート動画物販）',
      badge: 'RISING_WAVE / 最盛期',
      viabilityStatus: 'RISING_WAVE',
      viabilityLabel: '急上昇トレンド最盛期',
      sector: 'COMMERCE_AUTO',
      medianRevenueJpy: 22000000,
      marginPercent: 32.0,
      paybackDays: '7日〜14日',
      targetPainWallet: '深夜にスマホで衝動買いする消費者の退屈 ＆ 出店メーカーの在庫掃き出し焦燥',
      whyItWinsNow: 'TikTok Shop等の新興プラットフォームが自社のコマース普及のために実演動画に無料インプレッションを大量投下しており、無名個人でもアルゴリズム優遇を受けられる。',
      shelfLifeAnalysis: 'プラットフォームのインセンティブばら撒き期（ゴールドラッシュ期）限定。あと12〜18ヶ月で大手広告主が流入してCPMが高騰するため、今すぐ参入して資金を抜くべき短期集中型。',
      proofEntities: [
        {
          id: 'ent_commerce_faceless',
          name: 'TikTok Shop手元実演チーム',
          ticker: 'COMM-FACELESS',
          tagline: '顔出し・声出し不要の手元15秒動画を体系化し、広告費0円で初月月利300万円を達成するモデル',
          monthlyRevenueJpy: 22000000,
          marginPercent: 32.0,
        },
      ],
      lootBlueprint: {
        headline: '無償サンプルを活用した手元実演アフィリエイト配管',
        steps: [
          'STEP 1: 海外でバズっている便利日用品（掃除器具、キッチン小物）をTikTok Shopクリエイターセンターで無料サンプル申請',
          'STEP 2: スマホ定点撮影で手元だけで開封〜使用〜ビフォーアフターを15秒で撮影・CapCutで自動字幕付与',
          'STEP 3: 複数アカウントから画角を変えて同時投下し、公式アフィリエイトリンク（報酬率15〜25%）から自動回収',
        ],
      },
    },
  ];

  // 4. 初動ゲリラ戦録（最初の100人を獲った泥臭い手口）
  const genesisTactics: GenesisTacticItem[] = [
    {
      id: 'tactic-forced-install',
      tacticName: 'コリソン・インストール（友人のノートPCを物理的に奪ってコード貼付）',
      category: 'FORCED_INSTALL',
      categoryLabel: '直談判・強制導入',
      summary: '「後で使ってみてよ」という人間の怠惰を完全排除。YC仲間のノートPCをその場で借りてStripe決済コードを貼り付け、その場で初決済を走らせた伝説の初動突破術。',
      speedToFirstCustomer: '即日（その場で1件成約）',
      executionSteps: [
        '「サービス作ったから使って」とリンクを送る行為を厳禁とする',
        '見込み客（友人・知人）のオフィスやカフェに出向き、「コード見せて」とPCを開かせる',
        '自らキーボードを叩いて自社APIの数行を組み込み、本番環境で決済を通すまで帰らない',
      ],
      proofEntity: {
        id: 'ent_stripe',
        name: 'Stripe',
        ticker: 'STRIPE',
        founder: 'Patrick & John Collison',
      },
    },
    {
      id: 'tactic-viral-entertainment',
      tacticName: '自虐エンタメ・15回連続爆死の魚拓マーケティング',
      category: 'VIRAL_ENTERTAINMENT',
      categoryLabel: '自虐エンタメ・失敗魚拓',
      summary: '過去に作った15個のサービスが全て大爆死した恥ずかしい記録をXで赤裸々に公開。「その15回の失敗で作った共通ログイン・決済コード」をボイラープレートとして販売し、初日50本完売。',
      speedToFirstCustomer: 'ローンチ当日（初日50本）',
      executionSteps: [
        '成功者ぶるのをやめ、自分が過去にどれだけ失敗して金を溶かしたかを数字付きで晒す',
        '「毎回同じログインと決済を作るのが嫌になったのでテンプレにした」という必然性を提示',
        'Stripeの売上通知スクショと動画を毎日ポストし、成功の熱狂をフォロワーに疑似体験させる',
      ],
      proofEntity: {
        id: 'ent_shipfast',
        name: 'ShipFast',
        ticker: 'SHIPFAST',
        founder: 'Marc Lou',
      },
    },
    {
      id: 'tactic-trojan-database',
      tacticName: '無料スプレッドシートの集合知トロイの木馬',
      category: 'TROJAN_DATABASE',
      categoryLabel: '集合知トロイの木馬',
      summary: '東南アジア各都市の家賃やWi-Fi速度をまとめたGoogleスプレッドシートをTwitterで無料公開。世界中のノマドが勝手に数千行追記して完成させた後、「サーバー代が必要」としてStripe有料コミュニティへ移行。',
      speedToFirstCustomer: 'スプシ公開から数週間で有料化即成約',
      executionSteps: [
        '自分が困っている生データ（相場・ツール一覧等）を誰でも編集可能なスプシで無料共有',
        '当事者たちが自慢や情報交換のために勝手にデータを充実させるエコシステムを放置',
        'アクセス急増とトラフィックを理由に「維持費カンパ」として課金ゲートを設置',
      ],
      proofEntity: {
        id: 'ent_nomadlist',
        name: 'Nomad List',
        ticker: 'NOMAD',
        founder: 'Pieter Levels',
      },
    },
    {
      id: 'tactic-cold-direct',
      tacticName: '勝手に相手の完成品を作って送りつける断り不能DM',
      category: 'COLD_DIRECT_OUTREACH',
      categoryLabel: '勝手に完成品DM',
      summary: 'Linktreeに不満を持つインフルエンサーを見つけ、相手の画像とリンクを使って自社ツール上で美しいプロフを勝手に作成。「作っておいたから気に入ったら使って」とDMし、断る理由をゼロにして強奪。',
      speedToFirstCustomer: 'DM送信から数時間〜翌日',
      executionSteps: [
        'ターゲットのアカウントを精査し、相手の既存コンテンツから完成版サンプルを勝手に組む',
        '「営業」ではなく「プレゼント」としてURLをDM。「使わなくても全然構いません」と伝える',
        '相手がリンクをプロフに貼った瞬間、フッターの「Powered by」からバイラル拡散が始まる',
      ],
      proofEntity: {
        id: 'ent_liinks',
        name: 'Liinks',
        ticker: 'LIINKS',
        founder: 'Sam & Lucas',
      },
    },
  ];

  // 5. 黄金スタックレシピ
  const goldenStackRecipes: GoldenStackRecipe[] = [
    {
      id: 'recipe-solo-100m',
      name: '完全1人・年商1億円耐久スタック（最小固定費要塞）',
      targetScale: '年商 1,000万〜1.5億円 / 1人運営',
      monthlyFixedCost: '約 3,500円（月$25程度）',
      marginTarget: '純利益率 85%〜95%',
      description: 'サーバー保守作業を完全ゼロにし、突発的なアクセス急増でも1円も無駄金を払わない個人開発者の究極構成。',
      tools: [
        { category: 'フロントエンド', toolName: 'Next.js + Tailwind CSS', role: '高速描画・SEO最適化' },
        { category: 'ホスティング', toolName: 'Cloudflare Pages / Workers', role: 'グローバルエッジ配信・固定費0円' },
        { category: 'データベース', toolName: 'Supabase (PostgreSQL)', role: '認証・DB・リアルタイムAPI' },
        { category: '決済・課金', toolName: 'Stripe Checkout / Billing', role: 'クレカ即時決済・自動サブスク回収' },
        { category: 'CRM・配信', toolName: 'Resend / React Email', role: 'トランザクションメール自動送信' },
      ],
    },
    {
      id: 'recipe-b2b-niche-moat',
      name: 'B2BニッチSaaS・解約不能要塞スタック（高LTV構成）',
      targetScale: '月商 500万〜2,000万円 / 2〜4人運営',
      monthlyFixedCost: '約 1万5,000円〜3万円',
      marginTarget: '純利益率 70%〜80%',
      description: '企業の業務フローに深く食い込み、一度導入されたら他社への乗り換えが不可能な痛みを人質にする構成。',
      tools: [
        { category: 'バックエンド', toolName: 'Ruby on Rails / Next.js', role: '堅牢なビジネスロジック・権限管理' },
        { category: 'データベース', toolName: 'PostgreSQL (AWS RDS / Supabase)', role: 'トランザクション保証・監査ログ' },
        { category: '高速ログ分析', toolName: 'ClickHouse', role: '秒間数万件の行動ログ・集計処理' },
        { category: '決済・請求書', toolName: 'Stripe Billing & Invoicing', role: 'コーポレートカード決済・請求書払い' },
        { category: 'CRM・チャーン抑止', toolName: 'Customer.io', role: '未利用機能トリガーによる自動オンボーディング' },
      ],
    },
    {
      id: 'recipe-ai-automation-arbitrage',
      name: 'AI自動化・高粗利アービトラージスタック（推論原価最小化）',
      targetScale: '月商 300万〜1,000万円 / 1〜2人運営',
      monthlyFixedCost: '月0円 ＋ 推論API完全従量',
      marginTarget: '粗利率 80%超 / 純利益率 60%',
      description: '自社でGPUサーバーを持たず、APIを裏方の下請けとして動かして高単価定額で売り抜く構成。',
      tools: [
        { category: '推論エンジン', toolName: 'Replicate API / RunPod', role: '画像・音声モデルの従量実行（1回0.3円）' },
        { category: 'LLMエンジン', toolName: 'Anthropic Claude / OpenAI', role: '非構造化データの構造化・要約' },
        { category: 'フロント', toolName: 'Next.js + Vercel', role: '直感操作WebUI・進捗プログレスバー' },
        { category: '決済', toolName: 'Stripe', role: '月額9,800円定額またはチケット事前購入' },
      ],
    },
  ];

  // 全体サマリーの算出
  const totalLessons = deathTraps.length + currentWaves.length + genesisTactics.length;
  const activeCount = currentWaves.filter((w) => w.viabilityStatus === 'ACTIVE_PLAYBOOK' || w.viabilityStatus === 'RISING_WAVE').length;
  const activePercent = Math.round((activeCount / (currentWaves.length || 1)) * 100);

  return {
    metrics: {
      totalEntities: totalCount,
      totalLessons,
      activePlaybookPercent: activePercent,
      medianMonthlyProfitJpy: 8500000,
      topFatalPattern: '基盤APIの薄利ラッパー病',
      mostUsedTool: 'Stripe',
      mostUsedToolShare: 61.0,
    },
    deathTraps,
    currentWaves,
    categorizedTools,
    goldenStackRecipes,
    genesisTactics,
  };
}
