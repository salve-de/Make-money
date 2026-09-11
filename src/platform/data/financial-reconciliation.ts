import type { DynamicEvidenceCard, FinancialEntity, ProfitAndLossStatement } from '@/shared/terminal';

/** Primary-source readback on 2026-09-11. Original monetary claims remain in SOURCE_INSTITUTIONAL_ENTITIES. */
export const FINANCIAL_RECONCILIATIONS: Record<string, {
  url: string; period: string; finding: string; limitation: string; revenueLabel?: string;
  metrics?: DynamicEvidenceCard['metrics'];
}> = {
  'Photo AI': {
    url: 'https://levels.io/new-420k-mo-revenue-record-lex-fridman', period: '2024-09-22 公表の一時的ピーク',
    finding: '創業者はPhoto AIの月次ペースを$161,000と報告。ただし数日前の1日だけの記録で、その後低下したと明記している。継続MRRではない。',
    limitation: '約80%の利益率は全事業合計。GPU費$60,000もPhoto AIとInterior AIの合算であり、Photo AI単体の利益・原価へ配分できない。円換算の為替根拠も未取得。',
    revenueLabel: 'ピーク $161,000/月相当',
    metrics: [{ label: 'Photo AIの一時的月次ペース（USD）', value: '$161,000' }, { label: '観測範囲', value: '2024年9月の一時的ピーク。継続MRRではない' }],
  },
  'Acquire.com (旧 MicroAcquire)': {
    url: 'https://help.acquire.com/how-much-does-it-cost-to-sell', period: '2026-09-11 料金ページ確認',
    finding: '売り手への掲載料と成約手数料を持つ。成約総額はプラットフォーム自身の売上とは異なる。',
    limitation: '有料買い手数・取引額の対象期間・自社経費の根拠が揃わず、旧月商6,000万円と営業利益4,200万円は採用しない。',
  },
  'Demand Curve': {
    url: 'https://www.demandcurve.com/', period: '2026-09-11 公式サイト確認',
    finding: '公式サイトはスタートアップ向け成長支援サービスを掲載。支援先で生み出した売上と自社売上は区別が必要。',
    limitation: '旧年間受講者600〜800人と自社年商$3M、経費内訳はこの一次資料で確認できない。',
  },
  'Ali Abdaal Courses': {
    url: 'https://aliabdaal.com/about/', period: '2020年・全事業',
    finding: '本人は2020年に事業の年商が初めて$1Mに達したと記載。講座だけの売上ではない。',
    limitation: '2023〜2024年の講座売上$5Mや利益率72%の証明には使用できない。講座単独のP&Lは未確認。',
    metrics: [{ label: '2020年の全事業年商（本人報告）', value: '$1,000,000' }],
  },
  'Red Gregory': {
    url: 'https://redgregory.gumroad.com/l/client-projects-notion-database', period: '2026-09-11 公式販売ページ検索確認',
    finding: '本人のGumroadにクライアント業務管理用Notionテンプレートの販売ページがある。',
    limitation: '月間販売300〜400件・広告収入・月商125万円・実費は確認できない。ページ本文取得は空で価格の再確認もできなかった。',
  },
  "S'well": {
    url: 'https://lifetimebrands.gcs-web.com/news-releases/news-release-details/lifetime-brands-acquires-swellr', period: '2022-03-03 買収発表・統合後予想',
    finding: 'Lifetime BrandsはS’well事業・資産取得を発表し、統合後の年換算EBITDA寄与を約$4.5Mと予想した。',
    limitation: '予想EBITDAは確定営業利益・純利益ではない。旧年商$100Mと利益率22%をこの資料から裏付けることはできない。',
    metrics: [{ label: '統合後の年換算EBITDA寄与予想（USD）', value: '約$4,500,000' }],
  },
  'Chubbies': {
    url: 'https://investors.solobrands.com/financials/quarterly-results/default.aspx', period: '2025年通期 Chubbiesセグメント',
    finding: 'Solo Brandsのセグメント開示は売上$122.943M、売上原価$51.749M、セグメントEBITDA $22.411M。',
    limitation: 'EBITDAを営業利益や個人手残りとして扱わない。円換算と月商平均化は行わない。旧2021年P&Lはこの2025年実績と混ぜない。',
    revenueLabel: '2025年売上 $122.943M',
    metrics: [{ label: '2025年通期売上（USD）', value: '$122,943,000' }, { label: '2025年通期売上原価（USD）', value: '$51,749,000' }, { label: '2025年通期粗利益（売上−原価で算出）', value: '$71,194,000' }, { label: '2025年通期セグメントEBITDA（営業利益ではない）', value: '$22,411,000' }],
  },
  '2PM': {
    url: 'https://2pml.com/', period: '2026-09-11 公式サイト確認',
    finding: '会員向けライブラリ、Enterprise、広告枠、Growth Partnersの導線を掲載している。',
    limitation: '有料会員3,500人・平均年額$500・自社売上$3Mの根拠はこの一次資料では確認できない。',
  },
  'Flowbase': {
    url: 'https://www.flowbase.co/pricing', period: '2026-09-11 公式料金確認',
    finding: 'Pro+は月払い$39/月、年払いでは月額換算$27。コンポーネントライブラリを提供する。',
    limitation: '有料会員5,000人と旧月商2,500万円は未確認。単価だけから会社売上・利益は求められない。',
    metrics: [{ label: 'Pro+ 月払い', value: '$39/月' }, { label: 'Pro+ 年払いの月額換算', value: '$27/月' }],
  },
  'Baseten': {
    url: 'https://www.baseten.co/pricing/', period: '2026-09-11 公式料金確認',
    finding: 'モデルAPIのトークン課金とモデル配備の従量課金を提供する。',
    limitation: '調達額や顧客企業の一覧は売上ではない。自社年商$20M・GPU原価・人件費配分を証明できず、旧P&Lは採用しない。',
  },
  'Baserow': {
    url: 'https://baserow.io/blog/year-in-review-2024', period: '2024年（2024-12-30公式年次記事）',
    finding: '公式の2024年振り返りはARRの前年比300%成長を報告。登録ユーザー約10万人も掲載するが、有料人数とは述べていない。',
    limitation: 'ARRの増加率から絶対額は求められない。旧年商$5Mと利益率24%は未確認。公式料金も照合したが課金人数・構成が不明。',
    metrics: [{ label: '2024年ARRの前年比成長（会社報告）', value: '+300%' }],
  },
  'Appwrite': {
    url: 'https://appwrite.io/pricing', period: '2026-09-11 公式料金確認',
    finding: 'Free、月額$25からのPro、個別見積もりEnterpriseを提供する。Proには追加従量料金がある。',
    limitation: '登録開発者数は課金顧客数ではない。旧年商$10M・営業利益1,500万円/月を証明できない。',
    metrics: [{ label: 'Pro 基本料金', value: '$25/月から' }],
  },
  'Airgram': {
    url: 'https://www.notta.ai/en/welcome-airgram', period: '2026-09-11 統合告知確認',
    finding: '公式の案内ではAirgramとNottaの統合、AI議事録と音声文字起こしの統合サービスへの移行を告知している。',
    limitation: '旧Airgramの独立した有料ユーザー数・年商$8M・経費はこのページで確認できない。Nottaの数値をAirgramへ移さない。',
  },
  'APUtime': {
    url: 'https://getlatka.com/companies/aputime/interviews/aputime-martin-lonsky-2023', period: '2023年 CEO Martin Lonskyインタビュー（08:00〜12:54）',
    finding: 'CEOインタビューでは月次売上$50,000と顧客300社を確認。$600,000はこの月次売上を12倍した年換算であり、通期確定売上ではない。',
    limitation: '旧年商$2Mと利益額は採用しない。インタビューは本人報告であり監査済み決算ではない。AppSumo買い切りと月次契約が混在するため、継続売上の定義には留意が必要。',
    revenueLabel: '2023年報告 $50,000/月',
    metrics: [{ label: '2023年取材時の月次売上（CEO報告・USD）', value: '$50,000' }, { label: '月次売上×12の年換算（計算値）', value: '$600,000' }],
  },
  'Capacities': {
    url: 'https://capacities.io/pricing', period: '2026-09-11 公式料金確認',
    finding: 'Basic無料、Pro $9.99/月、Believer $12.49/月からを掲載。Believerを$500永久ライセンスとする旧説明は採用しない。',
    limitation: 'Pro会員15,000人と年商$1.6Mの根拠は確認できない。会員数・費用が不明なため利益を計算しない。',
    metrics: [{ label: 'Pro 掲載月額（USD）', value: '$9.99' }, { label: 'Believer 掲載月額（USD）', value: '$12.49から' }],
  },
  'Activepieces': {
    url: 'https://www.activepieces.com/pricing', period: '2026-09-11 公式料金確認',
    finding: 'Plusは年払いで$16/月、Teamは年払いで$166/月。超過分はクレジット課金。',
    limitation: 'GitHubスター数は売上ではない。有料企業数千社・年商$3M・自社経費は確認できない。',
    metrics: [{ label: 'Plus 年払いの月額換算', value: '$16' }, { label: 'Team 年払いの月額換算', value: '$166' }],
  },
  'Clubhouse (Alpha Exploration)': {
    url: 'https://blog.clubhouse.com/introducing-payments/', period: '2021年 Payments導入時',
    finding: '導入時のPaymentsは送金額の100%をクリエイターへ渡し、送金者の処理手数料はStripeへ支払う。Clubhouseはこの送金から取り分を得ないと説明。',
    limitation: 'この機能の取り分ゼロは会社全体の売上ゼロの証明ではない。旧月商0円と月間赤字4億円は採用しない。',
    metrics: [{ label: 'Payments導入時のクリエイター配分', value: '送金額の100%' }],
  },
  'Quibi': {
    url: 'https://www.sec.gov/Archives/edgar/data/1428439/000142843922000010/roku-20211231.htm', period: '2021-01-08 コンテンツ権利取得（Roku 2021年10-K）',
    finding: 'RokuはQuibiの一部コンテンツ権利を取得し、資産取得として会計処理したと開示している。',
    limitation: '調達額・投資家返金額・資産取得額はQuibiの月間営業損失ではない。旧月商5,000万円・月損失34.2億円・利益率0%を採用しない。',
  },
};

/** Remove unreviewed financial sentences only; new source observations bypass this legacy filter. */
export function omitUnreviewedFinancialClaims<T>(value: T): T {
  if (typeof value === 'string') {
    // Enum identifiers are structural data, not prose (e.g. EVOLVING_BARRIER contains ARR).
    if (/^[A-Z][A-Z0-9_]*$/.test(value)) return value;
    const financial = /[¥￥$%％]|円|ドル|月商|年商|原価|売上|利益|収益|手残り|資金|資本|借金|投資額|決済額|課金額|LTV|CAC|ARR|MRR/i;
    const kept = value.split(/(?<=[。!?！？])|\n/).filter((sentence) => sentence.trim() && !financial.test(sentence));
    return (kept.join(' ').trim() || '金額・費用の裏付けは未確認。') as T;
  }
  if (Array.isArray(value)) return value.map((item) => omitUnreviewedFinancialClaims(item)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, omitUnreviewedFinancialClaims(item)]),
  ) as T;
  return value;
}

export function reconcileFinancialEntity(entity: FinancialEntity): FinancialEntity {
  const source = FINANCIAL_RECONCILIATIONS[entity.name];
  if (!source) return entity;
  // Numeric slots remain for the legacy contract, but no unknown amount is published as a measured zero.
  const pnl: ProfitAndLossStatement = {
    monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0,
    isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true,
    isGrossMarginUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true,
    financialStatus: source.revenueLabel ? 'REPORTED' : 'UNAVAILABLE',
    revenueLabel: source.revenueLabel ?? '売上未確認',
    dataSnapshotPeriod: source.period,
    sourceDoc: source.url,
  };
  return {
    ...entity, pnl, verifiedBadge: false, tagline: source.finding,
    growthRateYoY: 0, isGrowthUnconfirmed: true,
    strategy: omitUnreviewedFinancialClaims(entity.strategy),
    pricing: entity.pricing ? { ...omitUnreviewedFinancialClaims(entity.pricing), estimatedLtvJpy: undefined, churnRate: undefined } : undefined,
    acquisition: undefined,
    meta: omitUnreviewedFinancialClaims(entity.meta),
    exposureAudit: omitUnreviewedFinancialClaims(entity.exposureAudit),
    dynamicMoats: omitUnreviewedFinancialClaims(entity.dynamicMoats),
    timelineEvents: omitUnreviewedFinancialClaims(entity.timelineEvents),
    temporal: omitUnreviewedFinancialClaims(entity.temporal),
    essence: omitUnreviewedFinancialClaims(entity.essence),
    opportunityJudgment: omitUnreviewedFinancialClaims(entity.opportunityJudgment),
    pipelineStack: omitUnreviewedFinancialClaims(entity.pipelineStack),
    targetPainWallet: omitUnreviewedFinancialClaims(entity.targetPainWallet),
    operations: { ...entity.operations, initialCapitalRequired: 0, isCapitalUnconfirmed: true,
      toolStack: entity.operations.toolStack.map((tool) => ({ ...omitUnreviewedFinancialClaims(tool), monthlyCost: 0, isCostUnconfirmed: true })),
    },
    evidenceCards: [{ id: `financial-source-${entity.id}`, type: 'SMOKING_GUN', title: '一次資料で確認できた事実',
      evidenceStatus: 'REPORTED', punchline: source.finding, details: [source.limitation], metrics: source.metrics,
      sourceNote: `${source.period} / 確認日2026-09-11 / ${source.url}` }],
    observationsStream: [{ id: `financial-source-observation-${entity.id}`, category: 'RESEARCH_LIMIT',
      categoryLabel: '財務の出典と適用範囲', text: `${source.finding} ${source.limitation}`,
      originType: 'reported', verificationStatus: 'SUPPORTED', sourceUrl: source.url, observedAt: '2026-09-11' }],
    unknownsNotes: [source.limitation, '旧財務数値と旧Evidenceは元レコードに保全。再照合していない金額を実績として配信しない。'],
  };
}
