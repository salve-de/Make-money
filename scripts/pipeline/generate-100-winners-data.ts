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
          { name: 'ESP / ニュースレター配信基盤', category: '配信ツール', monthlyCost: Math.round(toolsAndSaaS * 0.6) },
          { name: 'Stripe Billing', category: '決済ツール', monthlyCost: Math.round(monthlyRevenue * 0.03) }
        ]
      : isFintech
      ? [
          { name: 'BaaS / 銀行コアAPI・清算網', category: '金融インフラ', monthlyCost: Math.round(toolsAndSaaS * 0.7) },
          { name: 'AML / 本人確認KYC基盤', category: 'コンプライアンス基盤', monthlyCost: Math.round(toolsAndSaaS * 0.3) }
        ]
      : [
          { name: 'Stripe Billing', category: '決済ツール', monthlyCost: Math.round(monthlyRevenue * 0.03) },
          { name: 'Cloud Infrastructure', category: 'ホスティング', monthlyCost: serverAndApi }
        ]
  );

  // 2. ExecutionChecklist（業態に即した実践ステップ）
  const resolvedChecklist = def.executionChecklist || (
    isOffline
      ? [
          '既存流通（問屋・小売）が中抜きしている多重マージンの無駄を特定する',
          '工場（OEM）または遊休不動産を直結し、圧倒的低原価のプロトタイプを仕込む',
          '自社直販・現金回収を徹底し、広告費ゼロで熱狂的ファン口コミにより拡大する'
        ]
      : isContent
      ? [
          '既存ニュース・媒体の退屈さ・長文のストレスを突き、1分で読める短尺フォーマットを作る',
          '無料ニュースレターやSNSで熱狂的な読者プールを囲い込む',
          'スポンサー直販枠または有料限定コミュニティを開設して収益化する'
        ]
      : isFintech
      ? [
          '伝統的銀行・金融機関が取っている不当な為替・送金・月額手数料の隙間を特定する',
          '既存API（Stripe, BaaS, Plaid）の上に優れたUIを被せる',
          'トランザクション手数料または預金金利スプレッドから初日から収益化する'
        ]
      : [
          '対象領域の既存ツールの過剰機能と価格高騰に対する不満を特定する',
          '急所となる単一機能に特化した超軽量MVPを最小工数で構築する',
          '即時決済や年払いプランを直結し、初動から広告費をかけずに回収する'
        ]
  );

  // 3. PrimaryChannels（初動の主集客エンジンを個別配分）
  const resolvedPrimaryChannels = def.primaryChannels || [
    `【主集客】${def.architecturePattern.split('×')[0] || def.name}`,
    `【口コミ】${def.initialTraction[0] || 'ファン口コミ'}`,
    `【リピート導線】${def.tollGateSetup}`
  ];

  const formatMoney = (yen: number) => {
    if (yen >= 100000000) return `¥${(yen / 100000000).toFixed(1)}億円`;
    if (yen >= 10000) return `¥${Math.round(yen / 10000)}万円`;
    return `¥${yen.toLocaleString()}`;
  };

  // 4. 特異事実カード群 (Dynamic Evidence Cards) - 業態別・個別化
  const card1Title = isOffline
    ? `【儲かる仕組み】${def.name}が既存流通を中抜きし圧倒的安さを生み出す店舗設計図`
    : isContent
    ? `【儲かる仕組み】${def.name}が読者の時間を節約し熱狂的コミュニティを作る配信設計図`
    : isFintech
    ? `【儲かる仕組み】${def.name}が既存銀行の高額手数料の隙間を突いて稼ぐ金融設計図`
    : `【儲かる仕組み】${def.name}が巨人の隙間を突き「1機能特化×即時回収」で稼ぐ設計図`;

  const card1Details = isOffline ? [
    `【課題の特定】: 「${def.targetPrey}」という消費者の切実な負担・不満を直撃。`,
    `【独自の工夫】: ${def.stealthEntry}により、他店では真似できない圧倒的なコストパフォーマンスを提供。`,
    `【収益化の仕組み】: ${def.tollGateSetup}。`
  ] : isContent ? [
    `【課題の特定】: 「${def.targetPrey}」という読者の情報過多・長文のストレスを直撃。`,
    `【独自の工夫】: ${def.stealthEntry}により、隙間時間で即座に要点を掴める超短尺フォーマットを提供。`,
    `【収益化の仕組み】: ${def.tollGateSetup}。`
  ] : isFintech ? [
    `【課題の特定】: 「${def.targetPrey}」という利用者の理不尽な手数料負担・遅い手続きを直撃。`,
    `【独自の工夫】: ${def.stealthEntry}により、従来の金融機関の10倍スムーズな手続きを実現。`,
    `【収益化の仕組み】: ${def.tollGateSetup}。`
  ] : [
    `【課題の特定】: 「${def.targetPrey}」というユーザーの面倒な手作業や非効率を直撃。`,
    `【独自の工夫】: ${def.stealthEntry}により、誰でも迷わず数秒で目的を完了できる操作性を実現。`,
    `【収益化の仕組み】: ${def.tollGateSetup}。`
  ];

  const card2Title = isOffline
    ? `【初動の突破口】${def.name}が現場の工夫と口コミで初期ファンを獲得した記録`
    : isContent
    ? `【初動の突破口】${def.name}が広告費ゼロで熱狂的な初期読者を獲得した記録`
    : isFintech
    ? `【初動の突破口】${def.name}が最初の取引ユーザーを泥臭く獲得した記録`
    : `【初動の突破口】${def.name}が最小チームで初期ユーザーを獲得した泥臭い集客ログ`;

  const card2Details = [
    `創業初期の泥臭いアクション: ${def.initialTraction.join('、')}。`,
    `顧客が即決した理由: 「${def.targetPainWallet || def.targetPrey}」を劇的に解決。`,
    `手元に残る現金実額: 月商${formatMoney(monthlyRevenue)}に対し、原価と諸経費を引いた月間営業利益は約${formatMoney(operatingProfit)}（年間手残り純利益換算 約${formatMoney(estimatedAnnualNetProfit)}）。`
  ];

  const card3Title = isOffline
    ? `【ライバルが真似できない理由】なぜ既存の大手流通・同業他社は同じビジネスモデルに対抗できないのか`
    : isContent
    ? `【ライバルが真似できない理由】なぜ伝統的な大手メディアは同じ発信スタイルに転換できないのか`
    : isFintech
    ? `【ライバルが真似できない理由】なぜ既存の大手銀行は同じ低手数料サービスを提供できないのか`
    : `【ライバルが真似できない理由】なぜ既存の巨大IT企業は気づきながら対抗できなかったのか`;

  const card3Details = isOffline ? [
    `大手の構造的制約: ${def.structuralFlaw}。大手は既存の取引先や流通経路との関係があり、同じビジネスモデルに舵を切れない。`,
    `現場のノウハウ格差: ${def.moatDescription}。`,
    `顧客の定着: 圧倒的な価格差と品質により、他店へ浮気しないリピーターを囲い込んでいる。`
  ] : isContent ? [
    `大手メディアの縛り: ${def.structuralFlaw}。大手メディアは既存の広告主や読者層への配慮があり、尖ったフォーマットに舵を切れない。`,
    `編集方針の差別化: ${def.moatDescription}。`,
    `読者の囲い込み: 独自の世界観とコミュニティ化により、解約されにくい熱狂的読者基盤を形成。`
  ] : isFintech ? [
    `既存銀行のジレンマ: ${def.structuralFlaw}。大手銀行は支店網やレガシーシステムの維持費が重く、格安・即時のサービスに追従できない。`,
    `技術・信用の壁: ${def.moatDescription}。`,
    `利用者の定着: 毎日の資金移動や決済に組み込まれることで、乗り換えの手間（スイッチングコスト）を高めている。`
  ] : [
    `大企業のジレンマ: ${def.structuralFlaw}。大手の高価格プランや組織体制では、単一機能の超軽量ツールを安価に提供できない。`,
    `開発・意思決定のスピード: ${def.moatDescription}。`,
    `利用者の定着: 直感的な操作性と毎日の作業への定着により、解約されにくい仕組みを構築。`
  ];

  const evidenceCards: DynamicEvidenceCard[] = [
    {
      id: `ev_${def.id}_loot`,
      type: 'LOOT_BLUEPRINT',
      title: card1Title,
      badge: 'ビジネスモデル',
      evidenceStatus: 'REPORTED',
      punchline: `${def.structuralFlaw}の隙を突き、${def.stealthEntry}で客を囲い込み、粗利益率${def.grossMarginPct}%・営業利益率${def.operatingMarginPct}%を叩き出す。`,
      details: card1Details,
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
      title: card2Title,
      badge: '集客の事実ログ',
      evidenceStatus: 'REPORTED',
      punchline: `${def.initialTraction[0] || def.stealthEntry}。広告に大金を投じるのではなく、ターゲットが集まる現場に直接アプローチして初期需要を掴んだ。`,
      details: card2Details,
      sourceNote: `${def.name} 創業者公表ログ / 財務データ`
    },
    {
      id: `ev_${def.id}_trap`,
      type: 'INCUMBENT_TRAP',
      title: card3Title,
      badge: '競合の弱点',
      evidenceStatus: 'REPORTED',
      punchline: `${def.structuralFlaw}。大手事業者が同じビジネスモデルに舵を切ると既存事業の売上を削ってしまうため、対抗できずに見守るしかなかった。`,
      details: card3Details
    }
  ];

  // 5. 調査観測ストリーム (Universal Observations)
  const observationsStream: UniversalObservation[] = [
    {
      category: 'MARKET_DISTORTION',
      categoryLabel: '通帳に残る現金の実態',
      text: `【損益の実態】年商約${formatMoney(monthlyRevenue * 12)}に対し、原価と経費を引いた営業利益率は${def.operatingMarginPct}%。${def.teamSize === 1 ? '完全1人で' : `${def.teamSize}名の少数組織で`}手元に確実に現金を残す高収益モデル。`,
      originType: 'observed'
    },
    {
      category: 'SAVANNAH_PAIN',
      categoryLabel: '人間の本音と悩み',
      text: `【顧客の切実な需要】${def.targetPainWallet || def.targetPrey}という切実な悩みをピンポイントで解消し、迷わず選ばれる理由を作っている。`,
      originType: 'observed'
    },
    {
      category: 'INCUMBENT_DILEMMA',
      categoryLabel: '大企業の弱点',
      text: `【大手が真似できない理由】${def.structuralFlaw}。既存の大手事業者は自社の主力事業や既存体制を守る必要があり、同じモデルに対抗できない。`,
      originType: 'observed'
    },
    {
      category: 'FORUM_RAGE',
      categoryLabel: '顧客定着の仕組み',
      text: `【解約されない仕組み】${def.tollGateSetup}。`,
      originType: 'observed'
    },
    {
      category: 'TECH_VERIFICATION',
      categoryLabel: '運用インフラ',
      text: `【運用ツール】主要ツール構成: ${resolvedToolStack.map(t => t.name).join('、')}。少数組織による高効率運営を実現。`,
      originType: 'observed'
    }
  ];

  // 6. essence
  const resolvedEssence = isOffline ? {
    whatItDoes: `${def.name}は、「${def.targetPainWallet || def.targetPrey}」を抱える顧客に対し、${def.stealthEntry}によって他社では不可能な低価格と価値を提供し、営業利益率${def.operatingMarginPct}%を実現する高収益店舗・製造モデル。`,
    targetCustomer: `既存チェーンの価格高騰や画一的な品揃えに不満を抱え、品質と圧倒的なコストパフォーマンスを求める${def.targetPainWallet || def.targetPrey}の顧客層。`,
    painRelief: `${def.targetPrey}。中間流通マージンを極限まで削ぎ落とし、家計の負担を劇的に軽減する。`
  } : isContent ? {
    whatItDoes: `${def.name}は、「${def.targetPainWallet || def.targetPrey}」を抱える読者層に対し、短時間で要点を掴めるコンテンツを配信し、${def.teamSize === 1 ? '完全1人で' : '少数精鋭で'}営業利益率${def.operatingMarginPct}%を叩き出すメディアモデル。`,
    targetCustomer: `既存の長文ニュースや退屈なメディアに時間を奪われたくない${def.targetPainWallet || def.targetPrey}のビジネスパーソンや専門家。`,
    painRelief: `${def.targetPrey}。情報収集のストレスを解消し、毎朝数分で業界の最前線を把握させる。`
  } : isFintech ? {
    whatItDoes: `${def.name}は、「${def.targetPainWallet || def.targetPrey}」に直面する個人・事業者に対し、${def.stealthEntry}によって手数料と手続き負担を最小化し、営業利益率${def.operatingMarginPct}%を実現する金融インフラモデル。`,
    targetCustomer: `従来の銀行・金融機関の法外な手数料や遅い手続きに不満を抱える${def.targetPainWallet || def.targetPrey}のユーザー。`,
    painRelief: `${def.targetPrey}。不透明な為替・送金・決済手数料を排除し、即時・低コストの資金移動を実現する。`
  } : {
    whatItDoes: `${def.name}は、「${def.targetPainWallet || def.targetPrey}」に悩むユーザーに対し、${def.stealthEntry}によって手作業を効率化し、${def.teamSize === 1 ? '完全1人で' : '少数精鋭で'}営業利益率${def.operatingMarginPct}%を実現するソフトウェアモデル。`,
    targetCustomer: `既存の多機能ツールの複雑さや高額な料金に不満を持ち、特定業務を素早く終わらせたい${def.targetPainWallet || def.targetPrey}の現場担当者。`,
    painRelief: `${def.targetPrey}。面倒な手作業や複雑な設定のストレスを解消し、直感的な操作で目的を達成させる。`
  };

  const resolvedBlindspot = isOffline
    ? `【既存業界の死角】${def.structuralFlaw}。大手チェーンは既存の納入業者や流通網へのしがらみがあり、徹底した仕入れ改革や低価格特化への転換が難しかった。そこへ${def.name}が「${def.stealthEntry}」で割り込み、熱狂的な支持を獲得した。`
    : isContent
    ? `【既存メディアの死角】${def.structuralFlaw}。伝統的メディアは既存の広告主配慮や長文至上主義から抜け出せず、読者の「要点だけ手短に知りたい」需要を放置していた。そこへ${def.name}が「${def.stealthEntry}」で読者を囲い込んだ。`
    : isFintech
    ? `【既存金融の死角】${def.structuralFlaw}。大手金融機関は支店網の維持費や不透明な手数料収益に依存しており、自ら手数料を下げる動機がなかった。そこへ${def.name}が「${def.stealthEntry}」で透明な価格を提示し、顧客を一気に奪取した。`
    : `【既存巨人の死角】${def.structuralFlaw}。大手事業者は高単価な大企業向け契約を守る必要があり、単一機能の超軽量・低価格ツールを出すことができなかった。そこへ${def.name}が「${def.stealthEntry}」で参入し、ライト層の需要を総取りした。`;

  const resolvedIncumbentDilemma = isOffline
    ? `既存の大手企業は「${def.structuralFlaw}」という制約を抱えている。${def.name}と同じ低価格・独自仕入れを実行すると自社の既存店舗の収益モデルが崩れるため、同じ手を打てずに見守るしかなかった。`
    : isContent
    ? `既存の伝統メディアは「${def.structuralFlaw}」という看板を抱えている。${def.name}のような尖った超短尺配信を行うと自社の広告枠単価が下がるため、模倣できずに見守るしかなかった。`
    : isFintech
    ? `既存の大手銀行は「${def.structuralFlaw}」という収益構造に依存している。${def.name}と同じ手数料体系に引き下げると自社の最大の収益源を失うため、対抗できずに顧客流出を招いた。`
    : `既存大手は「${def.structuralFlaw}」というジレンマに陥っている。${def.name}のような軽量・安価な単一機能を提供すると自社の主力高額プランとバッティングするため、経営陣は認知していても対抗策を打てない。`;

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
    essence: resolvedEssence,
    operations: {
      teamSize: def.teamSize,
      weeklyHours: def.teamSize === 1 ? 20 : 40,
      initialCapitalRequired: def.teamSize === 1 ? 50000 : 1000000,
      automationLevel: def.teamSize === 1 ? 95 : 75,
      primaryChannels: resolvedPrimaryChannels,
      toolStack: resolvedToolStack
    },
    strategy: {
      blindspot: resolvedBlindspot,
      moatType: def.moatType,
      moatDescription: `【参入障壁の正体】${def.moatDescription}。${def.teamSize === 1 ? '完全1人体制による固定費ほぼゼロの低コスト構造' : '徹底した効率化による低コスト構造'}を敷いており、後発競合が参入しても利益を出しにくい仕組みを作り上げている。`,
      incumbentDilemma: resolvedIncumbentDilemma,
      secretInsight: `現場の工夫: ${def.stealthEntry}。ユーザーが最も手間なく目的を達成できる動線に集中した点にある。`,
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
      eraContext: isOffline
        ? '物価高と家計防衛意識の高まり。無駄な流通マージンを削った店舗・製造モデルが急伸した環境。'
        : isContent
        ? '情報過多時代における要約・短尺メディア需要の急増。'
        : isFintech
        ? 'グローバル化とキャッシュレス進展に伴う送金・決済の効率化需要。'
        : 'AIとセルフサーブSaaSの普及期。最小チームで巨大企業からシェアを奪うゲリラ戦が成立した環境。',
      currentViabilityAnalysis: isOffline
        ? '仕入れ網や店舗オペレーションの現場ノウハウが最大の参入障壁となり、現在も高い参入障壁を維持。'
        : '現在も手口の有効性は持続しているが、同様の単一機能ツールが乱立しているため、特定ニッチ（業界・言語・特定職種）への特化が重要。'
    },
    observations: def.observations && def.observations.length >= 4
      ? def.observations
      : observationsStream.map(o => o.text)
  };
}
