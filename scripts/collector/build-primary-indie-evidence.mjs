import fs from 'node:fs';
import crypto from 'node:crypto';

const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_primary_indie_evidence_3_20260916.json';
const snapshot = '2026-09-16';
const sourceClass = 'PRIMARY_AUTHOR_INTERVIEW';
const jpyUsd = 150;
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);

const cases = [
  {
    id: 'ent_gramlab_2025_95f68956e0', ticker: 'GRAMLAB', name: 'Gramlab', founder: 'François Delporte', country: 'FR', scale: 'UNKNOWN', sector: 'AI_AUTOMATION', url: 'https://gramlab.io/',
    source: 'https://www.indiehackers.com/post/how-we-made-17-000-in-one-month-with-a-one-time-payment-saas-no-ads-needed-95f68956e0', observedAt: '2025-02-03',
    revenue: 17000 * jpyUsd, revenueNote: '創業者インタビューは1か月の粗売上17,000 USD、250+ signups、85 paying users、広告費0 USDを記載。利益表現は原文の意味が曖昧なため利益額へ変換しない。',
    description: 'InstagramのClose Friends運用を自動化する買い切り型ツール。', pain: '月額課金を嫌うクリエイター・コーチの導入摩擦。',
    strategy: '買い切り価格、アカウント規模別価格、Telegramコミュニティ、30%紹介料、SEO、Instagram DMを組み合わせた。',
    channels: ['Telegram groups', 'affiliate program', 'SEO', 'Instagram DMs'],
    tools: [{ name: 'Telegram', category: 'distribution' }, { name: 'Instagram', category: 'distribution' }, { name: 'Linktree', category: 'prospecting' }],
    viability: 'UNKNOWN', viabilityLabel: '2026年時点の継続稼働は未確認',
  },
  {
    id: 'ent_rightblogger_2026_kxuy5zjfn1', ticker: 'RIGHTBLOG', name: 'RightBlogger', founder: 'Ryan Robinson / Andy Feliciotti', country: 'US', scale: 'SMALL_TEAM', sector: 'AI_AUTOMATION', url: 'https://rightblogger.com/',
    source: 'https://www.indiehackers.com/post/tech/hitting-29k-mrr-by-building-an-audience-first-KxUy5Zjfn1hJTTGYrl47', observedAt: '2026-07-01',
    revenue: 0, annualRevenue: 350000 * jpyUsd, revenueNote: '創業者インタビューは現在のARR 350,000 USD、50,000+ users、共同創業者2名を記載。利益・原価は未確認。',
    description: 'マーケティングチーム向けのブログ自動化プラットフォーム。', pain: 'キーワード調査、下書き、画像、公開に分散した複数SaaSの継ぎはぎ。',
    strategy: '12年超のオーディエンスを先に形成し、既存読者の反復的な要望を一つのワークフローへ束ねた。',
    channels: ['blog audience', 'YouTube', 'SEO', 'agency'],
    tools: [{ name: 'OpenAI API', category: 'AI' }, { name: 'WordPress', category: 'publishing' }],
    viability: 'ACTIVE_PLAYBOOK', viabilityLabel: '2026年インタビュー時点で稼働中',
  },
  {
    id: 'ent_personalbest_2026_jhx6p14de0', ticker: 'PERSBEST', name: 'Personal Best', founder: 'Shaun Donnelly', country: 'GB', scale: 'SOLO', sector: 'NICHE_SAAS', url: 'https://getpersonalbest.com/',
    source: 'https://www.indiehackers.com/post/tech/building-a-5k-mrr-app-while-freelancing-to-keep-the-lights-on-JhX6p14De0nagI0j1Xg1', observedAt: '2026-09-11',
    revenue: 5000 * jpyUsd, revenueNote: '創業者インタビューは現在5,000 USD MRR、500,000+ downloads、約50,000 MAU、サーバー側コンポーネントなし、限界費用ほぼなしを記載。',
    description: 'iOS向けのワークアウト記録・コーチングアプリ。', pain: '運動履歴を継続的に見返し、目的に沿った進捗を把握したい利用者。',
    strategy: '無料利用を入口に任意のPro会員へ転換し、サーバーを持たない端末完結構成で限界費用を極小化。App Store掲載と有機流入を活用した。',
    channels: ['App Store featuring', 'organic discovery', 'image sharing', 'community'],
    tools: [{ name: 'SwiftUI', category: 'mobile' }, { name: 'Claude Code', category: 'AI' }, { name: 'App Store Connect', category: 'distribution' }],
    viability: 'ACTIVE_PLAYBOOK', viabilityLabel: '2026年9月インタビュー時点で稼働中',
  },
];

function makeEntity(item) {
  const h = hash(item.source);
  const cards = [
    { id: `${item.id}-finance`, type: 'SMOKING_GUN', title: '創業者インタビューの収益・コスト記載', badge: '本人発言', evidenceStatus: 'REPORTED', punchline: item.revenueNote, details: [item.revenueNote, '利益・税・手残りの独立監査は未実施。'], sourceNote: item.source, sourceUrl: item.source, sourceClass, evidenceLocator: { type: 'html', sourceUrl: item.source }, metrics: [{ label: '報告売上', value: item.revenue ? `${item.revenue.toLocaleString()}円` : 'ARRとして報告、月商換算なし', isHighlight: true }, { label: '利益', value: '未確認' }] },
    { id: `${item.id}-mechanism`, type: 'DIRTY_GENESIS', title: '本人発言から確認できる収益配管', badge: '初動・配管', evidenceStatus: 'REPORTED', punchline: item.strategy, details: [item.strategy, `集客経路: ${item.channels.join('、')}`], sourceNote: item.source, sourceUrl: item.source, sourceClass, evidenceLocator: { type: 'html', sourceUrl: item.source } },
    { id: `${item.id}-boundary`, type: 'THE_CRIME', title: '売上・利益・手残りを分離', badge: '未確認境界', evidenceStatus: 'REPORTED', punchline: '公開インタビューの報告値を利益や個人の手残りへ拡張しない。', details: ['原価、広告費、税、営業利益、純利益、継続率は未確認。'], sourceNote: item.source, sourceUrl: item.source, sourceClass, evidenceLocator: { type: 'html', sourceUrl: item.source } },
  ];
  return {
    id: item.id.replace(/\s/g, ''), ticker: item.ticker, name: item.name, legalEntity: 'UNKNOWN', tagline: `${item.description} ${item.revenueNote}`,
    sector: item.sector, scale: item.scale, founder: item.founder, country: item.country, url: item.url, verifiedBadge: false, growthRateYoY: 0, isGrowthUnconfirmed: true,
    architecturePattern: item.description, pipelineStack: item.tools.map((tool) => tool.name).join(' / '), targetPainWallet: item.pain,
    tags: ['PRIMARY_AUTHOR_INTERVIEW', 'REPORTED_REVENUE', 'PROFIT_UNCONFIRMED'],
    pnl: { monthlyRevenue: item.revenue, cogs: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 }, operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0, financialStatus: 'REPORTED', dataSnapshotPeriod: `${snapshot}（記事観測日 ${item.observedAt}）`, sourceDoc: item.source, sourceClass, evidenceLocator: { type: 'html', sourceUrl: item.source }, estimationLogic: item.revenueNote, revenueLabel: item.revenueNote, isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true, ...(item.annualRevenue ? { reportedAnnualRevenueSignal: { amount: item.annualRevenue / jpyUsd, currency: 'USD', jpyAmount: item.annualRevenue, period: 'year', source: item.source, verification: 'REPORTED_PRIMARY_INTERVIEW' } } : {}) },
    evidenceCards: cards,
    operations: { teamSize: item.scale === 'SOLO' ? 1 : 0, initialTeamSize: 0, currentTeamSize: 0, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: item.channels, toolStack: item.tools.map((tool) => ({ ...tool, monthlyCost: 0, isCostUnconfirmed: true, purpose: '記事本文で言及された運用経路' })), isTeamSizeUnconfirmed: item.scale !== 'SOLO', isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true },
    strategy: { blindspot: item.pain, moatType: 'DISTRIBUTION', moatDescription: item.strategy, incumbentDilemma: '既存サービスの制約・競合の反応は記事だけでは未確認。', secretInsight: item.strategy, initialTraction: item.channels, actionPlaybook: [item.strategy, '公開記載の売上・コスト・利益を別々に照合する。', '未確認項目を推定値へ置換しない。'], coldOutreachTemplate: '公開インタビューに記載された運用経路と収益・コストの内訳を確認したい。' },
    temporal: { foundedYear: 0, initialTractionPeriod: `記事観測日 ${item.observedAt}。創業年は未確認。`, dataSnapshotPeriod: `${snapshot} ${item.source}`, viabilityStatus: item.viability, viabilityLabel: item.viabilityLabel, eraContext: '2024–2026年の創業者インタビュー記録。', currentViabilityAnalysis: item.viabilityLabel },
    observations: [`創業者インタビュー: ${item.source}`, item.revenueNote, `事業: ${item.description}`, `配管: ${item.strategy}`, '利益・原価・税・手残りは未確認。'],
    observationsStream: [{ id: `${item.id}-reported`, category: 'REVENUE_PROOF', originType: 'reported', verificationStatus: 'SUPPORTED', text: item.revenueNote, sourceUrl: item.source, observedAt: item.observedAt, sourceClass, evidenceLocator: { type: 'html', sourceUrl: item.source } }, { id: `${item.id}-unknown`, category: 'RESEARCH_LIMIT', originType: 'observed', verificationStatus: 'UNVERIFIED', text: '利益・原価・税・手残りの独立確認は未実施。', sourceUrl: item.source, observedAt: item.observedAt, sourceClass }],
    essence: { whatItDoes: item.description, targetCustomer: item.pain, painRelief: item.pain },
    lootBlueprint: { blueprintId: `${item.id}-loot`, targetPrey: item.pain, structuralFlaw: item.pain, stealthEntry: item.strategy, tollGateSetup: item.channels.join('、'), reproducibilityScore: 0, moatDurabilityScore: 0, capitalEfficiencyScore: 0, executionChecklist: [item.strategy, `集客経路を確認: ${item.channels.join('、')}`, '利益・原価・継続性を一次資料で照合する。'] },
    publishability: 'PARTIAL', claimBindings: [], unknownsNotes: ['利益・原価・税・手残りは独立確認していない。', '記事は本人発言を含むが、財務諸表や決済口座の監査ではない。'], screening: { winner: null, initialTeamPass: item.scale === 'SOLO' ? true : item.scale === 'SMALL_TEAM' ? true : null, capitalStatus: 'unknown', qualificationStatus: 'REQUIRES_FINANCIAL_RECONCILIATION', backgroundAndScaleCaveat: '本人・創業者インタビューに基づく候補。' }, caseType: 'PRIMARY_INDIE_INTERVIEW_CASE', profileSubject: item.founder, profileBusinessLabel: item.name, reportedMetrics: item.revenue ? [{ original: item.revenue / jpyUsd, currency: 'USD', amount: item.revenue / jpyUsd, jpyAmount: item.revenue, unit: 'MONTHLY_REVENUE', source: item.source, context: item.revenueNote }] : [], officialUrl: item.url, sourceMetadata: { provider: 'Indie Hackers', postUrl: item.source, observedAt: item.observedAt, rawContentSha256: h }, batchId: 'batch-primary-indie-evidence-3-20260916'
  };
}

const entities = cases.map(makeEntity);
fs.writeFileSync(outputPath, `${JSON.stringify(entities, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: entities.length, names: entities.map((entity) => entity.name) }, null, 2));
