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
  isRevenueUnconfirmed?: boolean; // 一次情報で売上未確認の場合 true（架空0円の捏造を防止）
  isMarginUnconfirmed?: boolean; // 利益率未確認の場合 true
  revenueLabel?: string; // 表示用カスタムラベル（例: "プラン: $57/月〜", "売上非公開"）
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
  teamSize: number; // 人数 (互換性用)
  initialTeamSize?: number; // 立ち上げ初期の人数 (1 = 完全1人)
  currentTeamSize?: number; // 現在の人数 (スケール後)
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

// 【Layer 2: 動的特異点ブロック型】（データが存在する項目だけ自動展開）
export interface DynamicMoats {
  parasiteHost?: {
    hostName: string; // 宿主（例: "Shopify", "Chrome Web Store", "X (Twitter)"）
    detail: string; // どのように寄生し、トラフィックや顧客を横取りしているか
  };
  dataHostage?: {
    lockInFactor: string; // 人質資産（例: "過去5年分の業務データ", "社内API連携"）
    detail: string; // 解約すると会社が死ぬ仕掛け
  };
  affiliateBribery?: {
    commissionRate: string; // 還元率（例: "売上の30%永久還元"）
    detail: string; // 他人の強欲を走らせる紹介配管
  };
  upfrontCash?: {
    cashCycle: string; // キャッシュ幾何学（例: "年払い一括前金 ＋ 原価月割り後払い"）
    detail: string; // 客の現金を使って事業を拡大する無元手拡大の仕掛け
  };
  pivotGraveyard?: {
    failedAttempts: string[]; // 過去に爆死させたプロダクト群
    breakthroughSecret: string; // 何を変えた瞬間に当たったかの境界線
  };
}

// 【Layer 3: 万能救済ストリーム型】（型に収まらない全観測データを1文字も捨てずにカード化）
export interface UniversalObservation {
  id?: string;
  category: 'MARKET_DISTORTION' | 'SAVANNAH_PAIN' | 'INCUMBENT_DILEMMA' | 'FOUNDER_HACK' | 'FORUM_RAGE' | 'TECH_VERIFICATION' | 'RESEARCH_LIMIT';
  categoryLabel: string; // 例: "市場の歪み", "大手の自爆", "サバンナOSの急所", "現場の泥臭い工夫", "調査限界"
  text: string;
  originType?: 'observed' | 'inferred' | 'reported' | 'estimated';
  verificationStatus?: 'SUPPORTED' | 'UNVERIFIED' | 'REFUTED';
  sourceUrl?: string;
  observedAt?: string;
}

export interface UniversalCoverageItem {
  dimension: string;
  status: 'found' | 'attempted_unavailable' | 'not_applicable';
  note?: string;
  attempts?: string[];
}

export type ViabilityStatus = 
  | 'ACTIVE_PLAYBOOK'      // 現在もそのまま有効（法規制や構造的隙間が継続中）
  | 'RISING_WAVE'          // 急上昇トレンド中（いま参入余地がある最前線）
  | 'MATURED_MOAT'         // 先行者が堀を完成させており後発模倣は困難（歴史的教訓）
  | 'HISTORICAL_WINDOW'    // 当時の規約・API穴による特異点（現在は塞がれ再現不可）
  | 'EVOLVING_BARRIER';    // 技術進化により要求水準が上昇（特化が必要）

export interface TemporalIntelligence {
  foundedYear: number;               // 創業・ローンチ年（例: 2014, 2018, 2023）
  initialTractionPeriod: string;     // 初動突破時期（例: "2018年Q3", "2023年秋"）
  dataSnapshotPeriod: string;        // 財務データの観測基準時期（例: "2024年通期 / 2026年最新推計"）
  viabilityStatus: ViabilityStatus;  // 現在の再現性・賞味期限ステータス
  viabilityLabel: string;            // 日本語ラベル（例: "現在も有効", "先行者堀により後発困難", "規約改定で穴消滅"）
  eraContext: string;                // なぜその時代・時期に勝てたのかの構造的背景
  currentViabilityAnalysis: string;  // 「今同じことをやるとどうなるか」の冷徹な判定と根拠
}

export type VerdictStatus = 
  | 'ENTRY_CANDIDATE'   // 参入候補（現在も利益の窓が開いている）
  | 'MONITOR'           // 監視（需要あるが競争激化中 / シグナル注視）
  | 'HOLD'              // 保留（先行者の堀が完成 / 参入障壁高）
  | 'HAZARD_REJECT';    // 危険・地雷（プラットフォーム変更・API原価等で爆死）

export interface OpportunityJudgment {
  verdict: VerdictStatus;
  verdictLabel: string;             // 例: "参入候補", "要監視", "保留", "地雷・爆死"
  oneLineReason: string;            // 「だから何？」を1行で言い切る結論
  demandDelta: string;              // 例: "90日 ↑18%", "年 +65%", "急伸"
  competitionDelta: string;         // 例: "競合 +3社/四半期", "大手参入で激化", "空白地帯"
  entryRequirements: {
    capital: string;                // 例: "初期 $500", "0円"
    technicalDifficulty: 'LOW' | 'MEDIUM' | 'HIGH';
    platformRisk: 'LOW' | 'MEDIUM' | 'CRITICAL';
  };
}

export interface UniversalEvent {
  eventType: string;
  occurredAt: string;
  description: string;
}

// 【動的証拠カード体系（Dynamic Evidence Registry）】
export type DynamicEvidenceCardType = 
  | 'THE_CRIME'           // ① 身も蓋もない一行の真実（誰から・いくら・どうやって抜いたか）
  | 'SMOKING_GUN'         // ② その会社固有の生々しい現物証拠（実際のDM文面、スクショ禁止コード、広告クリエイティブ、裏原価率等）
  | 'DIRTY_GENESIS'       // ③ 最初の100人を仕留めた初期ゲリラ・自演・泥臭い突破ログ
  | 'ASYMMETRIC_LEVERAGE' // ④ 固定費ゼロ・限界費用ゼロで現金を吸い上げる構造（P&L・手残りレントゲン）
  | 'INCUMBENT_TRAP'      // ⑤ 大手がカニバリ・メンツで指をくわえて見逃すしかない死角
  | 'FATAL_BLEED'         // ⑥ 地雷・失敗企業専用：資金炎上・即死の生々しい検死解剖
  | 'LOOT_BLUEPRINT'      // ⑦ この手口を今夜別業界に持ち込むならどう組むかの転用コード
  | 'UNKNOWN_AUDIT';      // ⑧ 取れなかった事実・調査限界の冷徹な開示

export type EvidenceStatus = 'VERIFIED' | 'REPORTED' | 'ESTIMATED' | 'UNKNOWN';

export interface DynamicEvidenceCard {
  id: string;
  type: DynamicEvidenceCardType;
  title: string;
  badge?: string;
  evidenceStatus: EvidenceStatus;
  punchline: string; // 1行で脳汁が出る急所・結論
  details?: string[]; // 生々しい客観事実・物証の箇条書き
  metrics?: { label: string; value: string; isHighlight?: boolean }[]; // 強烈な数字（原価18%, 1人で年商2億等）
  codeSnippet?: string; // 実際のコード、DM文面、プロンプト等の現物テキスト
  sourceNote?: string; // 一次情報源（SEC提出書類, 創業者X魚拓, Stripeダッシュボード等）
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
  opportunityJudgment?: OpportunityJudgment; // 【即時意思決定】参入候補/監視/地雷判定 ＆ 需要競争Delta

  // 資本主義の裏帳簿：知的興奮・探索3大トリガー
  architecturePattern: string; // 構造の型（例: "直販要塞・相見積もり殺し", "APIラッパー・自撮り特化", "水門寄生・決済通行税", "テンプレ販売・無料逆手"）
  pipelineStack: string; // 現場の配管・主要ツール（例: "Replicate API × Hetzner × Stripe", "Clay × Make × OpenAI"）
  targetPainWallet: string; // 人質にした財布・痛み（例: "個人の見栄（写真館スタジオの羞恥心回避）", "工場長の保身（ライン停止恐怖）"）

  // 多次元探索・スクリーニングタグ
  tags: string[]; // 例: ["完全1人", "API包装", "利益率80%超", "B2B", "初期費用0円"]

  // 【動的証拠保全カード配列（Dynamic Evidence Registry）】
  evidenceCards?: DynamicEvidenceCard[]; // 企業固有の存在する特異点事実カードのみを動的に召喚

  // 【Layer 2 & Layer 3: 3層ハイブリッドUI完全表示保障用フィールド】
  temporal?: TemporalIntelligence; // 時系列インテリジェンス（創業年、データ時期、現時点での賞味期限判定）
  dynamicMoats?: DynamicMoats; // Layer 2: 動的特異点ブロック（データが存在する項目のみ展開）
  observationsStream?: UniversalObservation[]; // Layer 3: 万能救済ストリーム（型に収まらない全データ）
  timelineEvents?: UniversalEvent[]; // 重要タイムライン・マイルストーン
  coverageAudit?: UniversalCoverageItem[]; // 監査カバレッジ・調査試行ログ
  unknownsNotes?: string[]; // 調査限界・非公開要素の明記
}

export type GridFilterOption = 
  | 'ALL'
  | 'SOLO'
  | 'HIGH_MARGIN'
  | 'ZERO_CAPITAL'
  | 'MONOPOLY'
  | 'AI_NATIVE'
  | 'BOOKMARKED';

export type WorkspaceMode = 
  | 'LEDGER' 
  | 'ARCHETYPES' 
  | 'RADAR' 
  | 'SYNTHESIS' 
  | 'DEEP_DIVE';

// ─── 市場の歪み・急上昇トレンド（Market Anomaly & Trend） ───
export type AnomalyCategory = 
  | 'COST_COLLAPSE'       // 原価破壊 (0.3円API vs 高額手作業)
  | 'REGULATORY_FORCE'    // 法改正・義務化 (罰則恐怖による強制需要)
  | 'SUCCESSION_VACUUM'   // 承継空白・職人高齢化 (大手が相手にしないニッチ)
  | 'PLATFORM_PARASITE'   // 巨大PFの規約改定・隙間 (アルゴリズムの歪み)
  | 'STATUS_ARBITRAGE';   // 社会的地位・虚栄の歪み (面談羞恥心・ステータス)

export interface MarketAnomaly {
  id: string;
  category: AnomalyCategory;
  categoryLabel: string;
  title: string;
  subtitle: string;
  signalBadge: string;        // 例: '+380% 急上昇', '法改正まであと90日'
  growthRate?: string;        // 例: '+380%', '+520%'
  signalData?: string;        // 予兆の客観データ（検索急増、法改正日程、現場の価格差等）
  isHot?: boolean;
  heatScore: number;          // 0 - 100
  updatedAt: string;          // 逐一更新の証 (例: '2026-03-01')
  targetPainWallet: string;   // 狙う痛みの財布 (サバンナOS)
  incumbentTrap: string;      // 大手・既存産業の自爆構造 (カニバリズム障壁)
  trendingPlaybook: string;   // いま現場で流行っている抜き方・手口
  techStack: string[];        // 実際の構築ツール・原価配管
  expectedRevenue: string;    // 想定月商レンジ
  netMarginPercent: number;   // 実効手残り純利率 (%)
  proofEntityIds: string[];   // 裏付け実在銘柄ID群 (LEDGER直通)
  guerrillaTractionLog: string; // 初動突破の客観事実ログ
}

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
  | 'privacy_saas'
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

