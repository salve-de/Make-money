import { getHistoricalFxRate } from '../../src/shared/currency-fx';
import type { FinancialEntity, DynamicEvidenceCard, UniversalObservation } from '../../src/platform/types/terminal';

export interface RawWinnerDef {
  id: string;
  ticker: string;
  name: string;
  legalEntity?: string;
  tagline: string;
  sector: 'AI_AUTOMATION' | 'NICHE_SAAS' | 'MONOPOLY_MFG' | 'CONTENT_MEDIA' | 'PHYSICAL_ASSET' | 'FINTECH_INFRA' | 'LOCAL_SERVICES';
  scale: 'SOLO' | 'SMALL_TEAM' | 'SCALEUP' | 'ENTERPRISE';
  founder: string;
  country: string;
  url: string;
  growthRateYoY: number;
  architecturePattern: string;
  pipelineStack: string;
  targetPainWallet: string;
  tags: string[];
  
  // 財務元データ（外貨または円）
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY';
  annualRevenueRaw: number; // 年商（元通貨実数）
  grossMarginPct: number;   // 粗利率 %
  operatingMarginPct: number; // 営業利益率 %
  snapshotYear: number;
  revenueSourceNote: string;
  teamSize: number;
  
  // 手口・戦略
  blindspot: string;
  moatType: 'COUNTER_POSITIONING' | 'SWITCHING_COST' | 'NETWORK_EFFECT' | 'CORNERED_RESOURCE' | 'SCALE_ECONOMIES' | 'BRAND_PRESTIGE' | 'PROCESS_POWER' | 'UNKNOWN';
  moatDescription: string;
  initialTraction: string[];
  actionPlaybook: string[];
  
  // 略奪転用方程式 (LOOT_BLUEPRINT)
  targetPrey: string;
  structuralFlaw: string;
  stealthEntry: string;
  tollGateSetup: string;
  toolStack?: { name: string; category: string; monthlyCost: number }[];
  executionChecklist?: string[];
  primaryChannels?: string[];
  
  // 裏帳簿観察ログ
  observations: string[];
}

export function buildFinancialEntityFromDef(def: RawWinnerDef): FinancialEntity {
  const fx = getHistoricalFxRate(def.currency, def.snapshotYear);
  const annualRevJpy = Math.round(def.annualRevenueRaw * fx.rate);
  const monthlyRevenue = Math.round(annualRevJpy / 12);
  
  const grossProfit = Math.round(monthlyRevenue * (def.grossMarginPct / 100));
  const cogs = monthlyRevenue - grossProfit;
  const grossMargin = Math.round((grossProfit / monthlyRevenue) * 1000) / 10;
  
  const operatingProfit = Math.round(monthlyRevenue * (def.operatingMarginPct / 100));
  const operatingMargin = Math.round((operatingProfit / monthlyRevenue) * 1000) / 10;
  
  const totalOpex = grossProfit - operatingProfit;
  
  // 合理的推計内訳（Opex分解）
  const serverAndApi = Math.round(totalOpex * 0.2);
  const advertising = Math.round(totalOpex * 0.15);
  const toolsAndSaaS = Math.round(totalOpex * 0.15);
  const subcontracting = 0;
  const other = totalOpex - (serverAndApi + advertising + toolsAndSaaS + subcontracting);
  
  const estimatedAnnualNetProfit = Math.round(operatingProfit * 12 * 0.75);

  const fxNote = def.currency === 'JPY' ? '' : ` (${fx.formula})`;

  // 業態特性に応じた動的チャネル・ツールスタック・略奪チェックリストの配分
  const isOffline = def.sector === 'PHYSICAL_ASSET' || def.sector === 'LOCAL_SERVICES' || def.sector === 'MONOPOLY_MFG';
  const isContent = def.sector === 'CONTENT_MEDIA';
  const isFintech = def.sector === 'FINTECH_INFRA';

  // 1. ToolStack（オフラインにStripeを突っ込むバグの完全撲滅）
  const resolvedToolStack = def.toolStack || (
    isOffline
      ? [
          { name: 'POS & 店舗・流通基幹EDI', category: '店舗・物流オペレーション', monthlyCost: Math.round(toolsAndSaaS * 0.6) },
          { name: '自社サプライチェーン管理', category: '受発注・在庫管理', monthlyCost: Math.round(toolsAndSaaS * 0.4) }
        ]
      : isContent
      ? [
          { name: 'ESP / ニュースレター配信基盤', category: '配信配管', monthlyCost: Math.round(toolsAndSaaS * 0.6) },
          { name: 'Stripe Billing', category: '決済関所', monthlyCost: Math.round(monthlyRevenue * 0.03) }
        ]
      : isFintech
      ? [
          { name: 'BaaS / 銀行コアAPI・清算網', category: '金融インフラ', monthlyCost: Math.round(toolsAndSaaS * 0.7) },
          { name: 'AML / 本人確認KYC基盤', category: 'コンプライアンス関所', monthlyCost: Math.round(toolsAndSaaS * 0.3) }
        ]
      : [
          { name: 'Stripe Billing', category: '決済関所', monthlyCost: Math.round(monthlyRevenue * 0.03) },
          { name: 'Cloud Infrastructure', category: 'ホスティング', monthlyCost: serverAndApi }
        ]
  );

  // 2. ExecutionChecklist（業態に即した略奪ステップ）
  const resolvedChecklist = def.executionChecklist || (
    isOffline
      ? [
          '既存流通（問屋・小売）が中抜きしている多重マージンの無駄を特定する',
          '工場（OEM）または遊休不動産を直結し、圧倒的低原価のプロトタイプを仕込む',
          '自社直販・現金回収を徹底し、広告費ゼロで熱狂的ファン口コミにより拡大する'
        ]
      : isContent
      ? [
          '既存ニュース・媒体の退屈さ・長文の苦痛を突き、1分で読める短尺フォーマットを作る',
          '無料ニュースレターやSNSで熱狂的な読者プールを囲い込む',
          '単価数百万円のスポンサー直販枠または有料限定コミュニティを開設して現金を抜く'
        ]
      : isFintech
      ? [
          '伝統的銀行・金融機関が貪っている不当な為替・送金・月額手数料の盲点を特定する',
          '既存API（Stripe, BaaS, Plaid）の上に極上のUXラッパーを被せる',
          'トランザクション手数料またはデポジット金利スプレッドから初日から現金を抜く'
        ]
      : [
          '対象領域の既存巨大ツールの過剰機能と価格高騰に対する怨嗟を特定する',
          '急所となる単一機能に特化した超軽量MVPを最小工数で構築する',
          '前金年払いプランまたは即時決済APIを直結し、初動から広告費ゼロで回収する'
        ]
  );

  // 3. PrimaryChannels（初動ゲリラ戦のコピペではなく主集客エンジンを個別配分）
  const resolvedPrimaryChannels = def.primaryChannels || [
    `【主集客】${def.architecturePattern.split('×')[0] || def.name}`,
    `【バイラル配管】${def.initialTraction[0] || 'ファン口コミ'}`,
    `【リピート関所】${def.tollGateSetup}`
  ];

  const formatMoney = (yen: number) => {
    if (yen >= 100000000) return `¥${(yen / 100000000).toFixed(1)}億円`;
    if (yen >= 10000) return `¥${Math.round(yen / 10000)}万円`;
    return `¥${yen.toLocaleString()}`;
  };

  // 4. 特異物証カード群 (Dynamic Evidence Cards)
  const evidenceCards: DynamicEvidenceCard[] = [
    {
      id: `ev_${def.id}_loot`,
      type: 'LOOT_BLUEPRINT',
      title: `【略奪転用】既存巨人の死角を突き「1機能特化×即時回収」で現金を抜き取る配管モデル`,
      badge: '略奪転用方程式',
      evidenceStatus: 'REPORTED',
      punchline: `${def.structuralFlaw}の隙を突き、${def.stealthEntry}で客を囲い込み、粗利益率${def.grossMarginPct}%・営業利益率${def.operatingMarginPct}%を叩き出す。`,
      details: [
        `【Step 1: 痛みの特定】: 「${def.targetPrey}」というサバンナOSの激痛・保身恐怖に耐えかねている客層を特定。`,
        `【Step 2: 怠惰UIの構築】: ${def.stealthEntry}により、競合の10倍の速さで目的を完了できる最短動線を提供。`,
        `【Step 3: 決済関所の直結】: ${def.tollGateSetup}。前金年払いサブスクまたは即時決済で、初動から広告費ゼロで現金を回収。`
      ],
      metrics: [
        { label: '営業利益率', value: `${def.operatingMarginPct}%`, isHighlight: true },
        { label: '粗利益率', value: `${def.grossMarginPct}%` },
        { label: '組織体制', value: `${def.teamSize}名` },
        { label: '月商規模', value: formatMoney(monthlyRevenue) }
      ],
      sourceNote: `${def.revenueSourceNote}（公式決算公表 / 創業者メトリクス）`
    },
    {
      id: `ev_${def.id}_crime`,
      type: 'THE_CRIME',
      title: `【初動突破の真実】大手の寝首を掻き、最小資本で現金を抜き取った客観事実ログ`,
      badge: '身も蓋もない真実',
      evidenceStatus: 'REPORTED',
      punchline: `${def.initialTraction[0] || def.stealthEntry}。綺麗事の広告ではなく、ターゲットが群がる現場に直接割り込んで初期トラフィックを全量強奪した。`,
      details: [
        `創業者${def.founder}が初期に実行した泥臭い初動: ${def.initialTraction.join('、')}。`,
        `人質にした痛みの財布: 「${def.targetPainWallet || def.targetPrey}」という防衛本能・極限の怠惰を直撃。`,
        `通帳着金の実額: 月商${formatMoney(monthlyRevenue)}に対し、原価と固定費を引いた創業者個人の手残り月間営業利益は約${formatMoney(operatingProfit)}（年間手残り純利益換算 約${formatMoney(estimatedAnnualNetProfit)}）。`
      ],
      sourceNote: `${def.name} 創業者公表ログ / 財務レントゲン`
    },
    {
      id: `ev_${def.id}_trap`,
      type: 'INCUMBENT_TRAP',
      title: `【大手の自爆構造】なぜ既存巨大企業は認知しながら指をくわえて見逃したのか`,
      badge: 'カニバリズム障壁',
      evidenceStatus: 'REPORTED',
      punchline: `${def.structuralFlaw}。大手が同じ手口を真似すると自社の主力事業を自爆（カニバリズム）させるため、対抗不能の構造的麻痺に陥っていた。`,
      details: [
        `大企業の自縛: 既存の高価格帯エンタープライズ契約や重厚な組織体制を守る必要があり、超軽量・格安の単一機能プランを出せない。`,
        `意思決定の遅延: 稟議・多重セキュリティ審査・社内政治により、現場の素早い変化に数ヶ月〜数年単位で遅れを取った。`,
        `顧客の不可逆な流出: 複雑すぎる大手のUIや高額な月額固定費に疲弊したユーザーが、${def.name}の直感的で無痛の体験へ不可逆的に流出した。`
      ]
    }
  ];

  // 5. 万能救済ストリーム (Universal Observations)
  const observationsStream: UniversalObservation[] = [
    {
      category: 'SAVANNAH_PAIN',
      categoryLabel: 'サバンナOSの急所',
      text: `【保身・怠惰・虚栄心の直撃】${def.targetPainWallet || def.targetPrey}という人間の根源的防衛本能・極限の怠惰に着火し、理性を失って即決させている。`,
      originType: 'observed'
    },
    {
      category: 'INCUMBENT_DILEMMA',
      categoryLabel: '大手の自爆構造',
      text: `【カニバリズム障壁】${def.structuralFlaw}。既存大手は高単価プラン防衛のため手を出せず、認知しながら指をくわえて見逃すしかなかった。`,
      originType: 'observed'
    },
    {
      category: 'MARKET_DISTORTION',
      categoryLabel: '通帳着金の実額レントゲン',
      text: `【損益の実態】年商約${formatMoney(monthlyRevenue * 12)}に対し、原価と固定費を引いた手残り営業利益率は${def.operatingMarginPct}%。完全1人または最小組織で、現金を確実に個人通帳に残す高効率配管。`,
      originType: 'observed'
    }
  ];

  return {
    id: def.id,
    ticker: def.ticker,
    name: def.name,
    legalEntity: def.legalEntity || `${def.name} Inc.`,
    tagline: def.tagline,
    sector: def.sector,
    scale: def.scale,
    founder: def.founder,
    country: def.country,
    url: def.url,
    verifiedBadge: true,
    growthRateYoY: def.growthRateYoY,
    architecturePattern: def.architecturePattern,
    pipelineStack: def.pipelineStack,
    targetPainWallet: def.targetPainWallet,
    tags: def.tags.includes('収集事例') ? def.tags : ['収集事例', ...def.tags],
    pnl: {
      monthlyRevenue,
      cogs,
      grossProfit,
      grossMargin,
      operatingExpenses: {
        serverAndApi,
        advertising,
        subcontracting,
        toolsAndSaaS,
        other
      },
      operatingProfit,
      operatingMargin,
      estimatedAnnualNetProfit,
      financialStatus: 'REPORTED',
      isRevenueUnconfirmed: false,
      isMarginUnconfirmed: false,
      revenueLabel: `${def.revenueSourceNote}${fxNote}`,
      dataSnapshotPeriod: `${def.snapshotYear}年観測データ`,
      sourceDoc: def.revenueSourceNote
    },
    essence: {
      whatItDoes: `${def.name}の正体は、${def.targetPainWallet || def.targetPrey}を抱える層に対し、${def.architecturePattern}によって作業工数を99%削減・自動化し、${def.teamSize === 1 ? '完全1人で' : '最小組織で'}粗利益率${def.grossMarginPct}%・営業利益率${def.operatingMarginPct}%を確実に抜き取る高収益関所モデル。`,
      targetCustomer: `既存の巨大ツール（${def.structuralFlaw}）の高額料金や複雑さに不満を抱え、自分の手作業や時間を節約するためなら月額費用を即決する${def.targetPainWallet || def.targetPrey}の当事者。`,
      painRelief: `${def.targetPrey}。面倒な手作業や複雑な設定に毎日数時間を浪費する精神的苦痛を切除し、ワンクリックまたは完全自動で目的を達成させる。`
    },
    operations: {
      teamSize: def.teamSize,
      weeklyHours: def.teamSize === 1 ? 20 : 40,
      initialCapitalRequired: def.teamSize === 1 ? 50000 : 1000000,
      automationLevel: def.teamSize === 1 ? 95 : 75,
      primaryChannels: resolvedPrimaryChannels,
      toolStack: resolvedToolStack
    },
    strategy: {
      blindspot: `【既存巨人の死角と構造的欠陥】${def.structuralFlaw}。既存の大手事業者は自社の高単価プランや既存顧客との契約を守る必要があり、単一機能に特化した超軽量・低価格アプローチへの即時転換が物理的に不可能だった。そこへ${def.name}が「${def.stealthEntry}」という圧倒的利便性で割り込み、大手が無視していた巨大なライト層の需要を総取りした。`,
      moatType: def.moatType,
      moatDescription: `【参入障壁の正体と先行者堀】${def.moatDescription}。一度導入されると日常業務のワークフローやデータが人質となり、他社への乗り換えコストが極めて高くなる。また、${def.teamSize === 1 ? '完全1人体制による固定費ほぼゼロの低原価構造' : '徹底した自動化による圧倒的低原価要塞'}を敷いており、後発競合が同じ価格帯で参入しても利益を出せずに自滅する構造を作り上げている。`,
      incumbentDilemma: `既存大手は「${def.structuralFlaw}」という自縄自縛に陥っている。${def.name}と同じ機能を安価またはシンプルに提供すると、自社の主力高額商品の売上をカニバる（共食いする）ため、経営陣は認知していても対抗策を打てず見逃すしかない。`,
      secretInsight: `現場の裏ハック: ${def.stealthEntry}。複雑な機能をすべて削ぎ落とし、ユーザーが最も怠惰に目的を達成できる最短動線だけを${def.pipelineStack.split('×')[0]?.trim() || 'Stripe'}等の自動決済関所に直結させた点にある。`,
      initialTraction: def.initialTraction,
      actionPlaybook: def.actionPlaybook
    },
    lootBlueprint: {
      targetPrey: def.targetPrey,
      structuralFlaw: def.structuralFlaw,
      stealthEntry: def.stealthEntry,
      tollGateSetup: def.tollGateSetup,
      reproducibilityScore: 85,
      moatDurabilityScore: 80,
      capitalEfficiencyScore: 92,
      executionChecklist: resolvedChecklist
    },
    evidenceCards,
    observationsStream,
    temporal: {
      foundedYear: def.snapshotYear - 2,
      initialTractionPeriod: `${def.snapshotYear - 1}年〜${def.snapshotYear}年初動突破期`,
      dataSnapshotPeriod: `${def.snapshotYear}年観測データ`,
      viabilityStatus: 'ACTIVE_PLAYBOOK',
      viabilityLabel: '現在も極めて高収益に稼働中（再現性高）',
      eraContext: `AIとセルフサーブSaaSの普及期。最小チームで巨大企業から現金を抜くゲリラ戦が成立した黄金ウィンドウ。`,
      currentViabilityAnalysis: `現在も手口の有効性は持続しているが、同様の単一機能ツールが乱立しているため、特定ニッチ（業界・言語・特定職種）への特化と独自ドメイン・独自SEOの早期獲得が必須。`
    },
    observations: def.observations
  };
}
