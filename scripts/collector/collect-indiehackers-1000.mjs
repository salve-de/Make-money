import fs from 'node:fs';
import crypto from 'node:crypto';
import { checkDuplicate, claimTarget } from '../claim.mjs';

const APP = 'N86T1R3OWZ';
const KEY = '5140dac5e87f47346abbda1a34ee70c3';
const ENDPOINT = `https://${APP}-dsn.algolia.net/1/indexes/products/query`;
const AGENT = 'codex-20260916-ih1000';
const SNAPSHOT = '2026-09-16';
const TERMS = ['a','e','i','o','u','s','t','r','n','c','m','p','l','d','g','h'];
const REJECT = /(iptv|paypal\s*account|buy\s*account|ransomware|crypto\s*(recovery|trading)|recovery\s*service|casino|gambl|escort|porn|xxx|adult|sportsbook|betting|guest\s*post|followers|likes|instagram\s*service|facebook\.com|tiktok\s*views|youtube\s*views|nft\s*mint|forex\s*signal|deepfake|link\s*building|seo\s*agency|press\s*agency|marketing\s*agency|web\s*development\s*company)/i;
const GENERIC = /^(https?:\/\/|www\.|best\s*(service|iptv)|marketing$|service$|test$|app$|product$|project$|my\s*(app|project)|blog$|website$|software$|tool$|ai$|unknown$|software development company|the liquid sprint)/i;
const SOCIAL = /(facebook\.com|twitter\.com|x\.com|g\.co\/|linkedin\.com|instagram\.com|t\.me|wa\.me)/i;

const norm = (v) => String(v ?? '').normalize('NFKC').toLowerCase()
  .replace(/\b(inc|llc|corp|corporation|co|ltd|plc|gmbh|holdings|company|group|app|ai|io|so|dev|hq|software|technology|technologies|limited)\b/g, '')
  .replace(/[\s\-_・（）()株式会社有限会社.]/g, '');
const domain = (v) => { try { return new URL(v).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } };
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest('hex');
const clean = (v, n = 220) => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s.length <= n ? s : `${s.slice(0, n - 1)}…`; };
const year = (v) => { const n = Number.parseInt(String(v ?? '').slice(0, 4), 10); return n >= 1900 && n <= 2026 ? n : null; };
const sector = (tags) => {
  const s = tags.join(' ');
  if (/vertical-(ai|machine-learning)/i.test(s)) return 'AI_AUTOMATION';
  if (/vertical-(finance|fintech|crypto|trading|payments|banking)/i.test(s)) return 'FINTECH_INFRA';
  if (/vertical-(movies-video|music|writing|news|books|podcasts|social-media|marketing|art|design|photography)/i.test(s)) return 'CONTENT_MEDIA';
  if (/vertical-(home|local|food|restaurants|travel|health|fitness|real-estate|transportation|sports)/i.test(s)) return 'LOCAL_SERVICES';
  return 'NICHE_SAAS';
};
const scale = (tags) => tags.includes('founders-solo') ? 'SOLO' : tags.includes('employees-under-10') ? 'SMALL_TEAM' : tags.includes('employees-10-plus') ? 'SCALEUP' : 'UNKNOWN';
const models = (tags) => tags.filter((x) => x.startsWith('revenue-model-')).map((x) => x.slice(13)).join(', ') || '公開情報で未確認';
const platforms = (tags) => tags.filter((x) => x.startsWith('platform-')).map((x) => x.slice(9)).slice(0, 3);
const loadExisting = () => {
  const a = JSON.parse(fs.readFileSync('data/entities-index.json', 'utf8'));
  const b = JSON.parse(fs.readFileSync('data/collected-registry.json', 'utf8'));
  return {
    names: new Set([...a, ...b].map((x) => norm(x.name))),
    tickers: new Set([...a, ...b].map((x) => String(x.ticker ?? '').toUpperCase())),
    domains: new Set([...a, ...b].map((x) => domain(x.url)).filter(Boolean)),
  };
};
const fetchPool = async () => {
  const out = new Map();
  for (const q of TERMS) {
    const params = new URLSearchParams({ hitsPerPage: '1000', page: '0', query: q, numericFilters: 'revenue>=2000,revenue<=100000', tagFilters: 'founders-solo' });
    const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'X-Algolia-Application-Id': APP, 'X-Algolia-API-Key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ params: params.toString() }) });
    if (!r.ok) throw new Error(`Algolia ${r.status} for ${q}`);
    for (const x of (await r.json()).hits ?? []) out.set(x.productId ?? x.objectID, x);
  }
  return [...out.values()];
};
const usable = (x) => {
  const n = String(x.name ?? '').trim(), t = String(x.tagline ?? '').trim(), d = String(x.description ?? '').trim(), u = String(x.websiteUrl ?? '').trim();
  return n.length >= 3 && t.length >= 12 && d.length >= 20 && /^https?:\/\//i.test(u) && !REJECT.test([n, t, d, u].join(' ')) && !GENERIC.test(n) && !SOCIAL.test(u) && Boolean(domain(u));
};
const incomingEntities = (excludePath) => {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.json') && file !== excludePath) files.push(file);
    }
  };
  walk('data/incoming');
  const out = [];
  for (const file of files) {
    try {
      const value = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(value)) out.push(...value);
    } catch {}
  }
  return out;
};
const entity = (x, ticker, id) => {
  const tags = Array.isArray(x._tags) ? x._tags : [], t = clean(x.tagline), d = clean(x.description), u = String(x.websiteUrl).trim();
  const usd = Number(x.revenue) || 0, ih = `https://www.indiehackers.com/products/${encodeURIComponent(x.productId ?? x.objectID)}`, h = hash(`${x.productId ?? x.objectID}|${u}`), y = year(x.startDateStr), m = models(tags), target = `掲載タグラインが示す課題「${t}」を持つ利用者の支出意向`, reported = `Indie Hackersの公開レコードは月間売上をUS$${usd.toLocaleString('en-US')}と表示している（自己申告または同サイトの表示値。利益ではない）。`, source = `Indie Hackers Products directory, ${SNAPSHOT} snapshot: ${ih}`;
  const p = { monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0, operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 }, operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0, financialStatus: 'REPORTED', dataSnapshotPeriod: `${SNAPSHOT} Indie Hackers公開レコード`, sourceDoc: ih, estimationLogic: `${reported} 原価・経費・利益の根拠がないためP&L数値は内部互換のゼロ値。`, revenueLabel: `Indie Hackers表示: US$${usd.toLocaleString('en-US')}/month（報告値・利益ではない）`, isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true, isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true };
  const loot = { id: `${h.slice(0, 12)}-loot`, type: 'LOOT_BLUEPRINT', title: `公開タグライン「${t}」が示す単一課題への集中`, badge: '公開レコードの転用仮説', evidenceStatus: 'REPORTED', punchline: target, details: [`掲載説明: 「${d}」`, reported, `収益モデルタグは「${m}」。価格、継続率、原価、実際の利益は公開レコードから確認できない。`, '転用仮説: 同じ課題を持つ顧客群を先に特定し、提供価値と販売条件を一次情報で照合する。これは実績ではなく推論。'], codeSnippet: 'N/A — 実装詳細は公開レコードで未確認。', sourceNote: source, sourceUrl: ih, metrics: [{ label: '掲載月間売上（報告値）', value: `US$${usd.toLocaleString('en-US')}`, isHighlight: true }, { label: '利益・原価', value: '未確認' }], evidenceLocator: { type: 'url', url: ih } };
  return { id, ticker, name: String(x.name).trim(), legalEntity: 'UNKNOWN (公開ディレクトリ情報のみ)', tagline: `「${target}」に対し「${t}」を提供。掲載月間売上は報告値で、利益は未確認。`, sector: sector(tags), scale: scale(tags), founder: 'UNKNOWN (公開ディレクトリでは個人名未確認)', country: 'GLOBAL', url: u, verifiedBadge: false, growthRateYoY: null, architecturePattern: 'UNKNOWN (実装方式は公開ディレクトリから未確認)', pipelineStack: 'UNKNOWN (技術構成は公開ディレクトリから未確認)', targetPainWallet: target, tags: [...tags.filter((z) => !z.startsWith('founders-') && !z.startsWith('employees-')).slice(0, 16), 'INDIE_HACKERS_REPORTED_REVENUE', 'FINANCIAL_PROFIT_UNKNOWN'], pnl: p, evidenceCards: [loot, { id: `${h.slice(12, 24)}-signal`, type: 'THE_CRIME', title: '売上表示と未開示範囲を分離して記録', badge: '報告値', evidenceStatus: 'REPORTED', punchline: reported, details: [`公式URLとして登録された掲載先: ${u}`, `開始時期の掲載値: ${x.startDateStr || '未確認'}。チーム規模・創業者名・利益は未確認。`, 'このカードは公開表示の記録であり、利益・成長率・原価を確定する証拠ではない。'], sourceNote: source, sourceUrl: ih, metrics: [{ label: '公開月間売上欄', value: `US$${usd.toLocaleString('en-US')}` }, { label: '利益', value: '未確認' }] }], operations: { teamSize: 0, isTeamSizeUnconfirmed: true, initialTeamSize: 0, currentTeamSize: 0, weeklyHours: 0, isWeeklyHoursUnconfirmed: true, initialCapitalRequired: 0, isCapitalUnconfirmed: true, automationLevel: 0, isAutomationUnconfirmed: true, primaryChannels: ['Indie Hackers product directory', ...platforms(tags)].slice(0, 4), toolStack: [] }, strategy: { blindspot: `公開説明が示す「${t}」という狭い課題への専門化。競合比較は未確認。`, moatType: 'UNKNOWN', moatDescription: '継続率、独自データ、供給制約などの防御要因は未確認。', incumbentDilemma: '大手との価格・機能・流通の比較は未確認。', secretInsight: `公開レコードから確定できるのは、${t}という提供表現と売上表示だけ。顧客獲得手法は未確認。`, initialTraction: [`掲載開始値: ${x.startDateStr || '未確認'}`, 'Indie Hackersの商品ディレクトリに掲載', '顧客獲得の初動手段は未確認'], actionPlaybook: [`課題を「${t}」の1つに限定し、有償性を検証する。`, '売上表示と利益を分離し、原価・経費・継続率の一次根拠を照合する。', '公式サイトの提供条件と第三者ディレクトリの表示を別々に保存する。'], coldOutreachTemplate: `「${t}」に関する作業で、現場が最も時間を失う箇所を15分だけ教えてください。公開されている提供内容と照合し、1つの改善案を返します。` }, temporal: { foundedYear: y, initialTractionPeriod: y ? `${y}年の掲載開始情報。初動獲得経路は未確認。` : '掲載開始時期・初動獲得経路は未確認。', dataSnapshotPeriod: `${SNAPSHOT}公開レコード`, viabilityStatus: y && y >= 2024 ? 'RISING_WAVE' : 'ACTIVE_PLAYBOOK', viabilityLabel: y && y >= 2024 ? '新しい掲載・収益表示あり' : '現行掲載で継続観測', eraContext: 'Indie Hackersの公開ディレクトリで、個人開発者が製品説明と収益表示を公開できる環境。', currentViabilityAnalysis: '掲載と売上表示は確認できるが、利益・継続性・法令順守・現在の稼働状況は別途一次情報で確認が必要。' }, observations: [`Indie Hackersの掲載説明は「${d}」。`, reported, `公開タグ: ${tags.slice(0, 12).join(', ') || 'なし'}。`, `公式URL: ${u}`, '利益、原価、創業者、チーム人数は未確認。'], observationsStream: [{ id: `${h.slice(24, 36)}-listing`, category: 'PRODUCT_LISTING', originType: 'reported', verificationStatus: 'SUPPORTED', text: `Indie Hackers listing: ${t}`, sourceUrl: ih, observedAt: SNAPSHOT }, { id: `${h.slice(36, 48)}-revenue`, category: 'FINANCIAL_SIGNAL', originType: 'reported', verificationStatus: 'UNCONFIRMED', text: reported, sourceUrl: ih, observedAt: SNAPSHOT }], essence: { whatItDoes: t, targetCustomer: '公開ディレクトリでは顧客属性の詳細未確認。', painRelief: d }, lootBlueprint: { targetPrey: target, structuralFlaw: `公開説明が示す未充足作業: ${d}`, stealthEntry: `Indie Hackers product directoryと公式URL（${u}）の組み合わせ。実際の獲得手法は未確認。`, tollGateSetup: `収益モデルの公開タグは「${m}」。料金・継続条件・原価は未確認。`, reproducibilityScore: null, moatDurabilityScore: null, capitalEfficiencyScore: null, executionChecklist: [`課題を「${t}」の1つに限定し、有償性を確認する。`, '売上表示と利益を分離し、原価・経費・継続率の一次根拠が取れるまでP&Lを確定しない。', '公式URLの提供条件とディレクトリ記録を同一IDで保存する。'] }, publishability: { status: 'CAPTURE', mode: 'reported-directory', notes: '公開ディレクトリの報告値を保存。利益・原価・人物情報は未確認。' }, unknownsNotes: ['公開月間売上欄は利益ではなく、独立監査済みかどうかも確定できない。', '原価、営業経費、営業利益、純利益、成長率は未確認。', '創業者名、法人名、国、チーム人数、技術スタックは未確認。'], screening: { winner: null, initialTeamPass: scale(tags) === 'SOLO' ? true : null, capitalStatus: tags.includes('funding-bootstrapped') ? 'reported_bootstrapped' : 'unknown', qualificationStatus: 'CAPTURE_REQUIRES_PRIMARY_FINANCIAL_RECONCILIATION', backgroundAndScaleCaveat: 'ディレクトリ表示を根拠にした候補記録。利益・自立性は未判定。' }, batchId: 'batch-indie-hackers-reported-20260916' };
};

const repairExistingBatch = async (pool, existing) => {
  const output = 'data/incoming/batch_indie_hackers_reported_1000_20260916.json';
  const current = JSON.parse(fs.readFileSync(output, 'utf8'));
  const external = incomingEntities(output);
  const externalNames = new Set(external.map((x) => norm(x.name)));
  const externalDomains = new Set(external.map((x) => domain(x.url)).filter(Boolean));
  const conflicts = current.filter((x) => externalNames.has(norm(x.name)) || externalDomains.has(domain(x.url)));
  const keep = current.filter((x) => !externalNames.has(norm(x.name)) && !externalDomains.has(domain(x.url)));
  const names = new Set(keep.map((x) => norm(x.name)));
  const domains = new Set(keep.map((x) => domain(x.url)));
  const tickers = new Set([...existing.tickers, ...keep.map((x) => String(x.ticker ?? '').toUpperCase())]);
  const replacements = [];
  for (const x of pool) {
    if (replacements.length >= conflicts.length) break;
    const nk = norm(x.name), dm = domain(x.websiteUrl), h = hash(`${x.productId ?? x.objectID}|${x.websiteUrl}`), tk = `IH${h.slice(0, 8).toUpperCase()}`;
    if (!nk || existing.names.has(nk) || names.has(nk) || externalNames.has(nk) || existing.domains.has(dm) || domains.has(dm) || externalDomains.has(dm) || tickers.has(tk) || checkDuplicate(x.name).exists) continue;
    try { claimTarget(x.name, AGENT, false); } catch { continue; }
    replacements.push(entity(x, tk, `ent_${norm(x.name).replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'product'}_${h.slice(0, 12)}`));
    names.add(nk); domains.add(dm); tickers.add(tk);
  }
  if (replacements.length !== conflicts.length) throw new Error(`Repair found ${conflicts.length} conflicts but only ${replacements.length} replacements.`);
  fs.writeFileSync(output, `${JSON.stringify([...keep, ...replacements], null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ repaired: conflicts.length, replaced: conflicts.map((x) => x.name), replacements: replacements.map((x) => x.name), count: keep.length + replacements.length }, null, 2));
};

const main = async () => {
  const dry = process.argv.includes('--dry-run'), repair = process.argv.includes('--repair'), existing = loadExisting(), pool = (await fetchPool()).filter(usable).sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0));
  if (repair) { await repairExistingBatch(pool, existing); return; }
  const selected = [], names = new Set(), domains = new Set(), tickers = new Set(existing.tickers), rejected = { duplicate: 0, claim: 0 };
  for (const x of pool) {
    if (selected.length >= 1000) break;
    const nk = norm(x.name), dm = domain(x.websiteUrl), h = hash(`${x.productId ?? x.objectID}|${x.websiteUrl}`), tk = `IH${h.slice(0, 8).toUpperCase()}`;
    if (!nk || existing.names.has(nk) || names.has(nk) || existing.domains.has(dm) || domains.has(dm) || tickers.has(tk) || checkDuplicate(x.name).exists) { rejected.duplicate++; continue; }
    if (!dry) { try { claimTarget(x.name, AGENT, false); } catch { rejected.claim++; continue; } }
    selected.push(entity(x, tk, `ent_${norm(x.name).replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'product'}_${h.slice(0, 12)}`)); names.add(nk); domains.add(dm); tickers.add(tk);
  }
  console.log(JSON.stringify({ pool: pool.length, selected: selected.length, rejected }, null, 2));
  if (dry) { console.log(JSON.stringify(selected.slice(0, 10).map((x) => ({ name: x.name, url: x.url, revenue: x.evidenceCards[0].metrics[0].value })), null, 2)); return; }
  if (selected.length !== 1000) throw new Error(`Only selected ${selected.length}/1000; no batch written.`);
  fs.writeFileSync('data/incoming/batch_indie_hackers_reported_1000_20260916.json', `${JSON.stringify(selected, null, 2)}\n`, 'utf8');
  console.log('wrote data/incoming/batch_indie_hackers_reported_1000_20260916.json');
};
main().catch((e) => { console.error(e?.stack || e); process.exitCode = 1; });
