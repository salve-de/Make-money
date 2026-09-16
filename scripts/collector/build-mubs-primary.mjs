import fs from 'node:fs';
import crypto from 'node:crypto';

const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_primary_mubs_1_20260916.json';
const source = 'https://www.indiehackers.com/post/starting-up/making-10k-mo-as-a-full-time-founder-after-building-120-side-hustles-FXnE02qqeOq385VtMxmq';
const officialUrl = 'https://mubs.inc/';
const observedAt = '2024-07-31';
const sourceClass = 'PRIMARY_AUTHOR_INTERVIEW';
const hash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 12);
const id = 'ent_mubs_2024_9f4c2e0a1b7d';
const revenueJpy = 1_500_000;

const cards = [
  { id: `${id}-finance`, type: 'SMOKING_GUN', title: '創業者インタビューの収益記載', badge: '本人発言', evidenceStatus: 'REPORTED', punchline: 'Indie Hackersのインタビューは、Mubashar Iqbalのプロダクトスタジオが月10,000 USDを生むと記載する。利益・原価・税・手残りは別途未確認。', details: ['2024-07-31公開のインタビューに月10,000 USDの収益記載。', 'この値は本人紹介を含むインタビューの報告値であり、財務諸表や決済口座の独立監査ではない。'], sourceNote: source, sourceUrl: source, sourceClass, evidenceLocator: { type: 'html', sourceUrl: source }, metrics: [{ label: '報告月商', value: '1,500,000円（10,000 USD × 150円）', isHighlight: true }, { label: '利益', value: '未確認' }] },
  { id: `${id}-mechanism`, type: 'DIRTY_GENESIS', title: '複数プロダクトを回す収益配管', badge: '初動・配管', evidenceStatus: 'REPORTED', punchline: '120件超の制作と85回のProduct Huntローンチを背景に、プロダクト収益だけでなく月10,000 USDのサービス収入を運転資金にしている。', details: ['自分の課題を起点に小さく作り、反応を見て継続する方針。', 'サービス収入を生活費の土台に置きながら、自社プロダクトを並行して開発。'], sourceNote: source, sourceUrl: source, sourceClass, evidenceLocator: { type: 'html', sourceUrl: source } },
  { id: `${id}-official`, type: 'SOURCE_CHECK', title: '公式サイトの事業同一性確認', badge: '公式確認', evidenceStatus: 'REPORTED', punchline: 'Mubs公式サイトは、Mubashar Iqbalが運営するデジタルプロダクトスタジオで、AI・Web3・ブロックチェーン分野に取り組むと説明している。', details: ['公式サイト取得日: 2026-09-16。', '公式サイトは事業内容の確認であり、月商・利益の証明ではない。'], sourceNote: officialUrl, sourceUrl: officialUrl, sourceClass: 'PRIMARY_OFFICIAL_SITE', evidenceLocator: { type: 'html', sourceUrl: officialUrl } },
  { id: `${id}-boundary`, type: 'THE_CRIME', title: '売上・利益・手残りを分離', badge: '未確認境界', evidenceStatus: 'REPORTED', punchline: '公開インタビューの月商を利益や個人の手残りへ拡張しない。', details: ['原価、広告費、外注費、税、営業利益、純利益、継続性は未確認。'], sourceNote: source, sourceUrl: source, sourceClass, evidenceLocator: { type: 'html', sourceUrl: source } },
];

const entity = {
  id, ticker: 'MUBS', name: 'Mubs', legalEntity: 'UNKNOWN', tagline: '複数の小さなプロダクトを85回以上ローンチし、サービス収入で月10,000 USDを確保する一人開発スタジオ。',
  sector: 'AI_AUTOMATION', scale: 'SOLO', founder: 'Mubashar Iqbal', country: 'US', url: officialUrl, verifiedBadge: false, growthRateYoY: 0, isGrowthUnconfirmed: true,
  architecturePattern: '複数プロダクトの小規模検証とサービス収入の併用', pipelineStack: 'Product Hunt / I Worked On / Mubs Inc', targetPainWallet: '新規プロダクトの検証と、制作活動を継続するための生活費確保。',
  tags: ['PRIMARY_AUTHOR_INTERVIEW', 'REPORTED_REVENUE', 'PROFIT_UNCONFIRMED'],
  pnl: { monthlyRevenue: revenueJpy, cogs: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 }, operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0, financialStatus: 'REPORTED', dataSnapshotPeriod: `2026-09-16（記事観測日 ${observedAt}）`, sourceDoc: source, sourceClass, evidenceLocator: { type: 'html', sourceUrl: source }, estimationLogic: 'インタビュー記載の月10,000 USDを150円/USDで換算。利益・原価は未確認のためP&Lへ推定投入しない。', revenueLabel: '本人インタビュー記載: 月10,000 USD（利益・原価は未確認）', isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true, reportedMonthlyRevenueSignal: { amount: 10000, currency: 'USD', jpyAmount: revenueJpy, period: 'month', source, verification: 'REPORTED_PRIMARY_INTERVIEW' } },
  evidenceCards: cards,
  operations: { teamSize: 1, initialTeamSize: 1, currentTeamSize: 1, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: ['Product Hunt', 'I Worked On', 'Mubs Inc'], toolStack: [{ name: 'Product Hunt', category: 'distribution', monthlyCost: 0, isCostUnconfirmed: true, purpose: '記事本文で言及されたローンチ経路' }], isTeamSizeUnconfirmed: false, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true },
  strategy: { blindspot: '大規模な一製品勝負ではなく、複数の小さな製品を高速に試す余地。', moatType: 'DISTRIBUTION', moatDescription: '制作数とローンチ履歴を蓄積し、サービス収入で次の検証を継続する。', incumbentDilemma: '大企業が採算を取りにくい小規模ニーズを短いサイクルで試す。', secretInsight: 'サービス収入を生活費の土台にし、プロダクトの検証時間を買う。', initialTraction: ['Product Hunt', 'I Worked On', '自分の課題'], actionPlaybook: ['自分の課題を小さく製品化する。', 'ローンチごとに需要を観測する。', 'サービス収入と製品収入を別々に記録する。'], coldOutreachTemplate: '小さな製品を複数検証する運用と、サービス収入の内訳を確認したい。' },
  temporal: { foundedYear: 0, initialTractionPeriod: `記事観測日 ${observedAt}。創業年は未確認。`, dataSnapshotPeriod: `2026-09-16 ${source}`, viabilityStatus: 'ACTIVE_PLAYBOOK', viabilityLabel: '2024年インタビューで稼働中の報告。2026年の継続は公式サイト以外未確認。', eraContext: '2024年のプロダクト開発者コミュニティとProduct Huntを利用した小規模ローンチ環境。', currentViabilityAnalysis: '複数の小規模製品を短周期で検証する運用は再現可能性があるが、現在の収益継続と各製品の採算は未確認。' },
  observations: [`創業者インタビュー: ${source}`, '月10,000 USDの収益報告。', '120件超の制作、85回のProduct Huntローンチを本人紹介として記録。', '公式サイトはMubashar Iqbal運営のデジタルプロダクトスタジオと説明。', '利益・原価・税・手残りは未確認。'],
  observationsStream: [{ id: `${id}-reported`, category: 'REVENUE_PROOF', originType: 'reported', verificationStatus: 'SUPPORTED', text: 'インタビューに月10,000 USDの収益記載。', sourceUrl: source, observedAt, sourceClass, evidenceLocator: { type: 'html', sourceUrl: source } }, { id: `${id}-official`, category: 'IDENTITY_CHECK', originType: 'observed', verificationStatus: 'SUPPORTED', text: '公式サイトはMubashar Iqbal運営のデジタルプロダクトスタジオと説明。', sourceUrl: officialUrl, observedAt: '2026-09-16', sourceClass: 'PRIMARY_OFFICIAL_SITE', evidenceLocator: { type: 'html', sourceUrl: officialUrl } }],
  essence: { whatItDoes: '複数の小さなデジタルプロダクトを作り、サービス収入と製品収入を組み合わせて開発を継続する。', targetCustomer: '小規模な課題解決ツールを必要とする利用者と、制作を外注する顧客。', painRelief: '大きな資本調達を待たずに課題を製品化し、制作活動を続ける収入を確保する。' },
  lootBlueprint: { blueprintId: `${id}-loot`, targetPrey: '小規模な課題をすぐ解決したい利用者と、制作を急ぐ顧客。', structuralFlaw: '大企業が小規模案件ごとの採算を取りにくいこと。', stealthEntry: '自分の課題を小さく作り、Product Huntと制作ポートフォリオで反応を集める。', tollGateSetup: 'サービス収入で生活費を確保し、ローンチ履歴を信用に変えて次の製品へ送客する。', reproducibilityScore: 0, moatDurabilityScore: 0, capitalEfficiencyScore: 0, executionChecklist: ['自分の課題を小さく製品化する。', 'ローンチ経路で反応を測る。', 'サービス収入・製品収入・原価を分離して記録する。'] },
  publishability: 'PARTIAL', claimBindings: [], unknownsNotes: ['利益・原価・税・手残りは独立確認していない。', '本人インタビューの収益値は財務諸表の監査ではない。'], screening: { winner: null, initialTeamPass: true, capitalStatus: 'unknown', qualificationStatus: 'REQUIRES_FINANCIAL_RECONCILIATION', backgroundAndScaleCaveat: '本人インタビューと公式サイトに基づく候補。' }, caseType: 'PRIMARY_INDIE_INTERVIEW_CASE', profileSubject: 'Mubashar Iqbal', profileBusinessLabel: 'Mubs', reportedMetrics: [{ original: 10000, currency: 'USD', amount: 10000, jpyAmount: revenueJpy, unit: 'MONTHLY_REVENUE', source, context: '月10,000 USDの収益報告' }], officialUrl, sourceMetadata: { provider: 'Indie Hackers', postUrl: source, observedAt, rawContentSha256: hash }, batchId: 'batch-primary-mubs-1-20260916'
};

fs.writeFileSync(outputPath, `${JSON.stringify([entity], null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: 1, name: entity.name }, null, 2));
