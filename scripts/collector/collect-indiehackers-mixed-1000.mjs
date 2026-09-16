import fs from 'node:fs';
import crypto from 'node:crypto';
import { checkDuplicate, claimTarget } from '../claim.mjs';

const SNAPSHOT = '2026-09-16';
const AGENT = 'codex-20260916-ih-mixed1000';
const source = fs.readFileSync('scripts/collector/collect-indiehackers-1000.mjs', 'utf8');
const app = source.match(/const APP = '([^']+)'/)?.[1];
const key = source.match(/const KEY = '([^']+)'/)?.[1];
if (!app || !key) throw new Error('Algolia configuration is unavailable');
const endpoint = `https://${app}-dsn.algolia.net/1/indexes/products/query`;

const norm = (v) => String(v ?? '').normalize('NFKC').toLowerCase()
  .replace(/\[[^\]]*\]/g, '')
  .replace(/\b(inc|llc|corp|corporation|co|ltd|plc|gmbh|holdings|company|group|app|ai|io|so|dev|hq|software|technology|technologies|limited)\b/g, '')
  .replace(/[\s._'’`"()\[\]{}:+,&/\\-]+/g, '');
const domain = (v) => { try { return new URL(v).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const clean = (v, n = 220) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : `${s.slice(0, n - 1)}…`; };
const year = (v) => { const n = Number.parseInt(String(v ?? '').slice(0, 4), 10); return n >= 1900 && n <= 2026 ? n : 0; };

const REJECT = /(iptv|paypal\s*account|buy\s*(old\s*)?(account|gmail)|account(s)?\s*(market|for\s*sale)|ransomware|crypto|bitcoin|binance|daily\s*profit|investment\s*earn|casino|gambl|escort|porn|xxx|adult|sportsbook|betting|guest\s*post|followers|likes|instagram\s*service|facebook\.com|tiktok\s*views|youtube\s*views|nft\s*mint|forex\s*signal|deepfake|link\s*building|backlink|seo\s*agency|press\s*agency|marketing\s*agency|web\s*development\s*company|smm|airbnb\s*clone\s*script)/i;
const GENERIC = /^(https?:\/\/|www\.|best\s*(service|iptv)|marketing$|service$|test$|app$|product$|project$|my\s*(app|project)|blog$|website$|software$|tool$|ai$|unknown$|software development company|the liquid sprint)$/i;
const SOCIAL = /(facebook\.com|twitter\.com|x\.com|g\.co\/|linkedin\.com|instagram\.com|t\.me|wa\.me)/i;

const loadClaims = () => new Set(fs.readFileSync('data/CLAIMED_TARGETS.txt', 'utf8').split(/\r?\n/).map(norm).filter(Boolean));
const loadExisting = () => {
  const idx = JSON.parse(fs.readFileSync('data/entities-index.json', 'utf8'));
  return {
    names: new Set(idx.map((x) => norm(x.name))),
    domains: new Set(idx.map((x) => domain(x.url)).filter(Boolean)),
  };
};

async function fetchPool() {
  const out = new Map();
  for (const tag of ['founders-solo', 'employees-under-10', 'employees-10-plus', 'funding-bootstrapped', 'funding-self', 'commitment-full-time']) {
    for (let page = 0; page < 3; page += 1) {
      const params = new URLSearchParams({
        hitsPerPage: '1000', page: String(page), query: '',
        numericFilters: 'revenue>=1500,revenue<=100000', tagFilters: tag,
      });
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'X-Algolia-Application-Id': app, 'X-Algolia-API-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ params: params.toString() }),
      });
      if (!response.ok) throw new Error(`Algolia ${response.status} for ${tag}/${page}`);
      const json = await response.json();
      const hits = json.hits ?? [];
      for (const hit of hits) out.set(hit.productId ?? hit.objectID, hit);
      if (hits.length < 1000) break;
    }
  }
  return [...out.values()];
}

function usable(x) {
  const name = String(x.name ?? '').trim();
  const tagline = String(x.tagline ?? '').trim();
  const description = String(x.description ?? '').trim();
  const url = String(x.websiteUrl ?? '').trim();
  const tags = Array.isArray(x._tags) ? x._tags : [];
  const eligibleScale = tags.includes('founders-solo') || tags.includes('employees-0') || tags.includes('employees-under-10') || tags.includes('employees-10-plus');
  if (tags.includes('employees-50-plus')) return false;
  return eligibleScale && name.length >= 3 && tagline.length >= 12 && description.length >= 20
    && /^https?:\/\//i.test(url) && !REJECT.test([name, tagline, description, url].join(' '))
    && !GENERIC.test(name) && !SOCIAL.test(url);
}

function makeEntity(x) {
  const tags = Array.isArray(x._tags) ? x._tags : [];
  const name = String(x.name).trim();
  const tagline = clean(x.tagline);
  const description = clean(x.description);
  const url = String(x.websiteUrl).trim();
  const productId = x.productId ?? x.objectID;
  const ihUrl = `https://www.indiehackers.com/product/${encodeURIComponent(productId)}`;
  const h = hash(`${productId}|${url}`);
  const id = `ent_${norm(name).slice(0, 48) || 'product'}_${h.slice(0, 12)}`;
  const revenue = Number(x.revenue) || 0;
  const reported = `Indie Hackersの公開レコードは月間売上をUS$${revenue.toLocaleString('en-US')}と表示している（自己申告または同サイトの表示値。利益ではない）。`;
  const target = `掲載タグラインが示す課題「${tagline}」を持つ利用者の支出意向`;
  const startYear = year(x.startDateStr);
  const scale = tags.includes('employees-10-plus') && !tags.includes('employees-under-10') && !tags.includes('employees-0') ? 'SCALEUP' : (tags.includes('founders-solo') || tags.includes('employees-0') ? 'SOLO' : 'SMALL_TEAM');
  const models = tags.filter((t) => t.startsWith('revenue-model-')).map((t) => t.slice(13)).join(', ') || '未確認';
  const p = {
    monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0,
    financialStatus: 'UNAVAILABLE', dataSnapshotPeriod: `${SNAPSHOT} Indie Hackers公開レコード`,
    sourceDoc: ihUrl, sourceClass: 'INDEPENDENT_SECONDARY',
    estimationLogic: `${reported} 原価・経費・利益の根拠がないためP&Lは未確認。`,
    revenueLabel: `Indie Hackers表示: US$${revenue.toLocaleString('en-US')}/month（報告値・利益ではない）`,
    isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true,
    isCostsUnconfirmed: true, isNetProfitUnconfirmed: true,
  };
  const lootCard = {
    id: `${h.slice(0, 12)}-loot`, type: 'LOOT_BLUEPRINT',
    title: `公開タグライン「${tagline}」が示す単一課題への集中`, badge: '公開レコードの転用仮説',
    evidenceStatus: 'REPORTED', punchline: target,
    details: [`掲載説明: 「${description}」`, reported, `収益モデルタグは「${models}」。価格、継続率、原価、利益は未確認。`],
    codeSnippet: 'N/A — 実装詳細は公開レコードで未確認。', sourceNote: `Indie Hackers Products directory, ${SNAPSHOT} snapshot: ${ihUrl}`,
    sourceUrl: ihUrl, sourceClass: 'INDEPENDENT_SECONDARY', metrics: [{ label: '掲載月間売上（報告値）', value: `US$${revenue.toLocaleString('en-US')}`, isHighlight: true }, { label: '利益・原価', value: '未確認' }], evidenceLocator: { type: 'html' },
  };
  return {
    id, ticker: `IH${h.slice(0, 8).toUpperCase()}`, name, legalEntity: 'UNKNOWN (公開ディレクトリ情報のみ)',
    tagline: `「${target}」に対し「${tagline}」を提供。掲載月間売上は報告値で、利益は未確認。`,
    sector: /vertical-(ai|machine-learning)/i.test(tags.join(' ')) ? 'AI_AUTOMATION' : /vertical-(finance|fintech|payments|banking)/i.test(tags.join(' ')) ? 'FINTECH_INFRA' : 'NICHE_SAAS',
    scale, founder: 'UNKNOWN (公開ディレクトリでは個人名未確認)', country: 'GLOBAL', url, verifiedBadge: false,
    growthRateYoY: null, architecturePattern: 'UNKNOWN (実装方式は公開ディレクトリから未確認)', pipelineStack: 'UNKNOWN (技術構成は公開ディレクトリから未確認)', targetPainWallet: target,
    tags: [...tags.filter((t) => !t.startsWith('founders-') && !t.startsWith('employees-')).slice(0, 16), 'INDIE_HACKERS_REPORTED_REVENUE', 'FINANCIAL_PROFIT_UNKNOWN'], pnl: p,
    evidenceCards: [lootCard, { id: `${h.slice(12, 24)}-signal`, type: 'THE_CRIME', title: '売上表示と未開示範囲を分離して記録', badge: '報告値', evidenceStatus: 'REPORTED', punchline: reported, details: [`公式URLとして登録された掲載先: ${url}`, `開始時期の掲載値: ${x.startDateStr || '未確認'}。創業者名・利益は未確認。`], sourceNote: `Indie Hackers Products directory, ${SNAPSHOT} snapshot: ${ihUrl}`, sourceUrl: ihUrl, sourceClass: 'INDEPENDENT_SECONDARY', metrics: [{ label: '公開月間売上欄', value: `US$${revenue.toLocaleString('en-US')}` }, { label: '利益', value: '未確認' }] }],
    operations: { teamSize: 0, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: ['Indie Hackers product directory', 'web'], toolStack: [], isTeamSizeUnconfirmed: true, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true },
    strategy: { blindspot: `公開説明が示す「${tagline}」という狭い課題への専門化。競合比較は未確認。`, moatType: 'UNKNOWN', moatDescription: '継続率、独自データ、供給制約などの防御要因は未確認。', incumbentDilemma: '大手との価格・機能・流通の比較は未確認。', secretInsight: `公開レコードから確定できるのは、${tagline}という提供表現と売上表示だけ。顧客獲得手法は未確認。`, initialTraction: [`掲載開始値: ${x.startDateStr || '未確認'}`, 'Indie Hackersの商品ディレクトリに掲載', '顧客獲得の初動手段は未確認'], actionPlaybook: [`課題を「${tagline}」の1つに限定し、有償性を検証する。`, '売上表示と利益を分離し、原価・経費・継続率の一次根拠を照合する。', '公式URLの提供条件と第三者記録を別々に保存する。'], coldOutreachTemplate: `「${tagline}」に関する作業で、現場が最も時間を失う箇所を15分だけ教えてください。` },
    temporal: { foundedYear: startYear, initialTractionPeriod: startYear ? `${startYear}年の掲載開始情報。初動獲得経路は未確認。` : '掲載開始時期・初動獲得経路は未確認。', dataSnapshotPeriod: `${SNAPSHOT}公開レコード`, viabilityStatus: startYear >= 2024 ? 'RISING_WAVE' : 'UNKNOWN', viabilityLabel: startYear >= 2024 ? '新しい掲載・収益表示あり' : '根拠未確認', eraContext: 'Indie Hackersの公開ディレクトリで、個人または少人数の製品情報と収益表示が公開される環境。', currentViabilityAnalysis: '掲載と売上表示は確認候補だが、利益・継続性・法令順守・現在の稼働状況は未確認。' },
    observations: [`Indie Hackersの掲載説明は「${description}」。`, reported, `公開タグ: ${tags.slice(0, 12).join(', ') || 'なし'}。`, `公式URL: ${url}`, '利益、原価、創業者、チーム人数は未確認。'],
    observationsStream: [{ id: `${h.slice(24, 36)}-listing`, category: 'PRODUCT_LISTING', originType: 'reported', verificationStatus: 'SUPPORTED', text: `Indie Hackers listing: ${tagline}`, sourceUrl: ihUrl, observedAt: SNAPSHOT, sourceClass: 'INDEPENDENT_SECONDARY' }, { id: `${h.slice(36, 48)}-revenue`, category: 'RESEARCH_LIMIT', originType: 'reported', verificationStatus: 'UNVERIFIED', text: reported, sourceUrl: ihUrl, observedAt: SNAPSHOT, sourceClass: 'INDEPENDENT_SECONDARY' }],
    essence: { whatItDoes: tagline, targetCustomer: '公開ディレクトリでは顧客属性の詳細未確認。', painRelief: description },
    lootBlueprint: { blueprintId: `${id}-loot`, targetPrey: target, structuralFlaw: `公開説明が示す未充足作業: ${description}`, stealthEntry: `Indie Hackers product directoryと公式URL（${url}）の組み合わせ。実際の獲得手法は未確認。`, tollGateSetup: `収益モデルの公開タグは「${models}」。料金・継続条件・原価は未確認。`, reproducibilityScore: null, moatDurabilityScore: null, capitalEfficiencyScore: null, executionChecklist: [`課題を「${tagline}」の1つに限定し、有償性を確認する。`, '売上表示と利益を分離し、原価・経費・継続率の一次根拠が取れるまでP&Lを確定しない。', '公式URLの提供条件とディレクトリ記録を同一IDで保存する。'] },
    publishability: 'PARTIAL', claimBindings: [], unknownsNotes: ['公開月間売上欄は利益ではなく、独立監査済みかどうかも確定できない。', '原価、営業経費、営業利益、純利益、成長率は未確認。', '創業者名、法人名、国、チーム人数、技術スタックは未確認。'], screening: { winner: null, initialTeamPass: true, capitalStatus: tags.includes('funding-bootstrapped') ? 'reported_bootstrapped' : 'unknown', qualificationStatus: 'CAPTURE_REQUIRES_PRIMARY_FINANCIAL_RECONCILIATION', backgroundAndScaleCaveat: scale === 'SCALEUP' ? '10人超タグを含むため少数精鋭性は未確認。利益・自立性も未判定。' : 'ディレクトリ表示を根拠にした候補記録。利益・自立性は未判定。' }, batchId: 'batch-indie-hackers-mixed-20260916',
  };
}

const dryRun = process.argv.includes('--dry-run');
const recoverClaimed = process.argv.includes('--recover-claimed');
const fill = process.argv.includes('--fill');
const pool = await fetchPool();
if (recoverClaimed) {
  const claimedByUs = new Set(fs.readFileSync('data/CLAIMED_TARGETS.txt', 'utf8').split(/\r?\n/)
    .filter((line) => line.includes(`[CLAIMED:${AGENT} @`))
    .map((line) => norm(line.split('[CLAIMED:')[0]))
    .filter(Boolean));
  const recovered = [];
  const names = new Set();
  const domains = new Set();
  for (const x of pool) {
    const nameKey = norm(x.name);
    const domainKey = domain(x.websiteUrl);
    if (!claimedByUs.has(nameKey) || names.has(nameKey) || domains.has(domainKey)) continue;
    recovered.push(makeEntity(x));
    names.add(nameKey);
    domains.add(domainKey);
  }
  console.log(JSON.stringify({ recoverClaimed: claimedByUs.size, recovered: recovered.length }, null, 2));
  if (!dryRun) {
    fs.writeFileSync('data/incoming/batch_indie_hackers_mixed_recovered_20260916.json', `${JSON.stringify(recovered, null, 2)}\n`, 'utf8');
    console.log('wrote data/incoming/batch_indie_hackers_mixed_recovered_20260916.json');
  }
  process.exit(recovered.length === claimedByUs.size ? 0 : 2);
}
const existing = loadExisting();
const claims = loadClaims();
const names = new Set();
const domains = new Set();
const selected = [];
const rejected = { unusable: 0, existing: 0, duplicate: 0, claim: 0 };
const basePath = 'data/incoming/batch_indie_hackers_mixed_recovered_20260916.json';
const base = fill && fs.existsSync(basePath) ? JSON.parse(fs.readFileSync(basePath, 'utf8')) : [];
const targetCount = fill ? Math.max(0, 1000 - base.length) : 1000;
for (const x of pool.sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0))) {
  if (selected.length >= targetCount) break;
  if (!usable(x)) { rejected.unusable += 1; continue; }
  const nameKey = norm(x.name);
  const domainKey = domain(x.websiteUrl);
  if (!nameKey || existing.names.has(nameKey) || existing.domains.has(domainKey) || claims.has(nameKey)) { rejected.existing += 1; continue; }
  if (names.has(nameKey) || domains.has(domainKey) || checkDuplicate(x.name).exists) { rejected.duplicate += 1; continue; }
  if (!dryRun) { try { claimTarget(x.name, AGENT, false); } catch { rejected.claim += 1; continue; } }
  selected.push(makeEntity(x)); names.add(nameKey); domains.add(domainKey);
}
console.log(JSON.stringify({ pool: pool.length, base: base.length, targetCount, selected: selected.length, rejected }, null, 2));
if (dryRun) process.exit(selected.length >= 1000 ? 0 : 2);
if (selected.length !== targetCount) throw new Error(`Only selected ${selected.length}/${targetCount}; no batch written.`);
const output = fill ? [...base, ...selected] : selected;
const outputPath = fill ? 'data/incoming/batch_indie_hackers_mixed_1000_20260916.json' : 'data/incoming/batch_indie_hackers_mixed_1000_20260916.json';
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`wrote ${outputPath} (${output.length} records)`);
