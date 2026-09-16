import fs from 'node:fs';

const capture = JSON.parse(fs.readFileSync('data/incoming/raw_snapshots_fearless_business_20260916.audit.json', 'utf8')).results[0];
const name = 'Fearless Business (Robin Waite)';
const sourceUrl = capture.requestedUrl;
const id = capture.entityId;
const jpy = (usd) => Math.round(usd * 150);
const sourceNote = `Founder Reports, retrieved 2026-09-16: ${sourceUrl}`;
const locator = { type: 'html', textHash: capture.sha256 };
const reported = (original, amount, unit, context, currency = null) => ({
  original,
  ...(currency ? { currency, amount, ...(currency === 'USD' ? { jpyAmount: jpy(amount) } : {}) } : { amount }),
  unit,
  source: 'founderreports_interview',
  context,
});

const entity = {
  id,
  ticker: 'FEARLESS',
  name,
  legalEntity: 'UNKNOWN',
  tagline: 'コーチ・コンサルの「時間売りで稼げない」財布を、書籍・講演・高単価の定額プログラムへ移し、FY2023/24月商平均$25,000・予測純利益約$125,000を報告',
  sector: 'LOCAL_SERVICES',
  scale: 'SMALL_TEAM',
  founder: 'Robin Waite',
  country: 'GB',
  url: 'https://www.robinwaite.com/',
  verifiedBadge: false,
  growthRateYoY: 0,
  isGrowthUnconfirmed: true,
  architecturePattern: '専門家の知名度 × 書籍・講演による先行価値提供 × 高単価グループコーチング',
  pipelineStack: 'UNKNOWN — 記事本文に実装技術・決済基盤の詳細なし',
  targetPainWallet: 'コーチ、コンサル、フリーランサーが時間単価・日当の上限に閉じ込められる痛みを、成果ベースのパッケージと高単価プログラムで解く。',
  tags: ['SMALL_TEAM', 'COACHING', 'PRODUCTIZED_SERVICE', 'CONTENT_LED_ACQUISITION', 'REPORTED_PROFIT', '2024'],
  pnl: {
    monthlyRevenue: jpy(25000),
    cogs: 0,
    grossProfit: jpy(25000),
    grossMargin: 100,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0,
    operatingMargin: 0,
    estimatedAnnualNetProfit: 0,
    financialStatus: 'REPORTED',
    dataSnapshotPeriod: 'FY2023/24の本人インタビュー記載（予測値と実績の区分を保持）',
    sourceDoc: sourceUrl,
    sourceClass: 'PRIMARY_AUTHOR_INTERVIEW',
    evidenceLocator: locator,
    estimationLogic: '本文がUSD換算で示すFY2023/24月商平均$25,000を150円で掛けて月次売上欄へ機械的に置いた。予測年商$250,000と予測純利益約$125,000はreportedMetricsへ分離し、原価・税・創業者報酬・実現利益はP&Lへ推定していない。',
    revenueLabel: '本人インタビュー: FY2023/24の月商平均£20,000 / $25,000（監査なし）',
    isRevenueUnconfirmed: true,
    isOperatingProfitUnconfirmed: true,
    isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true,
    isGrossMarginUnconfirmed: true,
    isCogsUnconfirmed: true,
    isCostsUnconfirmed: true,
    isNetProfitUnconfirmed: true,
    grossProfitDerivation: 'monthlyRevenue - cogsの機械的整合値。実際の原価・外注費・税・利益は未確認であり、grossMargin 100は実績利益率ではない。',
  },
  evidenceCards: [
    {
      id: `${id}_loot`, type: 'LOOT_BLUEPRINT', title: '時間売りを成果パッケージへ変え、高単価の関所を置く', badge: 'REPORTED', evidenceStatus: 'REPORTED',
      punchline: '時間・日当課金に悩む専門家を対象に、書籍と無料接点で信頼を先に配り、£4,500のグループプログラムと£12,000開始の1対1へ送る。',
      details: ['Fearless Business Acceleratorは£4,500で生涯アクセス付きと本文に記載。', '1対1は代理店規模（2人以上）の事業者向けで、£12,000から・年間5-6件程度と報告。', 'ロゴ制作を5-18倍の価格で商品化した経験を、コーチングのオファー設計へ転用したと説明。'],
      codeSnippet: 'N/A — 原文に実装コードの記載なし。', sourceNote, sourceUrl, sourceClass: 'PRIMARY_AUTHOR_INTERVIEW', evidenceLocator: locator,
    },
    {
      id: `${id}_crime`, type: 'THE_CRIME', title: '顧客数を追わず、前払い高単価と権威で単価上限を外す', badge: 'REPORTED', evidenceStatus: 'REPORTED',
      punchline: '価格を時間ではなく成果へ結び付け、書籍・講演・ポッドキャストで見込み客の不安を先に下げてから高単価商品へ接続する。',
      details: ['ポッドキャスト出演1回から60日で1,300 leads、約£135,000の新規ビジネスにつながったと報告。', '2冊目の書籍は印刷・出版費を下げ、年2,500-3,000冊を配るマーケティング資産として利用。', '売上・利益・リードの因果は本人報告であり、CRMや銀行記録による独立監査は未実施。'],
      codeSnippet: 'N/A — 原文に実装コードの記載なし。', sourceNote, sourceUrl, sourceClass: 'PRIMARY_AUTHOR_INTERVIEW', evidenceLocator: locator,
    },
    {
      id: `${id}_genesis`, type: 'DIRTY_GENESIS', title: '代理店を売却した後、既存の専門家ネットワークから立ち上げる', badge: 'REPORTED', evidenceStatus: 'REPORTED',
      punchline: '2004-2016年のマーケティング代理店を退出し、元顧客・フリーランサー・代理店からの相談を起点に2016年へ移行した。',
      details: ['3年間のearn-outが次の事業を考える時間を与えたと本人が説明。', '最初のイベントはスポンサー5社が各£500を支払い、£3,000超の費用の大部分をカバーした。', 'イベントには200人が参加し、初期版グループプログラムへ複数人を登録したと報告。'],
      codeSnippet: 'N/A — 原文に実装コードの記載なし。', sourceNote, sourceUrl, sourceClass: 'PRIMARY_AUTHOR_INTERVIEW', evidenceLocator: locator,
    },
    {
      id: `${id}_acquisition`, type: 'CUSTOMER_ACQUISITION', title: '無料の本・講演・ポッドキャストを高単価相談の入口にする', badge: 'REPORTED', evidenceStatus: 'REPORTED',
      punchline: 'Google検索、2,300本のブログ記事、書籍、講演、ポッドキャストを組み合わせ、営業電話の前に専門家としての信用を積む。',
      details: ['サイトは月19,000 unique visitors、Google organicが主流と記載。', '最初の1年に125 consultations、57 events、12 networking events、44 clients enrollmentと報告。', 'Ali Abdaalの番組出演後に15-18件/週の営業相談となり、時間保護のためグループ導入を試したと記載。'],
      codeSnippet: 'N/A — 原文に実装コードの記載なし。', sourceNote, sourceUrl, sourceClass: 'PRIMARY_AUTHOR_INTERVIEW', evidenceLocator: locator,
    },
  ],
  operations: {
    teamSize: 5, initialTeamSize: 1, currentTeamSize: 5, teamSizeReported: '創業者、associate coach 3人、フィリピンのfull-time VA 1人', weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0,
    primaryChannels: ['Google organic search', '書籍の無償配布', '講演・ネットワーキング', 'ポッドキャスト出演', '既存専門家ネットワーク'],
    toolStack: [],
    isTeamSizeUnconfirmed: false, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true,
  },
  strategy: {
    architecturePattern: 'パーソナルブランドを無料コンテンツで先に配り、成果ベースの高単価コーチングへ転換',
    pipelineStack: 'UNKNOWN — 技術スタックは本文に記載なし',
    blindspot: '専門家の多くが時間売りとSNS量産に寄る中、書籍・長文検索・出演を信頼の前払い資産として蓄積し、相談前に価格への抵抗を下げる。',
    moatType: 'PERSONAL_BRAND_AND_CONTENT',
    moatDescription: '2,300本のブログ記事、出版書籍、講演実績、専門家ネットワークの累積信用。ただし現在の検索順位・継続性は別途確認が必要。',
    incumbentDilemma: '大規模な教育事業者は個別の専門家の物語・地域ネットワーク・創業者本人の信用を同じ密度で複製しにくい。これは記事からの構造推論であり、競合比較の独立調査ではない。',
    secretInsight: '「無料で価値を配る」だけで終わらせず、成果に紐付けた価格・生涯アクセス・少数の1対1枠を関所にして、時間単価の上限から顧客を切り離す。',
    initialTraction: ['2016年に代理店退出後に開始', '最初の1年に125 consultations、57 events、44 clients enrollmentを報告', 'ポッドキャスト1出演から1,300 leadsと約£135,000の新規ビジネスを報告'],
    actionPlaybook: ['対象専門家が抱える時間売りの上限を特定する', '書籍・長文・講演で相談前の信用を前払いする', '成果パッケージと少数の高単価枠へ価格を移す', 'リード急増時はグループ導線で創業者時間を守る'],
    coldOutreachTemplate: '「時間ではなく成果単位で価格を組み替え、今の顧客数を増やさずに単価上限を外せるか、現在のオファーを一緒に分解します。」',
  },
  temporal: {
    foundedYear: 2016,
    initialTractionPeriod: '2016年開始。最初の1年の相談・イベント・登録数を本人が報告。',
    dataSnapshotPeriod: 'FY2023/24の本人インタビュー。取得は2026-09-16。',
    viabilityStatus: 'ACTIVE_PLAYBOOK',
    viabilityLabel: '専門家の高単価商品化に有効候補。ただし数値の現在性は未更新。',
    eraContext: '検索・書籍・ポッドキャストで専門家の信用を積み、オンラインのグループ提供へ送るモデル。AI生成コンテンツの増加で、本人の固有経験と配信権威の差別化がより重要になる可能性がある。',
    currentViabilityAnalysis: 'モデル自体は再現候補だが、検索流入の変動、ポッドキャスト出演への依存、創業者本人の提供能力、記事の数値が2023/24中心である点を検証すべき。2026年の実績・費用・継続率は未確認。',
  },
  essence: { whatItDoes: 'コーチ、コンサル、フリーランサー向けに、時間・日当課金から商品化されたオファーと高単価コーチングへ移行させる。', targetCustomer: '価格を時間に結び付けてしまい、少ない顧客数でも利益を残したい専門家。', painRelief: '成果ベースのパッケージ、グループ支援、1対1支援で、顧客数を無制限に増やさず単価と提供価値を上げる。' },
  lootBlueprint: {
    blueprintId: `${id}_blueprint`, targetPrey: '時間単価の上限と顧客獲得不安を抱えるコーチ・コンサル・フリーランサー', structuralFlaw: '専門家は成果を売らず、投入時間と低価格競争へ自分を閉じ込める', stealthEntry: '書籍、講演、ポッドキャスト、検索記事で信用を先に渡し、営業前に不安と価格抵抗を下げる', tollGateSetup: '無料の権威形成→高単価の成果パッケージ→グループ提供→少数の1対1枠', reproducibilityScore: 72, moatDurabilityScore: 60, capitalEfficiencyScore: 78,
    executionChecklist: ['顧客が時間ではなく成果に支払う切実な場面を定義する', '長寿命の書籍・検索記事・出演を相談前の信用資産にする', 'グループ商品と少数の高単価個別枠を分ける', 'リード急増時の創業者時間制約を先に設計する'],
  },
  observations: ['Robin Waite本人のFounder Reportsインタビューに基づく。', 'FY2023/24の月商平均£20,000/$25,000、当年予測年商$250,000、予測純利益約$125,000を記載。', '創業者、associate coach 3人、full-time VA 1人の小規模運営を記載。', '書籍・講演・ポッドキャスト・Google organic searchを組み合わせた獲得経路を記載。'],
  observationsStream: [
    { id: `${id}_finance`, category: 'FINANCIAL_SIGNAL', originType: 'reported', verificationStatus: 'SUPPORTED', text: 'Founder Reports本文がFY2023/24月商平均£20,000/$25,000、予測年商$250,000、予測純利益約$125,000を記載している。', sourceUrl, observedAt: '2026-09-16', sourceClass: 'PRIMARY_AUTHOR_INTERVIEW', evidenceLocator: locator },
    { id: `${id}_team`, category: 'TEAM_SCALE', originType: 'reported', verificationStatus: 'SUPPORTED', text: '本文が3 associate coachesと1 full-time VA、創業者本人の小規模チームを記載している。', sourceUrl, observedAt: '2026-09-16', sourceClass: 'PRIMARY_AUTHOR_INTERVIEW', evidenceLocator: locator },
    { id: `${id}_acquisition`, category: 'CUSTOMER_ACQUISITION', originType: 'reported', verificationStatus: 'SUPPORTED', text: '本文が書籍、講演、ネットワーキング、ポッドキャスト出演、Google organic searchによる獲得を記載している。', sourceUrl, observedAt: '2026-09-16', sourceClass: 'PRIMARY_AUTHOR_INTERVIEW', evidenceLocator: locator },
    { id: `${id}_audit_limit`, category: 'RESEARCH_LIMIT', originType: 'observed', verificationStatus: 'UNVERIFIED', text: '利益は本人インタビューの報告値であり、銀行・決済・税務資料による独立監査は未実施。2026年の現在値も未確認。', sourceUrl, observedAt: '2026-09-16', sourceClass: 'PRIMARY_AUTHOR_INTERVIEW', evidenceLocator: locator },
  ],
  essenceNotes: 'UNKNOWN',
  reportedMetrics: [
    reported('£20,000 monthly revenue', 20000, 'MONTHLY_REVENUE', 'FY2023/24 average monthly revenue', 'GBP'),
    reported('$25,000 monthly revenue', 25000, 'MONTHLY_REVENUE', 'FY2023/24 USD equivalent average monthly revenue', 'USD'),
    reported('$250,000 projected revenue', 250000, 'ANNUAL_REVENUE', 'forecast for the current year', 'USD'),
    reported('$125,000 approximate net profit', 125000, 'ANNUAL_PROFIT', 'forecast for the current year; approximate and not independently audited', 'USD'),
    reported('£4,500', 4500, 'PROGRAM_PRICE', 'Fearless Business Accelerator current investment', 'GBP'),
    reported('£12,000', 12000, 'PROGRAM_PRICE', '1-to-1 coaching starting price', 'GBP'),
    reported('1,300 leads', 1300, 'LEADS', '60 days after a podcast interview'),
    reported('£135,000 new business', 135000, 'NEW_BUSINESS_VALUE', 'approximately attributed to the podcast interview', 'GBP'),
    reported('19,000 unique visitors/month', 19000, 'MONTHLY_VISITORS', 'current website average in the interview'),
    reported('2,300 articles', 2300, 'CONTENT_ASSET_COUNT', 'blog article count'),
  ],
  unknownsNotes: ['FY2023/24の月商は本人報告であり、予測年商・予測純利益と実績を混同しない。', '原価、外注費、広告費、税、創業者報酬、継続率、銀行・決済証憑は未確認。', '2026年現在の売上・利益・検索順位・顧客数は未更新。', '£と$の併記は本文の換算表示を保持し、別途の為替推定は行っていない。'],
  unknowns: ['財務数値は本人インタビュー報告値で独立監査なし。', '2026年の現在値と詳細費用は未確認。'],
  publishability: 'PARTIAL',
  claimBindings: [],
  screening: { winner: true, initialTeamPass: true, capitalStatus: 'reported_low', qualificationStatus: 'PRIMARY_AUTHOR_REPORTED_PROFIT_NOT_INDEPENDENTLY_AUDITED', backgroundAndScaleCaveat: 'FY2023/24と予測値を含む本人報告。チーム規模は明記されるが、利益・費用の独立監査は未実施。' },
  caseType: 'PRIMARY_AUTHOR_INTERVIEW_PROFIT_CASE',
  profileSubject: 'Robin Waite',
  profileBusinessLabel: 'Fearless Business',
  officialUrl: 'https://www.robinwaite.com/',
  sourceMetadata: {
    provider: 'Founder Reports', sourceId: capture.sourceId, postUrl: sourceUrl, author: 'Robin Waite', observedAt: '2026-09-16T00:00:00.000Z', publishedAt: null, rawContentSha256: capture.sha256,
    rawCaptureNote: 'Founder interview raw HTML is retained. Financial values are reported by the interviewee and are not treated as independently audited.',
    rawStorage: { bucket: 'foundation-raw', payloadKey: null, manifestKey: null, bytes: capture.bytes, readbackVerified: false },
  },
  batchId: 'batch-fearless-business-20260916',
};

delete entity.essenceNotes;
fs.writeFileSync('data/incoming/batch_fearless_business_20260916.json', `${JSON.stringify([entity], null, 2)}\n`);
console.log(JSON.stringify({ count: 1, id, name, ticker: entity.ticker, scale: entity.scale, sourceUrl }, null, 2));
