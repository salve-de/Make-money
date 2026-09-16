import fs from 'node:fs';
import crypto from 'node:crypto';

const rawAudit = JSON.parse(fs.readFileSync('data/incoming/raw_snapshots_new_cases_20260916.audit.json', 'utf8'));
const rawByName = new Map(rawAudit.results.map((item) => [item.name, item]));
const jpy = (usd) => Math.round(usd * 150);
const idFor = (name, url) => `ent_reddit_${crypto.createHash('sha256').update(`${name}|${url}`).digest('hex').slice(0, 24)}`;
const sourceFor = (name) => {
  const item = rawByName.get(name);
  if (!item) throw new Error(`Missing raw capture for ${name}`);
  return {
    provider: 'Reddit',
    postId: item.requestedUrl.split('/comments/')[1]?.split('/')[0] ?? null,
    postUrl: item.requestedUrl,
    author: item.author,
    observedAt: item.observedAt,
    publishedAt: item.observedAt,
    rawContentSha256: item.sha256,
    rawCaptureNote: 'Reddit direct fetch returned an anti-bot challenge page. Post facts were transcribed from the rendered source page; raw capture is retained for reachability/provenance but is not treated as metric support.',
    rawStorage: null,
    rawMetricSupportAudit: null,
  };
};
const cardBase = (id, type, title, punchline, details, sourceUrl, sourceHash, badge = 'REPORTED') => ({
  id, type, title, badge, evidenceStatus: 'REPORTED', punchline, details,
  codeSnippet: 'N/A — 原文に実装コードの記載なし。', sourceNote: `Reddit post, retrieved 2026-09-16: ${sourceUrl}`,
  sourceUrl, sourceClass: 'PRIMARY', evidenceLocator: { type: 'html', textHash: sourceHash },
});
const common = ({ id, name, tagline, sector, founder, url, source, tags, pnl, evidenceCards, operations, strategy, temporal, essence, lootBlueprint, observations, observationsStream, reportedMetrics, unknownsNotes, profileBusinessLabel }) => ({
  id,
  ticker: name.startsWith('Unlust') ? 'UNLST.APP' : 'RFBW.SAAS',
  name,
  legalEntity: 'UNKNOWN',
  tagline,
  sector,
  scale: 'SOLO',
  founder,
  country: 'GLOBAL',
  url,
  verifiedBadge: false,
  growthRateYoY: 0,
  isGrowthUnconfirmed: true,
  architecturePattern: strategy.architecturePattern,
  pipelineStack: strategy.pipelineStack,
  targetPainWallet: strategy.blindspot,
  tags,
  pnl,
  evidenceCards,
  operations,
  strategy,
  temporal,
  observations,
  observationsStream,
  essence,
  lootBlueprint,
  publishability: 'PARTIAL',
  claimBindings: [],
  unknownsNotes,
  screening: { winner: true, initialTeamPass: true, capitalStatus: 'unknown', qualificationStatus: 'REPORTED_PRIMARY_NOT_INDEPENDENTLY_AUDITED', backgroundAndScaleCaveat: '本人投稿に基づく報告事例。独立した決済・会計監査は未実施。' },
  caseType: 'PRIMARY_REDDIT_FOUNDER_REPORT_CASE',
  profileSubject: founder,
  profileBusinessLabel,
  reportedMetrics,
  officialUrl: null,
  sourceMetadata: source,
  batchId: 'batch-reddit-replacements-20260916',
});

const feedbackName = 'Anonymous Feedback Widget SaaS (Gr00byandahalf)';
const feedbackSource = sourceFor(feedbackName);
const feedbackId = idFor(feedbackName, feedbackSource.postUrl);
const feedback = common({
  id: feedbackId, name: feedbackName,
  tagline: '「顧客の本音が見えない」小規模SaaSの不安を5秒設置の匿名フィードバック欄で突き、月商123万円・月利益102万円を本人報告した後に28.5万ドルで売却した1人運営',
  sector: 'NICHE_SAAS', founder: 'Gr00byandahalf（匿名）', url: feedbackSource.postUrl, source: feedbackSource,
  tags: ['SOLO', 'BOOTSTRAPPED', 'REPORTED_PROFIT', 'FEEDBACK_WIDGET', 'EXIT_REPORTED'],
  pnl: {
    monthlyRevenue: jpy(8200), cogs: 0, grossProfit: jpy(8200), grossMargin: 100,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0, financialStatus: 'REPORTED',
    dataSnapshotPeriod: '2025年8月 Reddit本人投稿（$8,200/月売上、$6,800/月利益の報告）', sourceDoc: feedbackSource.postUrl,
    estimationLogic: '売上$8,200 × 150円＝¥1,230,000。費用$1,400、利益$6,800は本人報告の別指標として保持し、税・未記載費用を含むP&L確定値には結合しない。',
    revenueLabel: '本人投稿: $8,200/月売上。独立監査なし。', isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true,
    isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true,
    grossProfitDerivation: '機械的整合値: monthlyRevenue - cogs。報告された月利益はreportedMetricsに分離し、税・未記載費用を含む営業利益として表示しない。',
  },
  evidenceCards: [
    cardBase(`${feedbackId}_loot`, 'LOOT_BLUEPRINT', '匿名フィードバックを最短導入で売り、低原価のまま出口を作る', '顧客の声を集めたい小規模事業者へ、重い調査基盤ではなく匿名投稿ウィジェットだけを5秒で埋め込ませ、少人数でも継続課金と売却可能性を両立した。', ['インストール障壁を下げ、設置後すぐに回答が届く単一機能へ絞る。', '月額課金を維持しつつ、ホスティング・決済・VA費用を売上と別に記録する。', '顧客数・解約率・費用・売却額を同じログに残し、売上だけの見栄を避ける。'], feedbackSource.postUrl, feedbackSource.rawContentSha256),
    cardBase(`${feedbackId}_crime`, 'THE_CRIME', '月商と手残りを本人の運営ログで同時に示した', '本人報告では月商$8,200、月費用約$1,400、月利益約$6,800。283有料顧客、解約率3%、14か月運営後に$285,000で売却した。', ['費用内訳としてhosting $340、Stripe $250、VA $800が挙げられている。', 'これは匿名投稿の本人報告であり、銀行・決済・税務資料の独立監査ではない。'], feedbackSource.postUrl, feedbackSource.rawContentSha256),
    cardBase(`${feedbackId}_genesis`, 'DIRTY_GENESIS', '小さな課題を単機能SaaSにして14か月で出口へつないだ', '公開投稿で、個人開発・ブートストラップ・Next.js/Postgres/BullMQ/Vercel/Railwayの配管と、顧客数・解約率・売却結果をまとめて報告した。', ['元の事業名は非公開で、匿名フィードバックウィジェットとしてのみ説明されている。', '283人の有料顧客を基盤にし、VAを部分的に使って運用負荷を吸収した。'], feedbackSource.postUrl, feedbackSource.rawContentSha256),
  ],
  operations: { teamSize: 1, initialTeamSize: 1, currentTeamSize: 1, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: ['Reddit / founder-led posting', '既存顧客の口コミ', 'オーガニック配布'], toolStack: [
    { name: 'Next.js', category: 'アプリ', monthlyCost: 0, isCostUnconfirmed: true, purpose: 'フィードバックウィジェットのWebアプリ' },
    { name: 'Postgres', category: 'DB', monthlyCost: 0, isCostUnconfirmed: true, purpose: '顧客・投稿データの保存' },
    { name: 'BullMQ', category: 'ジョブキュー', monthlyCost: 0, isCostUnconfirmed: true, purpose: '非同期処理' },
    { name: 'Vercel', category: 'ホスティング', monthlyCost: jpy(340 / 1), isCostUnconfirmed: true, purpose: '投稿時の費用内訳として本人がhosting $340/月を報告' },
    { name: 'Railway', category: 'インフラ', monthlyCost: 0, isCostUnconfirmed: true, purpose: 'アプリ・DB運用候補として本人が列挙' },
    { name: 'Stripe', category: '決済', monthlyCost: jpy(250 / 1), isCostUnconfirmed: true, purpose: '本人報告の決済費用 $250/月' },
  ], isTeamSizeUnconfirmed: false, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true },
  strategy: { architecturePattern: '匿名投稿ウィジェット特化 × ブートストラップ出口', pipelineStack: 'Next.js × Postgres × BullMQ × Vercel × Railway × Stripe', blindspot: '大手の高機能調査・顧客理解ツールが重すぎる間に、匿名で本音を集めたい小規模事業者の導入直後の痛みを単機能で取る。', moatType: 'COUNTER_POSITIONING', moatDescription: '広い機能表ではなく、導入速度・低い運営複雑性・実績ログの組み合わせで小規模顧客に合わせる。', incumbentDilemma: '大手は調査・分析・権限管理を厚くするほど、5秒で貼りたい顧客向けの価格と操作を維持しにくい。', secretInsight: '匿名性そのものより、回答を集めるまでの設置摩擦を消すことが小規模顧客の決済理由になる。', initialTraction: ['本人投稿で運営数値と配管を公開', '283人の有料顧客まで拡大したと報告', '14か月後に売却'], actionPlaybook: ['顧客が今すぐ貼れる単一ウィジェットに絞る', '投稿・解約・費用を自動記録する', '運用をVAへ切り出し、継続収益と出口条件を同時に作る'], coldOutreachTemplate: '「匿名で本音を集める欄を、今のサイトへ5分以内に設置できます。まず1ページだけ試し、回答数と解約率を一緒に見せてください。」' },
  temporal: { foundedYear: 2024, initialTractionPeriod: '2024–2025年のブートストラップ運営（投稿では14か月運営と報告）', dataSnapshotPeriod: '2025年8月の本人投稿', viabilityStatus: 'UNKNOWN', viabilityLabel: '現在の継続性は未確認', eraContext: '小規模SaaSが既存の開発・決済・ホスティングを組み合わせ、単機能で立ち上げやすい時期。', currentViabilityAnalysis: '単機能ウィジェットは模倣されやすい。匿名性、導入速度、顧客獲得経路、運営コストを同時に検証しないと、売却時の評価や継続性は再現できない。' },
  essence: { whatItDoes: 'Webサイトへ埋め込む匿名フィードバック欄を提供し、投稿・顧客・解約を小さな運営配管で処理する。', targetCustomer: '顧客の本音を低摩擦で集めたい小規模SaaS・サービス事業者。', painRelief: '高価で複雑な調査基盤を導入せず、回答を集め始められる。' },
  lootBlueprint: { blueprintId: `${feedbackId}_blueprint`, targetPrey: '顧客の声を集めたいが大手調査ツールは重い小規模事業者', structuralFlaw: '高機能ツールは権限・分析・設定を増やすほど最初の回答収集までが遅くなる', stealthEntry: '匿名投稿ウィジェットを既存ページへ貼る単一導入で入る', tollGateSetup: '投稿データを蓄積し、月額継続と解約率の改善を同じ画面で見せる', reproducibilityScore: 72, moatDurabilityScore: 38, capitalEfficiencyScore: 90, executionChecklist: ['匿名投稿が届く最小ウィジェットを作る', '導入後の回答数・有料顧客・解約率を記録する', '運用の一部をVAへ切り出し、出口条件を記録する'] },
  observations: ['Reddit本人投稿: ブートストラップした匿名フィードバックウィジェットSaaSを14か月運営後に売却したと報告。', '月商$8,200、月費用約$1,400、月利益約$6,800、283有料顧客、解約率3%を報告。', '投稿に記載された技術: Next.js、Postgres、BullMQ、Vercel、Railway。'],
  observationsStream: [{ id: `${feedbackId}_report`, category: 'FINANCIAL_SIGNAL', originType: 'reported', verificationStatus: 'UNVERIFIED', text: '匿名の創業者投稿が月商・月費用・月利益・顧客数・解約率・売却額を報告している。', sourceUrl: feedbackSource.postUrl, observedAt: '2025-08-11', sourceClass: 'PRIMARY', evidenceLocator: { type: 'html', textHash: feedbackSource.rawContentSha256 } }, { id: `${feedbackId}_limit`, category: 'RESEARCH_LIMIT', originType: 'observed', verificationStatus: 'UNVERIFIED', text: '直接取得したReddit原文はanti-bot challengeで、本文メトリクスのローカル原文支持監査は未成立。', sourceUrl: feedbackSource.postUrl, observedAt: '2026-09-16', sourceClass: 'PRIMARY', evidenceLocator: { type: 'html', textHash: feedbackSource.rawContentSha256 } }],
  reportedMetrics: [
    { original: '$8,200', currency: 'USD', amount: 8200, jpyAmount: jpy(8200), unit: 'MONTHLY_REVENUE', source: 'reddit_post', context: '月商' },
    { original: '$1,400', currency: 'USD', amount: 1400, jpyAmount: jpy(1400), unit: 'MONTHLY_COST', source: 'reddit_post', context: 'hosting $340 + Stripe $250 + VA $800' },
    { original: '$6,800', currency: 'USD', amount: 6800, jpyAmount: jpy(6800), unit: 'MONTHLY_PROFIT', source: 'reddit_post', context: '本人報告の月利益' },
    { original: '283', amount: 283, unit: 'CUSTOMERS', source: 'reddit_post', context: '有料顧客' },
    { original: '3%', amount: 3, unit: 'CHURN_RATE', source: 'reddit_post', context: '解約率' },
    { original: '$285,000', currency: 'USD', amount: 285000, jpyAmount: jpy(285000), unit: 'EXIT_PRICE', source: 'reddit_post', context: '売却額' },
  ],
  unknownsNotes: ['匿名事業名、法人、創業者実名、税・返金・決済口座、完全な費用台帳は未確認。', 'Reddit直接取得はanti-bot challengeであり、ローカルraw本文による数値支持は未成立。', '月利益は本人報告として保持し、P&L営業利益・年間純利益の確定値へ結合していない。'], profileBusinessLabel: '匿名フィードバックウィジェットSaaS',
});

const unlustName = 'Unlust (anonymous solo B2C app)';
const unlustSource = sourceFor(unlustName);
const unlustId = idFor(unlustName, unlustSource.postUrl);
const unlust = common({
  id: unlustId, name: unlustName,
  tagline: '「やめたい習慣を止められない」羞恥と再発の財布を突き、ソロ運営のB2CアプリでTTM売上2.4万ドル・純利益1.1万ドルを本人報告',
  sector: 'LOCAL_SERVICES', founder: 'Kind_Guide_1232（匿名）', url: unlustSource.postUrl, source: unlustSource,
  tags: ['SOLO', 'B2C_APP', 'REPORTED_PROFIT', 'SUBSCRIPTION', 'RECOVERY_LOG'],
  pnl: { monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 }, operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0, financialStatus: 'REPORTED', dataSnapshotPeriod: '2026年5月 Reddit本人投稿（TTM売上・利益と月次推移の報告）', sourceDoc: unlustSource.postUrl, estimationLogic: 'TTM売上$24,000・TTM純利益$11,000は期間合計のreportedMetricsへ分離。月商P&Lへ混在させない。', revenueLabel: '本人投稿: TTM revenue ~$24k。独立監査なし。', isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true, grossProfitDerivation: 'TTM値と月次値を混在させないため、月商P&Lは0の未確認値を保持し、報告額はreportedMetricsへ分離。' },
  evidenceCards: [
    cardBase(`${unlustId}_loot`, 'LOOT_BLUEPRINT', '羞恥の強い習慣改善を年払い・再起動導線で継続課金へ変える', '人に相談しにくい習慣の改善を、匿名で始められるアプリとサブスク、失速後に戻れる再起動導線で支え、広告だけに依存せず配布する。', ['初回の恥ずかしさを匿名UXで下げ、ユーザーが今日の状態を記録できるようにする。', '年払い・月払いの継続課金と、ストア手数料控除後の利益を分離して追う。', 'ランキング・流入の急落を月次で検知し、再訪・継続の導線を修正する。'], unlustSource.postUrl, unlustSource.rawContentSha256),
    cardBase(`${unlustId}_crime`, 'THE_CRIME', '小規模B2Cでも売上・純利益・継続ユーザーを同時に公開した', '本人報告ではTTM売上約$24,000、TTM純利益約$11,000（約70% margin after Apple/Google cut）、746 active subscribers、5万人超の利用者。', ['2025年10月の$2,500から2026年1月$625へ75%落ち、その後2026年4月$3,100まで回復したと報告。', '匿名投稿の本人報告であり、ストア管理画面・銀行・税務資料の独立監査ではない。'], unlustSource.postUrl, unlustSource.rawContentSha256),
    cardBase(`${unlustId}_genesis`, 'DIRTY_GENESIS', '一度の急落を隠さず、再成長までのB2C運営ログにした', 'アプリ名をUnlustと明かし、12か月の売上・利益・購読者数・利用者数と、75%急落からの回復を同じ投稿で記録した。', ['ソロ創業者が運営し、Apple/Googleのストア手数料控除後の利益率を報告。', '現在の流入源・広告費・解約率・機能別原価は未確認。'], unlustSource.postUrl, unlustSource.rawContentSha256),
  ],
  operations: { teamSize: 1, initialTeamSize: 1, currentTeamSize: 1, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: ['Apple App Store', 'Google Play', 'オーガニック／コミュニティ配布'], toolStack: [{ name: 'Apple App Store', category: '配信・決済', monthlyCost: 0, isCostUnconfirmed: true, purpose: 'iOSアプリ配信と決済手数料控除' }, { name: 'Google Play', category: '配信・決済', monthlyCost: 0, isCostUnconfirmed: true, purpose: 'Androidアプリ配信と決済手数料控除' }], isTeamSizeUnconfirmed: false, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true },
  strategy: { architecturePattern: '匿名B2Cサブスク × ストア配信 × 回復運用', pipelineStack: 'iOS/Androidアプリ × Apple App Store × Google Play', blindspot: '羞恥が強く対面サービスを避けるユーザーの継続課金を、匿名性と日次の再起動体験で取る。', moatType: 'PROCESS_POWER', moatDescription: '特定カテゴリのユーザー状態・再発・離脱を学習し、失速時に戻す運用プロセスが蓄積する。', incumbentDilemma: '大手の汎用ウェルネスアプリはセンシティブな単一課題に深く寄り添う文脈を取りにくい。', secretInsight: 'B2Cサブスクの敵は初回購入ではなく、急落後にユーザーが戻れる理由を失うこと。', initialTraction: ['匿名で始められるアプリを配信', '746 active subscribersと5万人超ユーザーを報告', '75%の月次急落後に再成長を報告'], actionPlaybook: ['人に言いにくい課題を匿名UXへ落とす', 'ストア手数料後の利益と購読者を毎月追う', '流入急落時に再起動導線と配布を修正する'], coldOutreachTemplate: '「人に相談しづらい習慣を、名前を出さずに今日から記録できます。7日だけ試して、続けられた日数を確認してください。」' },
  temporal: { foundedYear: 2025, initialTractionPeriod: '2025–2026年の12か月運営報告', dataSnapshotPeriod: '2026年5月の本人投稿（TTM・月次推移）', viabilityStatus: 'UNKNOWN', viabilityLabel: '現在の継続性は未確認', eraContext: 'モバイルサブスクのストア配信が成熟し、個人でも配布できる一方、ランキングとストア手数料が売上を急変させる時期。', currentViabilityAnalysis: '利益率は本人報告に依存し、ストア手数料後の税・広告・サポート費は未確認。再現にはカテゴリの信頼形成と急落時の再訪導線の検証が必要。' },
  essence: { whatItDoes: '人に相談しにくい習慣改善を匿名のモバイルサブスクで支援し、ユーザーの継続・離脱・回復を運用する。', targetCustomer: '羞恥や再発不安を抱え、対面相談より匿名アプリを選ぶユーザー。', painRelief: '相談の恥ずかしさを下げ、再発しても再開できる行動導線を提供する。' },
  lootBlueprint: { blueprintId: `${unlustId}_blueprint`, targetPrey: '人に相談しにくい習慣を匿名で改善したいB2Cユーザー', structuralFlaw: '汎用ウェルネス商品は単一の羞恥・再発文脈に深く対応しにくい', stealthEntry: '匿名開始と日次チェックを単一カテゴリへ絞ってストア配信する', tollGateSetup: 'サブスク手数料控除後の継続利用をストアランキングと再起動導線で維持する', reproducibilityScore: 54, moatDurabilityScore: 42, capitalEfficiencyScore: 78, executionChecklist: ['匿名で始められる単一カテゴリ体験を作る', 'ストア手数料後の売上・利益・購読者を記録する', '急落後に戻る導線を検証し、配布チャネルを修正する'] },
  observations: ['Reddit本人投稿: Unlustをソロ運営し、TTM売上約$24k、TTM純利益約$11kを報告。', '746 active subscribers、5万人超ユーザー、約70% margin after Apple/Google cutを報告。', '2025年10月$2.5k、2026年1月$625、2026年4月$3.1kという月次推移と急落後の回復を報告。'],
  observationsStream: [{ id: `${unlustId}_report`, category: 'FINANCIAL_SIGNAL', originType: 'reported', verificationStatus: 'UNVERIFIED', text: '匿名のソロ創業者投稿がTTM売上・純利益・購読者・ユーザー数・月次推移を報告している。', sourceUrl: unlustSource.postUrl, observedAt: '2026-05-01', sourceClass: 'PRIMARY', evidenceLocator: { type: 'html', textHash: unlustSource.rawContentSha256 } }, { id: `${unlustId}_limit`, category: 'RESEARCH_LIMIT', originType: 'observed', verificationStatus: 'UNVERIFIED', text: '直接取得したReddit原文はanti-bot challengeで、本文メトリクスのローカル原文支持監査は未成立。', sourceUrl: unlustSource.postUrl, observedAt: '2026-09-16', sourceClass: 'PRIMARY', evidenceLocator: { type: 'html', textHash: unlustSource.rawContentSha256 } }],
  reportedMetrics: [
    { original: '$24,000', currency: 'USD', amount: 24000, jpyAmount: jpy(24000), unit: 'TOTAL_OR_BEST_PERIOD', source: 'reddit_post', context: 'TTM revenue' },
    { original: '$11,000', currency: 'USD', amount: 11000, jpyAmount: jpy(11000), unit: 'TOTAL_OR_BEST_PERIOD', source: 'reddit_post', context: 'TTM net profit' },
    { original: '$2,500', currency: 'USD', amount: 2500, jpyAmount: jpy(2500), unit: 'MONTHLY_REVENUE', source: 'reddit_post', context: '2025年10月' },
    { original: '$625', currency: 'USD', amount: 625, jpyAmount: jpy(625), unit: 'MONTHLY_REVENUE', source: 'reddit_post', context: '2026年1月' },
    { original: '$3,100', currency: 'USD', amount: 3100, jpyAmount: jpy(3100), unit: 'MONTHLY_REVENUE', source: 'reddit_post', context: '2026年4月' },
    { original: '70%', amount: 70, unit: 'MARGIN', source: 'reddit_post', context: 'Apple/Google cut後' },
    { original: '746', amount: 746, unit: 'SUBSCRIBERS', source: 'reddit_post', context: 'active subscribers' },
    { original: '50,000+', amount: 50000, unit: 'USERS', source: 'reddit_post', context: 'users' },
  ],
  unknownsNotes: ['創業者実名、法人、広告費、解約率、サポート費、税、ストア管理画面は未確認。', 'Reddit直接取得はanti-bot challengeであり、ローカルraw本文による数値支持は未成立。', 'TTM値と月次値を混在させず、月商P&Lは未確認0で保持。'], profileBusinessLabel: 'Unlust 匿名B2Cアプリ',
});

for (const entity of [feedback, unlust]) {
  if (entity.id !== idFor(entity.name, entity.url)) throw new Error(`ID mismatch for ${entity.name}`);
  if (entity.pnl.financialStatus !== 'REPORTED') throw new Error(`Expected REPORTED for ${entity.name}`);
  if (!entity.pnl.isRevenueUnconfirmed || !entity.pnl.isMarginUnconfirmed) throw new Error(`Missing uncertainty flags for ${entity.name}`);
}
fs.writeFileSync('data/incoming/batch_new_reddit_replacements_20260916.json', `${JSON.stringify([feedback, unlust], null, 2)}\n`);
console.log(JSON.stringify({ count: 2, names: [feedback.name, unlust.name], ids: [feedback.id, unlust.id], rawHashes: [feedbackSource.rawContentSha256, unlustSource.rawContentSha256] }, null, 2));
