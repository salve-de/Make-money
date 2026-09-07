export type BusinessScale = 'SOLO' | 'SMALL_TEAM' | 'SCALEUP' | 'ENTERPRISE';

export type SectorCategory = 
  | 'AI_AUTOMATION'
  | 'NICHE_SAAS'
  | 'MONOPOLY_MFG'
  | 'CONTENT_MEDIA'
  | 'PHYSICAL_ASSET'
  | 'FINTECH_INFRA'
  | 'LOCAL_SERVICES';

export type MoatType = 
  | 'COUNTER_POSITIONING'
  | 'SWITCHING_COST'
  | 'NETWORK_EFFECT'
  | 'CORNERED_RESOURCE'
  | 'SCALE_ECONOMIES'
  | 'BRAND_PRESTIGE'
  | 'PROCESS_POWER';

export interface ProfitAndLossStatement {
  monthlyRevenue: number; // 単位: 円
  cogs: number; // 売上原価
  grossProfit: number; // 粗利益
  grossMargin: number; // 粗利率 %
  operatingExpenses: {
    serverAndApi: number;
    advertising: number;
    subcontracting: number;
    toolsAndSaaS: number;
    other: number;
  };
  operatingProfit: number; // 営業利益
  operatingMargin: number; // 営業利益率 %
  estimatedAnnualNetProfit: number; // 推定年間純利益
}

export interface ToolStackItem {
  name: string;
  category: string;
  monthlyCost: number;
  purpose?: string;
  replacementDifficulty?: 'LOW' | 'MEDIUM' | 'HIGH';
  url?: string;
}

export interface OperatingFramework {
  teamSize: number; // 人数 (1 = 完全1人)
  weeklyHours: number; // 週稼働時間
  initialCapitalRequired: number; // 初期投下資本 (0 = 0円)
  automationLevel: number; // 1-100%
  primaryChannels: string[]; // 集客経路
  toolStack: ToolStackItem[];
}

export interface PricingDossier {
  model: string; // 課金方式
  pricePoint: string; // 価格帯・客単価
  psychologicalTrigger: string; // なぜ金を払うのかの本能トリガー
  estimatedLtvJpy?: number; // 想定LTV
  churnRate?: string; // 解約率
}

export interface AcquisitionDossier {
  cacJpy: number; // 顧客獲得コスト (0円等)
  primaryFunnel: string; // 集客〜成約ファネル
  tactics: string[]; // 具体的ハック
}

export interface BusinessEssence {
  whatItDoes: string; // 一言でいうと何屋か
  targetCustomer: string; // 誰の財布を狙うか
  painRelief: string; // 切除する苦痛・恐怖
}

export interface MetaArchitectureDossier {
  // 1. 大手の構造的ジレンマ (なぜ大企業は真似できないのか)
  incumbentDilemma: {
    cannibalizationBarrier: string; // 既存事業・リレーションとの共食い恐怖
    scaleMismatchReason: string; // 規模が小さすぎて大手の稟議に通らない理由
    decisionSpeedAdvantage: string; // 意思決定・現場実行スピードの非対称性
  };
  // 2. 価格決定権とアンカリング (なぜ客が値切らずに喜んで払うか)
  pricingPower: {
    anchorComparison: string; // 比較対象のすり替え (例: 「写真館の3万円」と比較させる)
    lossAversionTrigger: string; // 損失回避の急所 (例: 「ライン停止の数千万円損害」)
    budgetCategory: string; // どの予算枠を狙っているか (例: 「個人の見栄」「法人の経費精算枠」)
  };
  // 3. 不可逆スイッチングコスト (なぜ客は解約できないのか)
  lockInMechanism: {
    dataHostage: string; // データ蓄積による移行不能化
    workflowIntegration: string; // 業務ルーティン・神経回路への埋め込み
    switchingFriction: string; // 他社へ乗り換えた際の痛みの実態
  };
  // 4. 資本効率とキャッシュ幾何学 (なぜ借金なしで現金が残り続けるのか)
  capitalEfficiency: {
    cashConversionCycle: string; // 前払い集金と後払い仕入れのキャッシュサイクル
    incrementalMargin: string; // 限界利益率の高さ (固定費回収後の利益直下)
    workingCapitalStrategy: string; // 外部調達・借金不要の自己増殖メカニズム
  };
}

export interface StrategicDossier {
  blindspot: string; // 突いた業界の盲点・不条理
  moatType: MoatType;
  moatDescription: string; // 参入障壁の正体
  incumbentDilemma?: string; // 大手が手を出せない構造的理由
  secretInsight?: string; // 現場の裏ハック・非公開インサイト
  initialTraction: string[]; // 最初の100人を獲得した泥臭い手順
  actionPlaybook: string[]; // 再現・実行のためのステップ
  coldOutreachTemplate?: string; // コールドDM実文
}

export interface ExposureAuditDossier {
  guerrillaTraction: string; // ① 初期の泥臭いゲリラ戦・自演の客観事実ログ
  platformGlitch: string; // ② プラットフォーム・規約の盲点ハック（審査すり抜け・トラフィック横取り）
  pivotSnapshot: string; // ③ 死線とピボット魚拓（当初何を売って爆死し、どこを変えて跳ねたか）
  hiddenStackCost: string; // ④ 表向き隠された裏原価・現物API構造
}

export interface FinancialEntity {
  id: string;
  ticker: string; // 例: "KEYENCE", "STRIPE", "PHOTOAI"
  name: string;
  legalEntity?: string;
  tagline: string;
  sector: SectorCategory;
  scale: BusinessScale;
  founder: string;
  country: string;
  url: string;
  verifiedBadge: boolean;
  pnl: ProfitAndLossStatement;
  operations: OperatingFramework;
  strategy: StrategicDossier;
  growthRateYoY: number; // 前年比成長率 %
  pricing?: PricingDossier;
  acquisition?: AcquisitionDossier;
  essence?: BusinessEssence;
  meta?: MetaArchitectureDossier;
  exposureAudit?: ExposureAuditDossier; // 資本主義の裏帳簿：客観事実の暴露レントゲン
  isBookmarked?: boolean;

  // 資本主義の裏帳簿：知的興奮・探索3大トリガー
  architecturePattern: string; // 構造の型（例: "直販要塞・相見積もり殺し", "APIラッパー・自撮り特化", "水門寄生・決済通行税", "テンプレ販売・無料逆手"）
  pipelineStack: string; // 現場の配管・主要ツール（例: "Replicate API × Hetzner × Stripe", "Clay × Make × OpenAI"）
  targetPainWallet: string; // 人質にした財布・痛み（例: "個人の見栄（写真館スタジオの羞恥心回避）", "工場長の保身（ライン停止恐怖）"）

  // 多次元探索・スクリーニングタグ
  tags: string[]; // 例: ["完全1人", "API包装", "利益率80%超", "B2B", "初期費用0円"]
}

export type GridFilterOption = 
  | 'ALL'
  | 'SOLO'
  | 'HIGH_MARGIN'
  | 'ZERO_CAPITAL'
  | 'MONOPOLY'
  | 'AI_NATIVE'
  | 'BOOKMARKED';

export type WorkspaceMode = 'LEDGER' | 'ARCHETYPES' | 'RADAR' | 'SYNTHESIS' | 'DEEP_DIVE';

// 具体的ビジネスアイデア（子のアイテム）
export interface ActionableIdea {
  id: string;
  title: string; // アイデア見出し
  tagline: string; // 急所ワンライナー
  projectedMonthlyRevenue: string; // 想定月商（例: "月商 4,500万円"）
  projectedNetProfit: string; // 実効純利益（手残り）（例: "月 3,790万円"）
  profitMargin: number; // 粗利率・利益率 %（例: 84）
  targetPainWallet: string; // 人質にした痛みの財布
  pipelineStack: string; // 現場の配管・使用ツール構成
  incumbentBlindspot: string; // 大手の自爆構造（なぜ大手が手を出せないか）
  guerrillaTraction: string; // 初動0➔1突破の泥臭い事実ログ
  targetEntityIds: string[]; // 関連する実例銘柄IDリスト
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'; // 参入難易度
}

// 稼ぎの型・戦術スタイル（親セクション）
export interface BusinessArchetype {
  id: string;
  badge: string; // 例: "社員ゼロ / 粗利80%+"
  title: string; // 例: "完全1人・ソロプレナー自律稼働"
  description: string; // なぜこの型が最強なのか（構造の急所）
  avgNetMargin: number; // 平均実効手残り率 %
  iconName: string; // アイコン識別子
  ideas: ActionableIdea[]; // 配下の具体的アイデア群
}

// マネーフロー動向レーダー：急上昇トレンド
export interface MoneyFlowTrend {
  id: string;
  badge: string;
  title: string;
  growthRateYoY: number;
  avgMargin: number;
  summary: string;
  structuralBackground: string;
  targetPainWallet: string;
  representativeEntityIds: string[];
  timestamp: string;
}

// マネーフロー動向レーダー：レッドオーシャン警戒アラート
export interface RedOceanAlert {
  id: string;
  title: string;
  marginDecline: string;
  failureReason: string;
  alternativePlay: string;
}

// マネーフロー動向レーダー：痛みの財布ヒートマップ
export interface PainWalletHeatmap {
  id: string;
  sector: string;
  targetPersona: string;
  painTrigger: string;
  budgetBehavior: string;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'SURGING';
}

export type IntelligenceTopicId = 
  | 'solo_empire'
  | 'direct_monopoly'
  | 'b2b_outbound'
  | 'media_cashflow';

export interface IntelligenceMoneyFlow {
  payer: string; // 誰の財布（人質にした痛み）
  takeMethod: string; // 集金・中抜きの仕掛け（前金・アフィリ・独占直販等）
  costCogs: string; // 仕入れ原価・流出先（推論API、ファブレス委託、配信インフラ等）
  netRetained: string; // 創業者口座への手残り率・純利益
}

export interface IntelligenceDossier {
  id: IntelligenceTopicId;
  title: string;
  badge: string;
  publishedDate: string;
  readTime: string;
  punchline: string;
  macroArbitrage: string; // 市場の構造的歪み・大手の死角
  moneyFlow?: IntelligenceMoneyFlow; // マネーフロー構造（資金移動レントゲン）
  highlightMetric?: { label: string; value: string }; // 最重要数値（例: 実効手残り 84.2%）
  costStructureTeardown: {
    title: string;
    description: string;
    breakdownItems: { label: string; percentage: number; amountNote: string }[];
  };
  operationalPlaybook: string[]; // 参入・実行の急所ステップ
  targetEntityIds: string[]; // 本特集の対象企業IDリスト
}

// ユーザー独自のアナリスト考察メモ
export interface AnalystNote {
  entityId: string;
  content: string;
  updatedAt: string;
}

// 独自アイデア合成（多次元解析）モデル
export interface SynthesizedIdea {
  id: string;
  dimension: 'SAVANNA_INSTINCT' | 'META_ARCHITECT' | 'CONTRARIAN_BLINDSPOT';
  dimensionLabel: string; // "本能ハック型（サバンナOS）" | "構造・胴元型（メタ・アーキテクチャ）" | "逆張り・盲点型（コペルニクス的転回）"
  title: string;
  targetPainWallet: string; // 人質にする財布・痛みの実態
  structuralArbitrage: string; // 突く市場の歪み・大手の死角
  projectedMonthlyProfitJpy: number; // 想定月次純利益
  operatingMargin: number; // 想定営業利益率 %
  requiredTools: { name: string; monthlyCostJpy: number; purpose: string }[];
  first100TractionPlaybook: string[]; // 初動100人獲得の泥臭い手順
  sourceEntityIds: string[]; // 着想元となった保存企業ID
  userNoteInspiration: string; // ユーザーのどのメモが着火剤になったか
}

// 戦略壁打ちチャットメッセージ
export interface StrategyChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  contextEntityId?: string; // 特定銘柄に関する壁打ちの場合
  suggestedActionPrompts?: string[]; // 次に深掘りすべき冷徹な問い
  sources?: Array<{ title: string; url: string }>; // リアルタイムGoogle検索で参照したWeb元情報
  isSearchUsed?: boolean; // リアルタイム検索AIが稼働したか
}

