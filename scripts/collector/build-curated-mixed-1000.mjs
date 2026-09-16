import fs from 'node:crypto';
import nodeFs from 'node:fs';
import { checkDuplicate, claimTarget } from '../claim.mjs';

const SNAPSHOT = '2026-09-16';
const AGENT = 'codex-20260916-ih-curated272';
const INPUT = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_indie_hackers_mixed_1000_20260916.json';
const BINDING = process.env.MM_BINDING_FILE ?? 'data/incoming/batch_indie_hackers_mixed_source_binding_audit_1000_20260916.json';
const REPLACEMENTS = 'data/incoming/batch_indie_hackers_replacement_candidates_20260916.json';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_indie_hackers_curated_1000_20260916.json';
const REASON_SCOPE = process.env.MM_REASON_SCOPE ?? 'all';

const norm = (v) => String(v ?? '').normalize('NFKC').toLowerCase().replace(/[\s._'’`"()\[\]{}:+,&/\\-]+/g, '');
const domain = (v) => { try { return new URL(v).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const clean = (v, n = 240) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : `${s.slice(0, n - 1)}…`; };
const year = (v) => { const n = Number.parseInt(String(v ?? '').slice(0, 4), 10); return n >= 1900 && n <= 2026 ? n : 0; };
const hash = (v) => fs.createHash('sha256').update(String(v)).digest('hex');
const sector = (tags) => {
  const s = tags.join(' ');
  if (/vertical-(ai|machine-learning)/i.test(s)) return 'AI_AUTOMATION';
  if (/vertical-(finance|fintech|payments|banking)/i.test(s)) return 'FINTECH_INFRA';
  if (/vertical-(movies-video|music|writing|news|books|podcasts|social-media|marketing|art|design|photography)/i.test(s)) return 'CONTENT_MEDIA';
  if (/vertical-(home|local|food|restaurants|travel|health|fitness|real-estate|transportation|sports)/i.test(s)) return 'LOCAL_SERVICES';
  return 'NICHE_SAAS';
};
const scale = (tags) => tags.includes('founders-solo') || tags.includes('employees-0') ? 'SOLO' : tags.includes('employees-under-10') ? 'SMALL_TEAM' : tags.includes('employees-10-plus') ? 'SCALEUP' : 'UNKNOWN';
const models = (tags) => tags.filter((x) => x.startsWith('revenue-model-')).map((x) => x.slice(13)).join(', ') || '公開情報で未確認';

const input = JSON.parse(nodeFs.readFileSync(INPUT, 'utf8'));
const binding = JSON.parse(nodeFs.readFileSync(BINDING, 'utf8'));
const candidates = JSON.parse(nodeFs.readFileSync(REPLACEMENTS, 'utf8'));
const duplicateEntityIds = new Set();
if (REASON_SCOPE === 'duplicate') {
  const seen = new Set();
  for (const row of input) {
    const d = domain(row.url);
    if (!d) continue;
    if (seen.has(d)) duplicateEntityIds.add(row.id);
    else seen.add(d);
  }
}
const badIds = REASON_SCOPE === 'duplicate' ? duplicateEntityIds : new Set(binding.filter((x) => REASON_SCOPE === 'forbidden'
  ? x.reasons.some((reason) => reason === 'FORBIDDEN_DESTINATION' || reason === 'FORBIDDEN_ENTITY_TEXT')
  : x.reasons.some((reason) => reason !== 'BINDING_OBSERVED')).map((x) => x.id));
const keep = input.filter((x) => !badIds.has(x.id));
const keepDomains = new Set(keep.map((x) => domain(x.url)).filter(Boolean));
const chosen = [];
const chosenNames = new Set(keep.map((x) => norm(x.name)));
const chosenDomains = new Set(keepDomains);
for (const candidate of candidates) {
  if (chosen.length >= input.length - keep.length) break;
  if (String(candidate.startDateStr ?? '') > '2026-09') continue;
  const nameKey = norm(candidate.name);
  const officialDomain = domain(candidate.officialAudit?.finalUrl ?? candidate.websiteUrl);
  if (!nameKey || !officialDomain || chosenNames.has(nameKey) || chosenDomains.has(officialDomain)) continue;
  const duplicate = checkDuplicate(candidate.name);
  if (duplicate.exists) continue;
  chosen.push(candidate); chosenNames.add(nameKey); chosenDomains.add(officialDomain);
}
if (chosen.length !== input.length - keep.length) throw new Error(`Replacement shortfall: ${chosen.length}/${input.length - keep.length}`);

const makeEntity = (x) => {
  const tags = Array.isArray(x._tags) ? x._tags : [];
  const name = String(x.name).trim();
  const tagline = clean(x.tagline);
  const description = clean(x.description);
  const url = String(x.websiteUrl).trim();
  const productId = x.productId ?? x.objectID;
  const h = hash(`${productId}|${url}`);
  const id = `ent_${norm(name).slice(0, 48) || 'product'}_${h.slice(0, 12)}`;
  const ihUrl = `https://www.indiehackers.com/product/${encodeURIComponent(productId)}`;
  const revenue = Number(x.revenue) || 0;
  const reported = `Indie Hackersの公開レコードは月間売上をUS$${revenue.toLocaleString('en-US')}と表示している（自己申告または同サイトの表示値。利益ではない）。`;
  const target = `掲載説明が示す「${tagline}」を必要とする利用者の支出意向`;
  const startYear = year(x.startDateStr);
  const businessScale = scale(tags);
  const model = models(tags);
  const p = {
    monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0,
    financialStatus: 'UNAVAILABLE', dataSnapshotPeriod: `${SNAPSHOT} Indie Hackers公開レコード`, sourceDoc: ihUrl,
    sourceClass: 'INDEPENDENT_SECONDARY', estimationLogic: `${reported} 原価・経費・利益の根拠がないため、P&Lは未確認。`,
    revenueLabel: `Indie Hackers表示: US$${revenue.toLocaleString('en-US')}/month（報告値・利益ではない）`,
    isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true,
  };
  const official = x.officialAudit;
  return {
    id, ticker: `IH${h.slice(0, 8).toUpperCase()}`, name, legalEntity: 'UNKNOWN (公開ディレクトリ情報のみ)',
    tagline: `「${target}」に対し「${tagline}」を提供。掲載月間売上は報告値で、利益は未確認。`, sector: sector(tags), scale: businessScale,
    founder: 'UNKNOWN (公開ディレクトリでは個人名未確認)', country: 'GLOBAL', url, verifiedBadge: false, growthRateYoY: null,
    architecturePattern: 'UNKNOWN (公開情報で未確認)', pipelineStack: 'UNKNOWN (公開情報で未確認)', targetPainWallet: target, tags: [...tags.filter((tag) => !tag.startsWith('founders-') && !tag.startsWith('employees-')).slice(0, 16), 'INDIE_HACKERS_REPORTED_REVENUE', 'FINANCIAL_PROFIT_UNKNOWN'], pnl: p,
    evidenceCards: [
      { id: `${h.slice(0, 12)}-loot`, type: 'LOOT_BLUEPRINT', title: `公開説明「${tagline}」が示す課題集中`, badge: '公開情報からの転用仮説', evidenceStatus: 'REPORTED', punchline: target, details: [`掲載説明: 「${description}」`, reported, `収益モデルタグ: ${model}。価格・原価・継続率・利益は未確認。`], codeSnippet: 'N/A — 実装詳細は公開情報で未確認。', sourceNote: `Indie Hackers Products directory, ${SNAPSHOT}: ${ihUrl}`, sourceUrl: ihUrl, sourceClass: 'INDEPENDENT_SECONDARY', metrics: [{ label: '掲載月間売上（報告値）', value: `US$${revenue.toLocaleString('en-US')}` }, { label: '利益・原価', value: '未確認' }] },
      { id: `${h.slice(12, 24)}-signal`, type: 'THE_CRIME', title: '公開売上表示と未開示範囲の分離', badge: '報告値', evidenceStatus: 'REPORTED', punchline: reported, details: [`公式URLとして登録された掲載先: ${url}`, `開始時期の掲載値: ${x.startDateStr || '未確認'}。創業者名・利益は未確認。`], sourceNote: `Indie Hackers Products directory, ${SNAPSHOT}: ${ihUrl}`, sourceUrl: ihUrl, sourceClass: 'INDEPENDENT_SECONDARY', metrics: [{ label: '公開月間売上欄', value: `US$${revenue.toLocaleString('en-US')}` }, { label: '利益', value: '未確認' }] },
      { id: `${h.slice(24, 36)}-official`, type: 'OFFICIAL_SITE_CHECK', title: '公式サイトの現行取得確認', badge: '取得確認', evidenceStatus: 'VERIFIED', punchline: '登録公式URLのページを確認し、名称とページ表示の対応を記録した。財務実績の独立確認ではない。', details: [`ページタイトル: ${official.title || '未取得'}`, `最終URL: ${official.finalUrl}`, `HTTPステータス: ${official.status}`, `名称照合トークン: ${(official.matchedTokens ?? []).join(', ') || '未確認'}`], sourceNote: `公式URL取得監査, ${SNAPSHOT}: ${official.finalUrl}`, sourceUrl: official.finalUrl, sourceClass: 'PRIMARY_SOURCE_CANDIDATE', metrics: [], evidenceLocator: { type: 'html', status: official.status } },
    ],
    operations: { teamSize: 0, isTeamSizeUnconfirmed: true, initialTeamSize: 0, currentTeamSize: 0, weeklyHours: 0, isWeeklyHoursUnconfirmed: true, initialCapitalRequired: 0, isCapitalUnconfirmed: true, automationLevel: 0, isAutomationUnconfirmed: true, primaryChannels: ['Indie Hackers product directory', '公式サイト'], toolStack: [] },
    strategy: { blindspot: `公開説明が示す「${tagline}」への専門化。競合比較は未確認。`, moatType: 'UNKNOWN', moatDescription: '継続率、独自データ、供給制約などの防御要因は未確認。', incumbentDilemma: '大手との価格・機能・流通の比較は未確認。', secretInsight: `${description}。顧客獲得手法と利益は未確認。`, initialTraction: [`掲載開始値: ${x.startDateStr || '未確認'}`, 'Indie Hackers商品ディレクトリに掲載', '獲得経路は未確認'], actionPlaybook: [`「${tagline}」に困る顧客の有償性を確認する。`, '公開売上と利益を分離し、原価・経費・継続率を照合する。', `公式URL（${url}）の提供条件と第三者記録を別々に保存する。`], coldOutreachTemplate: `「${tagline}」に関する作業で、現場が最も時間を失う箇所を15分だけ教えてください。` },
    temporal: { foundedYear: startYear, initialTractionPeriod: startYear ? `${startYear}年の掲載開始情報。初動獲得経路は未確認。` : '掲載開始時期・初動獲得経路は未確認。', dataSnapshotPeriod: `${SNAPSHOT}公開レコード`, viabilityStatus: startYear >= 2024 ? 'RISING_WAVE' : 'UNKNOWN', viabilityLabel: startYear >= 2024 ? '新しい掲載情報' : '根拠未確認', eraContext: '個人開発者が製品説明と売上表示を公開できるオンライン環境。', currentViabilityAnalysis: '掲載と公式ページの取得は確認候補だが、利益・継続性・法令順守・現在の稼働状況は未確認。' },
    observations: [`掲載説明: 「${description}」`, reported, `公開タグ: ${tags.slice(0, 12).join(', ') || 'なし'}。`, `公式URL: ${url}`, '利益・原価・創業者・チーム人数は未確認。'],
    observationsStream: [{ id: `${h.slice(36, 48)}-listing`, category: 'PRODUCT_LISTING', originType: 'reported', verificationStatus: 'SUPPORTED', text: `Indie Hackers listing: ${tagline}`, sourceUrl: ihUrl, observedAt: SNAPSHOT, sourceClass: 'INDEPENDENT_SECONDARY' }, { id: `${h.slice(48, 60)}-official`, category: 'OFFICIAL_SITE', originType: 'observed', verificationStatus: 'SUPPORTED', text: `Official page title: ${official.title || '未取得'}`, sourceUrl: official.finalUrl, observedAt: SNAPSHOT, sourceClass: 'PRIMARY_SOURCE_CANDIDATE' }],
    essence: { whatItDoes: tagline, targetCustomer: '公開情報では顧客属性の詳細未確認。', painRelief: description },
    lootBlueprint: { blueprintId: `${id}-loot`, targetPrey: target, structuralFlaw: `公開説明が示す未充足作業: ${description}`, stealthEntry: `課題に直結する公式ページ（${url}）と公開ディレクトリの組合せ。実際の獲得手法は未確認。`, tollGateSetup: `収益モデルの公開タグは「${model}」。料金・継続条件・原価は未確認。`, reproducibilityScore: null, moatDurabilityScore: null, capitalEfficiencyScore: null, executionChecklist: [`「${tagline}」の有償顧客を確認する。`, '売上表示と利益を分離し、原価・経費・継続率の一次根拠を照合する。', `公式ページ（${url}）とディレクトリ記録を同一IDで保存する。`] },
    publishability: 'PARTIAL', claimBindings: [], unknownsNotes: ['公開月間売上欄は利益ではなく、独立監査済みかどうかも未確認。', '原価、営業経費、営業利益、純利益、成長率は未確認。', '創業者名、法人名、国、チーム人数、技術スタックは未確認。'], screening: { winner: null, initialTeamPass: businessScale === 'SOLO' ? true : null, capitalStatus: tags.includes('funding-bootstrapped') ? 'reported_bootstrapped' : 'unknown', qualificationStatus: 'CAPTURE_REQUIRES_PRIMARY_FINANCIAL_RECONCILIATION', backgroundAndScaleCaveat: '公開ディレクトリと公式ページの取得を確認した候補。利益・自立性は未判定。' }, batchId: 'batch-indie-hackers-curated-20260916',
  };
};

const newEntities = [];
for (const candidate of chosen) {
  const duplicate = checkDuplicate(candidate.name);
  if (duplicate.exists) throw new Error(`Candidate became unavailable: ${candidate.name}`);
  claimTarget(candidate.name, AGENT, false);
  newEntities.push(makeEntity(candidate));
}
const output = [...keep, ...newEntities];
if (output.length !== 1000) throw new Error(`Curated batch count ${output.length}`);
nodeFs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ input: input.length, removedForReview: input.length - keep.length, replacements: newEntities.length, output: OUTPUT, solo: output.filter((x) => x.scale === 'SOLO').length, smallTeam: output.filter((x) => x.scale === 'SMALL_TEAM').length, scaleup: output.filter((x) => x.scale === 'SCALEUP').length }, null, 2));
