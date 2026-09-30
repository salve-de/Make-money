/**
 * 再監査レーンA: 大手企業を SEC 公的開示（10-K / XBRL companyfacts）で引き直す（resource-from-sec v1）— 2026-09-29
 *
 * 対象: data/entities-index.json のうち reaudit.family === 'generated' かつ scale が ENTERPRISE / SCALEUP の記録。
 * 処理: (a) 対象一覧を保存 → (b) SEC company_tickers.json と名称・legalEntity・ticker の正規化一致で CIK を対応付け
 *       → (c) companyfacts から直近会計年度 10-K の売上・営業利益・純利益を取得 → (d) 候補生成（reaudit 契約）
 *       → (e) 25件ずつ data/incoming/reaudit-sec-batch-NNN-20260929.json へ保存 → validate-candidates を実行 → レポート出力。
 *
 * 守ること:
 *   - 読み取りのみ。data/entities-index.json は編集しない。R2・有料API・SEC以外の外部サービスへは触れない。
 *   - SEC Fair Access: 宣言済み User-Agent、10 req/s 未満。使うのは次の3系統だけ（robots.txt / API 方針の範囲内）。
 *       https://www.sec.gov/files/company_tickers.json
 *       https://data.sec.gov/submissions/ と https://data.sec.gov/api/xbrl/companyfacts/
 *       https://www.sec.gov/Archives/edgar/data/（robots.txt で Allow。10-K フォルダの存在確認のみ）
 *     /cgi-bin 配下（EDGAR 企業検索）は robots.txt で Disallow のため使わない。
 *   - 推計・按分・円換算は一切しない。取得できない指標は未確認のまま残し、理由を記録する。
 *
 * 使い方:
 *   node --import tsx scripts/reaudit/resource-from-sec.ts [--cache-dir <dir>] [--batch-size 25] [--refresh] [--offline] [--targets-only] [--skip-validate]
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';

type AnyRecord = Record<string, unknown>;

// ---------------------------------------------------------------------------
// 設定
// ---------------------------------------------------------------------------
const AUDIT_DATE = '2026-09-29';
const STAMP = '20260929';
const LANE = 'sec';
const AUDIT_OWNER = 'lane:A sec-resource agent';
const METHOD = 'SEC_XBRL_COMPANYFACTS_REAUDIT';
const SEC_USER_AGENT = 'MakeMoneyResearch/1.0 (contact: sato.business.0117@gmail.com)';
const MIN_INTERVAL_MS = 150; // 約 6.7 req/s（SEC の上限 10 req/s を下回る）
const REQUEST_TIMEOUT_MS = 60_000;
const TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const INDEX_PATH = join(REPO_ROOT, 'data/entities-index.json');
const TARGETS_PATH = join(REPO_ROOT, `reports/reaudit-sec-targets-${STAMP}.json`);
const PROGRESS_PATH = join(REPO_ROOT, 'reports/reaudit-sec-progress.json');
const REPORT_PATH = join(REPO_ROOT, `reports/reaudit-sec-${STAMP}.md`);
const VALIDATE_SCRIPT = join(REPO_ROOT, 'scripts/reaudit/validate-candidates.ts');
const batchPath = (n: number): string => join(REPO_ROOT, `data/incoming/reaudit-sec-batch-${String(n).padStart(3, '0')}-${STAMP}.json`);

const argv = process.argv.slice(2);
const flag = (name: string): boolean => argv.includes(`--${name}`);
const opt = (name: string): string | undefined => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : undefined; };
const CACHE_DIR = resolve(opt('cache-dir') ?? join(tmpdir(), 'reaudit-sec-cache'));
const BATCH_SIZE = Math.max(1, Number.parseInt(opt('batch-size') ?? '25', 10) || 25);

// 取得対象タグ（us-gaap）。売上は Revenues → RevenueFromContractWithCustomerExcludingAssessedTax → SalesRevenueNet の順。
const REVENUE_TAGS = ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet'] as const;
const OPERATING_TAG = 'OperatingIncomeLoss';
const NET_TAG = 'NetIncomeLoss';
const TARGET_TAGS: readonly string[] = [...REVENUE_TAGS, OPERATING_TAG, NET_TAG];
// 参考表示のみ（reportedMetrics には入れない）。別概念のため仕様タグの代替には使わない。
const NET_REFERENCE_TAGS = ['ProfitLoss', 'NetIncomeLossAvailableToCommonStockholdersBasic'] as const;
const REVENUE_REFERENCE_TAGS = ['RevenueFromContractWithCustomerIncludingAssessedTax', 'RevenuesNetOfInterestExpense', 'SalesRevenueGoodsNet', 'SalesRevenueServicesNet', 'InterestAndDividendIncomeOperating', 'NoninterestIncome'] as const;

// 上場廃止・破綻などで company_tickers.json に載らない提出者の CIK ヒント。実行時に data.sec.gov/submissions の登録名との一致で検証する。
const DELISTED_CIK_HINTS: Record<string, { cik: number; note: string }> = {
  ent_wework_landmine: { cik: 1813756, note: 'WeWork Inc.（旧 BowX Acquisition Corp.）。最後の 10-K が対象。' },
  ent_wework_A7K2P9QX: { cik: 1813756, note: '記録の主題は2019年の上場前夜。10-K は SPAC 合併後の WeWork Inc.（FY2021 以降）のみで、記録の時期とは別の期間。' },
  ent_case06_34177648949ad28ac68b: { cik: 1598674, note: 'Casper Sleep Inc.（2022年に非公開化）。最後の 10-K が対象。' },
  ent_moviepass_C9L5N1VK: { cik: 1040792, note: 'Helios & Matheson Analytics Inc.（MoviePass 運営）。最後の 10-K が対象。' },
  ent_svb_Z5M8Q2RL: { cik: 719739, note: 'SVB Financial Group（2023年破綻）。最後の 10-K が対象。' },
  ent_rtlnot_b0: { cik: 1475274, note: 'RetailMeNot, Inc.（2017年に買収）。最後の 10-K が対象。' },
};

// ブランド名のみの記録と、その親会社（SEC 提出者）のヒント。親会社の連結数値をブランドへ付けないため、対応付けはしない。
const PARENT_HINTS: Record<string, { parent: string; tickers: string[]; basis: string }> = {
  ent_solost_81: { parent: 'Solo Brands, Inc.', tickers: ['SBDS'], basis: '背景知識（Solo Stove は Solo Brands のブランド）。SEC 提出書類では未確認' },
  ent_mailchimp_B8Q3L6VZ: { parent: 'Intuit Inc.', tickers: ['INTU'], basis: '背景知識（2021年に Intuit が買収）。SEC 提出書類では未確認' },
  ent_capterra_fa23dd140c0caa384afd: { parent: 'Gartner, Inc.', tickers: ['IT'], basis: 'カタログ legalEntity の括弧表記（Gartner）' },
  ent_case06_3af472ae9a147b0a577d: { parent: 'Unilever PLC', tickers: ['UL'], basis: 'カタログ legalEntity の括弧表記（Unilever）。Unilever は 20-F 提出者' },
  ent_advertisecast_6cba2705cddf4bd57111: { parent: 'Liberated Syndication Inc. (Libsyn)', tickers: ['LSYN'], basis: 'カタログ legalEntity の括弧表記（Libsyn）' },
  ent_wikiby_ab: { parent: 'Capital One Financial Corporation', tickers: ['COF'], basis: '背景知識（Wikibuy は Capital One が買収）。SEC 提出書類では未確認' },
  ent_honey_a8: { parent: 'PayPal Holdings, Inc.', tickers: ['PYPL'], basis: '背景知識（2020年に PayPal が買収）。SEC 提出書類では未確認' },
  ent_tile_tg_89: { parent: 'Life360, Inc.', tickers: ['LIF'], basis: '背景知識（2021年に Life360 が買収）。SEC 提出書類では未確認' },
  ent_ebates_ac: { parent: 'Rakuten Group, Inc.（日本）', tickers: [], basis: '背景知識（Ebates は楽天グループが買収）。SEC 10-K 提出者ではない' },
};

// ---------------------------------------------------------------------------
// 小さな道具
// ---------------------------------------------------------------------------
const asRec = (v: unknown): AnyRecord => (v && typeof v === 'object' && !Array.isArray(v) ? (v as AnyRecord) : {});
const asArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : d);
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const cik10 = (cik: number): string => String(cik).padStart(10, '0');
const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const writeJson = (path: string, value: unknown): void => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(value, null, 2), 'utf8'); };
const fmtUsd = (v: number): string => `${v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString('en-US')}`;
const daysInclusive = (start: string, end: string): number => Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
const mdCell = (s: unknown): string => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

// ---------------------------------------------------------------------------
// 進捗（reports/reaudit-sec-progress.json）
// ---------------------------------------------------------------------------
const startedAt = new Date().toISOString();
const progress: AnyRecord = {
  lane: 'A', task: 'sec-resource', script: 'scripts/reaudit/resource-from-sec.ts', startedAt, updatedAt: startedAt,
  stage: 'init', done: false, counts: {}, entities: {} as Record<string, AnyRecord>, errors: [] as string[], outputs: [] as string[],
};
function saveProgress(stage?: string, patch?: AnyRecord): void {
  if (stage) progress.stage = stage;
  if (patch) {
    const { counts, ...rest } = patch;
    Object.assign(progress, rest);
    if (counts && typeof counts === 'object') progress.counts = { ...asRec(progress.counts), ...(counts as AnyRecord) };
  }
  progress.updatedAt = new Date().toISOString();
  writeJson(PROGRESS_PATH, progress);
}
function noteEntity(id: string, patch: AnyRecord): void {
  const entities = progress.entities as Record<string, AnyRecord>;
  entities[id] = { ...(entities[id] ?? {}), ...patch };
}
function noteError(message: string): void { (progress.errors as string[]).push(message); }

// ---------------------------------------------------------------------------
// SEC HTTP（間隔制御・再試行1回・キャッシュ）
// ---------------------------------------------------------------------------
interface HttpResult { ok: boolean; status: number; body: string; error?: string; fromCache: boolean; fetchedAt: string }
const httpStats = { network: 0, cached: 0, failed: 0, bytes: 0 };
let lastRequestAt = 0;
async function pace(): Promise<void> {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt = Date.now();
}
async function secGet(url: string, cacheName: string): Promise<HttpResult> {
  const cacheFile = join(CACHE_DIR, cacheName);
  if (!flag('refresh') && existsSync(cacheFile)) {
    httpStats.cached += 1;
    return { ok: true, status: 200, body: readFileSync(cacheFile, 'utf8'), fromCache: true, fetchedAt: statSync(cacheFile).mtime.toISOString() };
  }
  if (flag('offline')) return { ok: false, status: 0, body: '', error: 'OFFLINE_CACHE_MISS', fromCache: false, fetchedAt: '' };
  let last: HttpResult = { ok: false, status: 0, body: '', error: 'NOT_ATTEMPTED', fromCache: false, fetchedAt: '' };
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await pace();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    let retryable = true;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': SEC_USER_AGENT, Accept: '*/*' }, signal: ctrl.signal, redirect: 'follow' });
      const body = await res.text();
      httpStats.network += 1;
      httpStats.bytes += Buffer.byteLength(body);
      if (res.ok) {
        mkdirSync(CACHE_DIR, { recursive: true });
        writeFileSync(cacheFile, body, 'utf8');
        return { ok: true, status: res.status, body, fromCache: false, fetchedAt: new Date().toISOString() };
      }
      last = { ok: false, status: res.status, body: '', error: `HTTP ${res.status}`, fromCache: false, fetchedAt: new Date().toISOString() };
      retryable = res.status === 429 || res.status === 408 || res.status >= 500; // 404 などの恒久的な失敗は再試行しない
    } catch (err) {
      last = { ok: false, status: 0, body: '', error: errMsg(err), fromCache: false, fetchedAt: new Date().toISOString() };
    } finally {
      clearTimeout(timer);
    }
    if (!retryable || attempt === 2) break;
    await sleep(2_000);
  }
  httpStats.failed += 1;
  return last;
}

// ---------------------------------------------------------------------------
// 対象抽出
// ---------------------------------------------------------------------------
interface Target {
  id: string; name: string; legalEntity: string; ticker: string; scale: string; country: string; sector: string;
  officialUrl: string; financialStatusBefore: string; batchId: string;
}
const isTargetRecord = (e: AnyRecord): boolean => asRec(e.reaudit).family === 'generated' && (e.scale === 'ENTERPRISE' || e.scale === 'SCALEUP');
function toTarget(e: AnyRecord): Target {
  return {
    id: str(e.id), name: str(e.name), legalEntity: str(e.legalEntity), ticker: str(e.ticker), scale: str(e.scale), country: str(e.country),
    sector: str(e.sector), officialUrl: str(e.officialUrl) || str(e.url), financialStatusBefore: str(asRec(e.pnl).financialStatus), batchId: str(e.batchId),
  };
}

// ---------------------------------------------------------------------------
// 名称の正規化と対応付け
// ---------------------------------------------------------------------------
const CORP_SUFFIX = new Set(['inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'ltd', 'limited', 'llc', 'lp', 'llp', 'plc', 'ag', 'sa', 'nv', 'oy', 'gmbh', 'pte', 'pty', 'kk', 'de', 'new', 'the']);
const COMPANY_FORM = /\b(inc|incorporated|corp|corporation|co|company|ltd|limited|llc|lp|llp|plc|ag|sa|nv|oy|gmbh|pte|pty)\b|株式会社|有限会社|合同会社/i;
function baseName(s: string): string {
  return s.normalize('NFKC').toLowerCase()
    .replace(/\s*\/\s*[a-z]{2,4}\/?\s*$/, '') // SEC 表記の州コード（/NEW, /DE/ など）
    .replace(/&/g, ' and ')
    .replace(/[’'`´]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
function stripSuffix(s: string): string {
  const t = s.split(' ').filter(Boolean);
  while (t.length > 1 && CORP_SUFFIX.has(t[t.length - 1])) t.pop();
  while (t.length > 1 && t[0] === 'the') t.shift();
  return t.join(' ');
}
const nameKey = (s: string): string => stripSuffix(baseName(s));
/** name / legalEntity から照合用の名称キーを作る。括弧内は親会社やブランドを含むため使わない。人名列の legalEntity は使わない。 */
function aliasKeys(t: Target): string[] {
  const raws: string[] = [t.name];
  if (t.legalEntity && COMPANY_FORM.test(t.legalEntity)) raws.push(t.legalEntity);
  const keys = new Set<string>();
  for (const raw of raws) {
    for (const part of raw.replace(/\([^)]*\)|（[^）]*）/g, ' ').split(/\s\/\s/)) {
      const k = nameKey(part);
      if (k.replace(/ /g, '').length >= 4) keys.add(k);
    }
  }
  return [...keys];
}

interface SecTicker { cik: number; ticker: string; title: string }
interface TickerIndex { all: SecTicker[]; byName: Map<string, SecTicker[]>; byTicker: Map<string, SecTicker> }
function buildTickerIndex(raw: unknown): TickerIndex {
  const all: SecTicker[] = Object.values(asRec(raw)).map((v) => { const r = asRec(v); return { cik: Number(r.cik_str), ticker: str(r.ticker), title: str(r.title) }; })
    .filter((s) => Number.isFinite(s.cik) && s.ticker && s.title);
  const byName = new Map<string, SecTicker[]>();
  const byTicker = new Map<string, SecTicker>();
  for (const s of all) {
    const k = nameKey(s.title).replace(/ /g, '');
    byName.set(k, [...(byName.get(k) ?? []), s]);
    if (!byTicker.has(s.ticker.toUpperCase())) byTicker.set(s.ticker.toUpperCase(), s);
  }
  return { all, byName, byTicker };
}

type SecClass = 'MATCHED' | 'UNMATCHED' | 'NOT_SEC';
interface MatchResult {
  id: string; secStatus: SecClass; detail: string; method: string | null; confidence: 'HIGH' | 'MEDIUM' | null;
  cik: number | null; secTitle: string | null; secTicker: string | null; candidates: SecTicker[]; notes: string[];
}
const emptyMatch = (id: string, secStatus: SecClass, detail: string): MatchResult => ({ id, secStatus, detail, method: null, confidence: null, cik: null, secTitle: null, secTicker: null, candidates: [], notes: [] });

function matchTarget(t: Target, idx: TickerIndex): MatchResult {
  const keys = aliasKeys(t);
  const uniqueByCik = (list: SecTicker[]): SecTicker[] => [...new Map(list.map((s) => [s.cik, s])).values()];
  // 1) 正規化した名称の完全一致（SEC の登録名と一致し、CIK が一意）
  const nameHits = uniqueByCik(keys.flatMap((k) => idx.byName.get(k.replace(/ /g, '')) ?? []));
  if (nameHits.length === 1) {
    const s = nameHits[0];
    return { ...emptyMatch(t.id, 'MATCHED', 'NAME_EXACT'), method: 'NAME_EXACT', confidence: 'HIGH', cik: s.cik, secTitle: s.title, secTicker: s.ticker };
  }
  if (nameHits.length > 1) {
    return { ...emptyMatch(t.id, 'UNMATCHED', 'AMBIGUOUS_MULTIPLE_CIK: 同じ正規化名が複数の CIK に該当'), candidates: nameHits.slice(0, 5) };
  }
  // 2) ticker の一致 + 名称の先頭語の一致（ticker だけでは対応付けない）
  const tk = t.ticker ? idx.byTicker.get(t.ticker.toUpperCase()) : undefined;
  if (tk) {
    const secFirst = nameKey(tk.title).split(' ')[0];
    if (secFirst.length >= 3 && keys.some((k) => k.split(' ')[0] === secFirst)) {
      return { ...emptyMatch(t.id, 'MATCHED', 'TICKER_AND_NAME_PREFIX'), method: 'TICKER_AND_NAME_PREFIX', confidence: 'MEDIUM', cik: tk.cik, secTitle: tk.title, secTicker: tk.ticker,
        notes: [`ticker ${tk.ticker} 一致 + 名称の先頭語 "${secFirst}" 一致。SEC 登録名は "${tk.title}"（カタログ名: ${t.name}）`] };
    }
  }
  // 3) あいまい候補（一方の名称語が他方の先頭語列）。決定はせず UNMATCHED
  const fuzzy: SecTicker[] = [];
  for (const k of keys) {
    const kt = k.split(' ');
    if (kt[0].length < 4) continue;
    for (const s of idx.all) {
      const st = nameKey(s.title).split(' ');
      const n = Math.min(kt.length, st.length);
      if (kt.slice(0, n).join(' ') === st.slice(0, n).join(' ')) fuzzy.push(s);
    }
  }
  const fuzzyUnique = uniqueByCik(fuzzy).slice(0, 5);
  const notes: string[] = [];
  if (tk) notes.push(`ticker ${tk.ticker} は "${tk.title}" と衝突するが名称が異なるため採用しない`);
  const parent = PARENT_HINTS[t.id];
  if (parent) {
    const found = parent.tickers.map((x) => idx.byTicker.get(x)).filter((x): x is SecTicker => Boolean(x));
    notes.push(`親会社ヒント: ${parent.parent}${found.length ? `（SEC: ${found.map((f) => `${f.ticker} CIK ${cik10(f.cik)} "${f.title}"`).join(', ')}）` : '（SEC ティッカーファイルに該当なし）'} / 根拠: ${parent.basis}。ブランド単体の数値は親会社の連結数値と同じではないため対応付けない`);
    return { ...emptyMatch(t.id, 'UNMATCHED', 'BRAND_UNDER_PARENT: 親会社は SEC 提出者の可能性。ブランド単体の開示は別'), candidates: [...found, ...fuzzyUnique].slice(0, 5), notes };
  }
  if (fuzzyUnique.length) {
    return { ...emptyMatch(t.id, 'UNMATCHED', 'AMBIGUOUS_NAME_PREFIX: 名称の一部が SEC 登録名と重なるが同一とは断定できない'), candidates: fuzzyUnique, notes };
  }
  // 4) 該当なし
  if (t.country === 'JP') return { ...emptyMatch(t.id, 'NOT_SEC', 'JAPAN_COMPANY: SEC 提出者ではない（公的開示があれば EDINET / TDnet。このレーンの対象外）'), notes };
  if (t.country !== 'US') return { ...emptyMatch(t.id, 'NOT_SEC', `NON_US_COMPANY(${t.country || '?'}): SEC ティッカーファイルに該当なし`), notes };
  return { ...emptyMatch(t.id, 'NOT_SEC', 'US_NO_SEC_TICKER_ENTRY: SEC ティッカーファイルに該当なし（非上場・上場廃止・ブランド名のみの可能性。未検証）'), notes };
}

// ---------------------------------------------------------------------------
// 提出者情報（submissions）と抽出
// ---------------------------------------------------------------------------
interface SubmissionsInfo {
  name: string; formerNames: string[]; sic: string; sicDescription: string; tickers: string[]; exchanges: string[]; stateOfIncorporation: string;
  fiscalYearEnd: string; recent: { accn: string; form: string; reportDate: string; filingDate: string; primaryDocument: string }[]; fetchedAt: string; fromCache: boolean;
}
async function loadSubmissions(cik: number): Promise<SubmissionsInfo | { error: string }> {
  const res = await secGet(`https://data.sec.gov/submissions/CIK${cik10(cik)}.json`, `submissions-CIK${cik10(cik)}.json`);
  if (!res.ok) return { error: `submissions ${res.error ?? res.status}` };
  try {
    const j = asRec(JSON.parse(res.body));
    const recent = asRec(asRec(j.filings).recent);
    const forms = asArr(recent.form); const accns = asArr(recent.accessionNumber); const rep = asArr(recent.reportDate); const fil = asArr(recent.filingDate); const prim = asArr(recent.primaryDocument);
    return {
      name: str(j.name), formerNames: asArr(j.formerNames).map((n) => str(asRec(n).name)).filter(Boolean), sic: str(j.sic), sicDescription: str(j.sicDescription),
      tickers: asArr(j.tickers).map((x) => str(x)).filter(Boolean), exchanges: asArr(j.exchanges).map((x) => str(x)).filter(Boolean), stateOfIncorporation: str(j.stateOfIncorporation),
      fiscalYearEnd: str(j.fiscalYearEnd), fetchedAt: res.fetchedAt, fromCache: res.fromCache,
      recent: accns.map((a, i) => ({ accn: str(a), form: str(forms[i]), reportDate: str(rep[i]), filingDate: str(fil[i]), primaryDocument: str(prim[i]) })),
    };
  } catch (err) { return { error: `submissions parse: ${errMsg(err)}` }; }
}

interface FactEntry { start?: string; end: string; val: number; accn: string; fy?: number; fp?: string; form: string; filed: string }
interface FactPick { tag: string; value: number; start: string; end: string; fy: number; fp: string; form: string; filed: string; accn: string }
interface RefValue { tag: string; value: number }
interface MissingMetric { metric: 'revenue' | 'operatingIncome' | 'netIncome'; reason: string; references: RefValue[] }
interface Anchor { start: string; end: string; days: number; fy: number; fp: string; form: string; filed: string; accn: string }
interface CandidateInfo { cik: number; sic: string; sicDescription: string; keyForms: string[]; exchanges: string[]; stateOfIncorporation: string; error?: string }
interface Extraction {
  cik: number; entityName: string; status: 'OK' | 'NO_10K_ANNUAL_FACTS' | 'NO_TARGET_METRICS'; statusNote: string; formsSeen: string[]; taxonomies: string[];
  anchor: Anchor | null; revenue: (FactPick & { alternates: RefValue[]; alternatesDiffer: boolean }) | null; operatingIncome: FactPick | null; netIncome: FactPick | null;
  missing: MissingMetric[]; notes: string[];
}

function isAnnual10K(e: FactEntry): boolean {
  return e.form === '10-K' && e.fp === 'FY' && typeof e.start === 'string' && Number.isFinite(e.val)
    && daysInclusive(e.start, e.end) >= 350 && daysInclusive(e.start, e.end) <= 380;
}
function usdEntries(usGaap: AnyRecord, tag: string): FactEntry[] {
  return asArr(asRec(asRec(asRec(usGaap[tag]).units)).USD).map((x) => {
    const r = asRec(x);
    return { start: typeof r.start === 'string' ? r.start : undefined, end: str(r.end), val: Number(r.val), accn: str(r.accn), fy: typeof r.fy === 'number' ? r.fy : undefined, fp: typeof r.fp === 'string' ? r.fp : undefined, form: str(r.form), filed: str(r.filed) };
  });
}
function isFinancialSic(sic: string): boolean { const n = Number.parseInt(sic, 10); return Number.isFinite(n) && n >= 6000 && n < 6500; }

function extractAnnual(cik: number, factsJson: AnyRecord, sub: SubmissionsInfo | null): Extraction {
  const factsRoot = asRec(factsJson.facts);
  const taxonomies = Object.keys(factsRoot);
  const usGaap = asRec(factsRoot['us-gaap']);
  const formSet = new Set<string>();
  for (const tax of taxonomies) for (const concept of Object.values(asRec(factsRoot[tax]))) for (const arr of Object.values(asRec(asRec(concept).units))) for (const x of asArr(arr)) formSet.add(str(asRec(x).form));
  const formsSeen = [...formSet].filter(Boolean).sort();
  const base = { cik, entityName: str(factsJson.entityName), formsSeen, taxonomies, anchor: null, revenue: null, operatingIncome: null, netIncome: null, missing: [] as MissingMetric[], notes: [] as string[] };

  const annual = (tag: string): FactEntry[] => usdEntries(usGaap, tag).filter(isAnnual10K);
  const cands = TARGET_TAGS.flatMap((tag) => annual(tag).map((e) => ({ tag, e })));
  if (cands.length === 0) {
    const why = formSet.has('10-K')
      ? '10-K の年次 USD 値が指定タグに無い（報告通貨が USD 以外、または別タグ）'
      : `10-K の提出が companyfacts に無い（提出様式: ${formsSeen.join(', ') || 'なし'}）。20-F / 40-F の外国民間発行体は IFRS 等で別処理が必要`;
    return { ...base, status: 'NO_10K_ANNUAL_FACTS', statusNote: why };
  }
  // アンカー: 指定5タグの年次 10-K 値のうち最も新しい期間末。その期間を含む提出（accession）を、含まれるタグ数が多く、提出日が新しいものに固定する。
  const maxEnd = cands.reduce((m, c) => (c.e.end > m ? c.e.end : m), '');
  const atMax = cands.filter((c) => c.e.end === maxEnd);
  const score = new Map<string, { tags: Set<string>; filed: string }>();
  for (const c of atMax) { const s = score.get(c.e.accn) ?? { tags: new Set<string>(), filed: c.e.filed }; s.tags.add(c.tag); if (c.e.filed > s.filed) s.filed = c.e.filed; score.set(c.e.accn, s); }
  const accn = [...score.entries()].sort((a, b) => b[1].tags.size - a[1].tags.size || (b[1].filed > a[1].filed ? 1 : -1))[0][0];
  const notes: string[] = [];
  if (score.size > 1) notes.push(`同じ期間末に複数の 10-K accession（${[...score.keys()].join(', ')}）。タグ数と提出日で ${accn} を採用`);

  const pickTag = (tag: string): { kind: 'ok'; pick: FactPick } | { kind: 'none' } | { kind: 'ambiguous'; values: number[] } => {
    const es = annual(tag).filter((e) => e.end === maxEnd && e.accn === accn);
    if (es.length === 0) return { kind: 'none' };
    const vals = [...new Set(es.map((e) => e.val))];
    if (vals.length > 1) return { kind: 'ambiguous', values: vals };
    const e = es[0];
    return { kind: 'ok', pick: { tag, value: e.val, start: e.start ?? '', end: e.end, fy: e.fy ?? Number(e.end.slice(0, 4)), fp: e.fp ?? 'FY', form: e.form, filed: e.filed, accn: e.accn } };
  };
  const refs = (tags: readonly string[]): RefValue[] => tags.flatMap((tag) => {
    const es = usdEntries(usGaap, tag).filter((e) => e.form === '10-K' && e.fp === 'FY' && e.end === maxEnd && e.accn === accn && typeof e.start === 'string' && daysInclusive(e.start, e.end) >= 350 && daysInclusive(e.start, e.end) <= 380);
    return es.length ? [{ tag, value: es[0].val }] : [];
  });

  const missing: MissingMetric[] = [];
  let revenue: Extraction['revenue'] = null;
  const financial = sub ? isFinancialSic(sub.sic) : false;
  if (financial) {
    missing.push({ metric: 'revenue', reason: `金融業（SIC ${sub?.sic} ${sub?.sicDescription}）: 指定の売上タグは総収益を表さない（顧客との契約による収益は手数料収入の一部のみ）ため取得しない`, references: refs([...REVENUE_TAGS, ...REVENUE_REFERENCE_TAGS]) });
  } else {
    for (const tag of REVENUE_TAGS) {
      const r = pickTag(tag);
      if (r.kind === 'ambiguous') { notes.push(`${tag} は同じ期間・accession に複数の値（${r.values.join(', ')}）があるため採用しない`); continue; }
      if (r.kind === 'none') continue;
      const alternates = REVENUE_TAGS.filter((x) => x !== tag).map((x) => ({ x, r: pickTag(x) })).flatMap((y) => (y.r.kind === 'ok' ? [{ tag: y.x, value: y.r.pick.value }] : []));
      revenue = { ...r.pick, alternates, alternatesDiffer: alternates.some((a) => a.value !== r.pick.value) };
      break;
    }
    if (!revenue) missing.push({ metric: 'revenue', reason: '指定の売上タグ（Revenues / RevenueFromContractWithCustomerExcludingAssessedTax / SalesRevenueNet）に当期の値が無い', references: refs(REVENUE_REFERENCE_TAGS) });
  }
  const op = pickTag(OPERATING_TAG);
  const net = pickTag(NET_TAG);
  if (op.kind !== 'ok') missing.push({ metric: 'operatingIncome', reason: op.kind === 'ambiguous' ? `${OPERATING_TAG} が同期間に複数の値` : `指定タグ ${OPERATING_TAG} に当期の値が無い`, references: [] });
  if (net.kind !== 'ok') missing.push({ metric: 'netIncome', reason: net.kind === 'ambiguous' ? `${NET_TAG} が同期間に複数の値` : `指定タグ ${NET_TAG} に当期の値が無い`, references: refs(NET_REFERENCE_TAGS) });
  const amendedValues = (p: FactPick | null): void => {
    if (!p) return;
    const diffs = usdEntries(usGaap, p.tag).filter((e) => e.form === '10-K/A' && e.end === p.end && typeof e.start === 'string' && daysInclusive(e.start, e.end) >= 350 && daysInclusive(e.start, e.end) <= 380 && e.val !== p.value).map((e) => e.val);
    if (diffs.length) notes.push(`10-K/A に異なる値あり: us-gaap:${p.tag} 原本 ${fmtUsd(p.value)} / 訂正版 ${[...new Set(diffs)].map(fmtUsd).join(', ')}（原本 10-K の値を採用）`);
  };
  amendedValues(revenue); amendedValues(op.kind === 'ok' ? op.pick : null); amendedValues(net.kind === 'ok' ? net.pick : null);
  if (revenue?.alternatesDiffer) notes.push(`売上の他タグと値が異なる: 採用 ${revenue.tag}=${fmtUsd(revenue.value)} / ${revenue.alternates.map((a) => `${a.tag}=${fmtUsd(a.value)}`).join(', ')}`);

  const firstPick = revenue ?? (op.kind === 'ok' ? op.pick : null) ?? (net.kind === 'ok' ? net.pick : null);
  const first = cands.find((c) => c.e.end === maxEnd && c.e.accn === accn)?.e;
  const anchor: Anchor | null = firstPick ? { start: firstPick.start, end: firstPick.end, days: daysInclusive(firstPick.start, firstPick.end), fy: firstPick.fy, fp: firstPick.fp, form: firstPick.form, filed: firstPick.filed, accn }
    : first && first.start ? { start: first.start, end: first.end, days: daysInclusive(first.start, first.end), fy: first.fy ?? Number(first.end.slice(0, 4)), fp: first.fp ?? 'FY', form: first.form, filed: first.filed, accn } : null;
  return {
    ...base, anchor, revenue, operatingIncome: op.kind === 'ok' ? op.pick : null, netIncome: net.kind === 'ok' ? net.pick : null, missing, notes,
    status: revenue || op.kind === 'ok' || net.kind === 'ok' ? 'OK' : 'NO_TARGET_METRICS',
    statusNote: revenue || op.kind === 'ok' || net.kind === 'ok' ? '' : '10-K は存在するが、指定タグ（売上・営業利益・純利益）の当期の値が取れない',
  };
}

interface CrossCheck { found: boolean; form: string; reportDate: string; filingDate: string; primaryDocument: string; latest10K: string; newerTenKExists: boolean; amendmentForSamePeriod: boolean; amendments: { accn: string; filingDate: string }[]; warnings: string[] }
function crossCheck(anchor: Anchor, sub: SubmissionsInfo | null): CrossCheck {
  const out: CrossCheck = { found: false, form: '', reportDate: '', filingDate: '', primaryDocument: '', latest10K: '', newerTenKExists: false, amendmentForSamePeriod: false, amendments: [], warnings: [] };
  if (!sub) { out.warnings.push('submissions を取得できず相互確認なし'); return out; }
  const hit = sub.recent.find((r) => r.accn === anchor.accn);
  const tenKs = sub.recent.filter((r) => r.form === '10-K').sort((a, b) => (a.filingDate < b.filingDate ? 1 : -1));
  out.latest10K = tenKs[0]?.accn ?? '';
  out.newerTenKExists = Boolean(tenKs[0] && tenKs[0].accn !== anchor.accn && tenKs[0].filingDate > anchor.filed);
  out.amendments = sub.recent.filter((r) => r.form === '10-K/A' && r.reportDate === anchor.end).map((r) => ({ accn: r.accn, filingDate: r.filingDate }));
  out.amendmentForSamePeriod = out.amendments.length > 0;
  if (hit) {
    Object.assign(out, { found: true, form: hit.form, reportDate: hit.reportDate, filingDate: hit.filingDate, primaryDocument: hit.primaryDocument });
    if (hit.form !== '10-K') out.warnings.push(`submissions 上の様式が ${hit.form}（10-K ではない）`);
    if (hit.reportDate && hit.reportDate !== anchor.end) out.warnings.push(`submissions の報告期間末 ${hit.reportDate} が facts の期間末 ${anchor.end} と不一致`);
    if (hit.filingDate && hit.filingDate !== anchor.filed) out.warnings.push(`submissions の提出日 ${hit.filingDate} が facts の提出日 ${anchor.filed} と不一致`);
  } else out.warnings.push('この accession は submissions の直近一覧に無い（古い提出のため）。相互確認は facts のみ');
  if (out.newerTenKExists) out.warnings.push(`submissions に、より新しい 10-K（${tenKs[0].accn}, 提出 ${tenKs[0].filingDate}）がある。companyfacts が古い可能性`);
  if (out.amendmentForSamePeriod) out.warnings.push(`同じ期間に 10-K/A が存在する（${out.amendments.map((a) => `${a.accn}, 提出 ${a.filingDate}`).join(' / ')}）。本抽出は原本 10-K のみ`);
  return out;
}

// ---------------------------------------------------------------------------
// 候補生成
// ---------------------------------------------------------------------------
// 旧表示のタグ・タグラインに残っている金額表現（出典なし）。書き換えはせず、reaudit.conflicts に記録して人が判断できるようにする。
const MONEY_CLAIM = /[0-9０-９][0-9０-９,.]*\s?(?:兆|億|万|千)?\s?(?:円|ドル|USD)|[0-9０-９]+\s?(?:兆|億)|年商|月商|評価額|数(?:兆|億|千万|百万|万)円|[¥$€£]\s?[0-9]/;
function legacyMoneyClaims(base: AnyRecord): string[] {
  const out: string[] = [];
  for (const t of asArr(base.tags).map((x) => str(x)).filter(Boolean)) if (MONEY_CLAIM.test(t)) out.push(`タグ「${t}」`);
  const tagline = str(base.tagline);
  if (MONEY_CLAIM.test(tagline)) out.push(`タグライン「${tagline.length > 60 ? `${tagline.slice(0, 59)}…` : tagline}」`);
  return out;
}

interface BuildInput { base: AnyRecord; match: MatchResult; ex: Extraction; sub: SubmissionsInfo | null; cc: CrossCheck; archive: { url: string; status: number; ok: boolean; checkedAt: string }; tickersMeta: AnyRecord; hintNote: string }

function buildCandidate(input: BuildInput): AnyRecord {
  const { base, match, ex, sub, cc, archive, tickersMeta, hintNote } = input;
  const anchor = ex.anchor as Anchor;
  const id = str(base.id);
  const cikStr = cik10(ex.cik);
  const factsUrl = `https://data.sec.gov/api/xbrl/companyfacts/CIK${cikStr}.json`;
  const basePnl = asRec(base.pnl);
  const baseReaudit = asRec(base.reaudit);
  const fy = anchor.fy;
  const periodText = (p: { start: string; end: string }): string => `${p.start}〜${p.end}`;
  const status = str(basePnl.financialStatus) === 'POST_MORTEM' ? 'POST_MORTEM' : 'REPORTED'; // 破綻事例の区分は honest-rebuild と同じく維持する

  const metrics: AnyRecord[] = [];
  const addMetric = (unit: string, p: FactPick): void => {
    metrics.push({
      original: fmtUsd(p.value), currency: 'USD', amount: p.value, unit, source: 'sec-companyfacts',
      context: `us-gaap:${p.tag}, ${periodText(p)}, 10-K FY${p.fy}, filed ${p.filed}, accn ${p.accn}`,
      taxonomyTag: `us-gaap:${p.tag}`, periodStart: p.start, periodEnd: p.end, fiscalYear: p.fy, form: p.form, filed: p.filed, accession: p.accn, sourceUrl: archive.url,
    });
  };
  if (ex.revenue) addMetric('ANNUAL_REVENUE', ex.revenue);
  if (ex.operatingIncome) addMetric('ANNUAL_OPERATING_INCOME', ex.operatingIncome);
  if (ex.netIncome) addMetric('ANNUAL_NET_INCOME', ex.netIncome);

  const revenueLabel = ex.revenue
    ? `SEC 10-K FY${fy}: Revenue ${fmtUsd(ex.revenue.value)}（USD, 期間 ${periodText(ex.revenue)}）`
    : `SEC 10-K FY${fy}: Revenue は指定タグに当期の値なし（営業利益・純利益は reportedMetrics 参照）`;
  const snapshot = `SEC 10-K FY${fy}（期間末 ${anchor.end}、提出 ${anchor.filed}）`;

  const line = (label: string, p: FactPick | null, miss: MissingMetric | undefined): string => {
    if (p) return `${label}（us-gaap:${p.tag}）: ${fmtUsd(p.value)}（USD、${periodText(p)}）`;
    const refText = miss && miss.references.length ? `。参考（reportedMetrics 対象外・別概念）: ${miss.references.map((r) => `${r.tag} = ${fmtUsd(r.value)}`).join(' / ')}` : '';
    return `${label}: 取得せず（${miss?.reason ?? '該当なし'}）${refText}`;
  };
  const missOf = (m: MissingMetric['metric']): MissingMetric | undefined => ex.missing.find((x) => x.metric === m);
  const details: string[] = [
    line('売上', ex.revenue, missOf('revenue')),
    line('営業利益', ex.operatingIncome, missOf('operatingIncome')),
    line('純利益', ex.netIncome, missOf('netIncome')),
    `様式 10-K / FY${fy} / 期間 ${periodText(anchor)} / 提出 ${anchor.filed} / accession ${anchor.accn} / CIK ${cikStr}`,
  ];
  if (ex.revenue && ex.revenue.tag !== 'Revenues') details.push(`売上タグは ${ex.revenue.tag}。連結の総収益と一致しない企業があるため、10-K 本文で確認するまで総収益とは断定しない`);
  if (ex.revenue?.alternatesDiffer) details.push(`注意: 他の売上タグと値が異なる（${ex.revenue.alternates.map((a) => `${a.tag} = ${fmtUsd(a.value)}`).join(' / ')}）`);
  if (cc.primaryDocument) details.push(`本文: https://www.sec.gov/Archives/edgar/data/${ex.cik}/${anchor.accn.replace(/-/g, '')}/${cc.primaryDocument}`);
  if (anchor.end < '2025-01-01') details.push(`注意: companyfacts 上の最新の 10-K は FY${fy}（期間末 ${anchor.end}）。現在の業績を示すものではない`);
  if (hintNote) details.push(`補足: ${hintNote}`);
  details.push('推計・月次按分・円換算はしていない。月次のP&L数値は未確認のまま');
  details.push(`確認日: ${AUDIT_DATE} / 権利: SEC EDGAR 公的記録（Tier 1）。事実のみ表示し、原文は転載しない`);

  const got = [ex.revenue && '売上', ex.operatingIncome && '営業利益', ex.netIncome && '純利益'].filter(Boolean).join('・');
  const secCard: AnyRecord = {
    id: `${id}_reaudit_source_sec_10k`, type: 'UNKNOWN_AUDIT', title: '出典: SEC 10-K（XBRL companyfacts）', badge: '出典', evidenceStatus: 'REPORTED',
    punchline: `SEC提出の10-K（FY${fy}、期間末 ${anchor.end}、提出 ${anchor.filed}）から${got}の年次報告値を取得。月次換算・円換算はしていない。`,
    details, url: archive.url,
    sourceNote: `SEC EDGAR CIK ${cikStr} / 10-K accession ${anchor.accn} / companyfacts API ${factsUrl} / rights: Tier 1 public record`, sourceClass: 'PRIMARY',
  };
  const keptCards = asArr(base.evidenceCards).filter((c) => !/_reaudit_no_source$/.test(str(asRec(c).id))); // 「出典が記録されていない」カードは SEC 出典追加後は事実と合わない
  const evidenceCards = [secCard, ...keptCards.filter((c) => str(asRec(c).id) !== secCard.id)];

  const secSources: AnyRecord[] = [
    { url: archive.url, publisher: 'SEC EDGAR', sourceType: 'sec_10k_filing_folder', publicationDate: anchor.filed, checkedAt: AUDIT_DATE, periodCovered: `FY${fy} ${periodText(anchor)}`,
      claimStatus: 'REPORTED_BY_ISSUER_IN_FILING', rightsTier: 'TIER1_PUBLIC_RECORD', rawStoredPrivately: false, form: '10-K', accessionNumber: anchor.accn, cik: cikStr },
    { url: factsUrl, publisher: 'SEC EDGAR XBRL API', sourceType: 'sec_xbrl_companyfacts_api', publicationDate: anchor.filed, checkedAt: AUDIT_DATE, periodCovered: `FY${fy} ${periodText(anchor)}`,
      claimStatus: 'REPORTED_BY_ISSUER_IN_FILING', rightsTier: 'TIER1_PUBLIC_RECORD', rawStoredPrivately: false, form: '10-K', accessionNumber: anchor.accn, cik: cikStr },
  ];
  const supported: string[] = [];
  if (ex.revenue) supported.push(`${snapshot}: 売上 ${fmtUsd(ex.revenue.value)}（us-gaap:${ex.revenue.tag}、${periodText(ex.revenue)}）`);
  if (ex.operatingIncome) supported.push(`${snapshot}: 営業利益 ${fmtUsd(ex.operatingIncome.value)}（us-gaap:${ex.operatingIncome.tag}、${periodText(ex.operatingIncome)}）`);
  if (ex.netIncome) supported.push(`${snapshot}: 純利益 ${fmtUsd(ex.netIncome.value)}（us-gaap:${ex.netIncome.tag}、${periodText(ex.netIncome)}）`);
  supported.push(...asArr(baseReaudit.supported).map((x) => str(x)).filter(Boolean));

  const baseUnknown = asArr(baseReaudit.unknown).map((x) => str(x)).filter(Boolean);
  const unknown = [
    '月次の売上・利益・原価・手残り（10-K は年次。月次按分・円換算はせず、P&L の数値は未確認のまま）',
    ...ex.missing.map((m) => `${m.metric === 'revenue' ? '売上' : m.metric === 'operatingIncome' ? '営業利益' : '純利益'}: ${m.reason}`),
    ...baseUnknown.slice(1),
  ];
  const unresearched = [
    ...asArr(baseReaudit.unresearched).map((x) => str(x)).filter(Boolean),
    '10-K 本文（従業員数・セグメント別売上・原価内訳・MD&A・リスク要因）の確認。今回は XBRL companyfacts の機械抽出のみ',
  ];

  const reaudit: AnyRecord = {
    ...baseReaudit,
    status: 'PARTIAL', auditDate: AUDIT_DATE, timezone: 'Asia/Tokyo', method: METHOD, lane: LANE, auditOwner: AUDIT_OWNER,
    sources: [...secSources, ...asArr(baseReaudit.sources)],
    supported, unknown, unresearched,
    conflicts: [
      ...(Array.isArray(baseReaudit.conflicts) ? baseReaudit.conflicts : []),
      ...legacyMoneyClaims(base).map((c) => `旧表示の${c}は金額を含むが出典で裏付けられない。SEC 10-K の年次報告値（reportedMetrics）と比べるには円換算が要るが、換算はしていない`),
    ],
    narrativeStatus: baseReaudit.narrativeStatus ?? 'AI_GENERATED_UNVERIFIED_AMOUNTS_REDACTED',
    rights: { status: 'REVIEWED', permission: 'FACTS_ONLY_WITH_ATTRIBUTION', basis: 'SEC EDGAR public record (Tier 1)' },
    legacyDisplaySnapshot: baseReaudit.legacyDisplaySnapshot ?? { status: 'NOT_CAPTURED', supersededAt: AUDIT_DATE },
    secExtraction: {
      cik: cikStr, secEntityName: ex.entityName, secSicCode: sub?.sic ?? '', secSicDescription: sub?.sicDescription ?? '', secTickers: sub?.tickers ?? [], secExchanges: sub?.exchanges ?? [],
      match: { method: match.method, confidence: match.confidence, secTitle: match.secTitle, secTicker: match.secTicker, notes: match.notes, hintNote },
      tickerFile: tickersMeta,
      anchor, tags: { revenue: ex.revenue?.tag ?? null, operatingIncome: ex.operatingIncome?.tag ?? null, netIncome: ex.netIncome?.tag ?? null },
      revenueAlternates: ex.revenue?.alternates ?? [], missing: ex.missing, notes: ex.notes,
      submissionsCrossCheck: cc, archiveFolderCheck: archive, factsFormsSeen: ex.formsSeen,
      policy: '推計・月次按分・円換算なし。10-K 原本フォームのみ（10-K/A は対象外）。指定タグ以外は参考表示に留める',
    },
  };

  const temporal = { ...asRec(base.temporal), dataSnapshotPeriod: `${snapshot} / ${AUDIT_DATE} SEC再監査` };
  const pnl: AnyRecord = {
    ...basePnl,
    monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0,
    isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true,
    isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true,
    financialStatus: status, revenueLabel, sourceDoc: archive.url, dataSnapshotPeriod: snapshot, sourceClass: 'PRIMARY',
    estimationLogic: '推計・按分・円換算は行っていない。SEC 10-K の年次報告値（XBRL companyfacts）を reportedMetrics に USD のまま保持。月次のP&Lは未確認のまま。',
  };
  return { ...base, publishability: 'PARTIAL', pnl, financialStatus: status, reportedMetrics: metrics, evidenceCards, temporal, reaudit };
}

// ---------------------------------------------------------------------------
// メイン
// ---------------------------------------------------------------------------
interface EntityOutcome {
  target: Target; match: MatchResult; outcome: string; note: string; ex: Extraction | null; cc: CrossCheck | null;
  archive: { url: string; status: number; ok: boolean; checkedAt: string } | null; candidateBuilt: boolean; hintNote: string; base: AnyRecord;
}

async function main(): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });
  // (a) 対象一覧
  const catalog = readJson<AnyRecord[]>(INDEX_PATH);
  const targetRecords = catalog.filter(isTargetRecord);
  const targets = targetRecords.map(toTarget);
  const byScale: Record<string, number> = {};
  for (const t of targets) byScale[t.scale] = (byScale[t.scale] ?? 0) + 1;
  const enterpriseAllFamilies = catalog.filter((e) => e.scale === 'ENTERPRISE').length;
  writeJson(TARGETS_PATH, { generatedAt: new Date().toISOString(), catalogEnterpriseAllFamilies: enterpriseAllFamilies, filter: "reaudit.family === 'generated' && scale in [ENTERPRISE, SCALEUP]", catalogSize: catalog.length, count: targets.length, byScale, targets });
  saveProgress('targets', { counts: { catalog: catalog.length, targets: targets.length, byScale, catalogEnterpriseAllFamilies: enterpriseAllFamilies } });
  console.log(`[targets] ${targets.length} records (${JSON.stringify(byScale)}) → ${TARGETS_PATH}`);
  if (flag('targets-only')) { saveProgress('targets-only', { done: true }); return; }

  // (b) company_tickers.json と対応付け
  const tk = await secGet(TICKERS_URL, 'company_tickers.json');
  if (!tk.ok) { noteError(`company_tickers.json: ${tk.error ?? tk.status}`); saveProgress('failed'); throw new Error(`company_tickers.json を取得できません: ${tk.error ?? tk.status}`); }
  const idx = buildTickerIndex(JSON.parse(tk.body));
  const tickersMeta: AnyRecord = { url: TICKERS_URL, fetchedAt: tk.fetchedAt, fromCache: tk.fromCache, bytes: Buffer.byteLength(tk.body), sha256: sha256(tk.body), entries: idx.all.length, uniqueCiks: new Set(idx.all.map((s) => s.cik)).size };
  const matches = new Map<string, MatchResult>();
  for (const t of targets) { const m = matchTarget(t, idx); matches.set(t.id, m); noteEntity(t.id, { name: t.name, secStatus: m.secStatus, detail: m.detail, cik: m.cik }); }
  saveProgress('matched-stage1', { tickerFile: tickersMeta });
  console.log(`[match] stage1: ${[...matches.values()].filter((m) => m.secStatus === 'MATCHED').length} MATCHED / ${[...matches.values()].filter((m) => m.secStatus === 'UNMATCHED').length} UNMATCHED / ${[...matches.values()].filter((m) => m.secStatus === 'NOT_SEC').length} NOT_SEC`);

  // (b') 上場廃止・破綻の提出者: CIK ヒントを submissions の登録名で検証してから採用する
  const submissionsCache = new Map<number, SubmissionsInfo | { error: string }>();
  const getSubmissions = async (cik: number): Promise<SubmissionsInfo | { error: string }> => {
    const cached = submissionsCache.get(cik); if (cached) return cached;
    const fresh = await loadSubmissions(cik); submissionsCache.set(cik, fresh); return fresh;
  };
  const hintNotes = new Map<string, string>();
  for (const t of targets) {
    const hint = DELISTED_CIK_HINTS[t.id];
    const current = matches.get(t.id);
    if (!hint || !current || current.secStatus === 'MATCHED') continue;
    const sub = await getSubmissions(hint.cik);
    if ('error' in sub) { current.notes.push(`CIK ヒント ${cik10(hint.cik)} を検証できない: ${sub.error}`); continue; }
    const keys = new Set(aliasKeys(t).map((k) => k.replace(/ /g, '')));
    const secNames = [sub.name, ...sub.formerNames];
    const hit = secNames.find((n) => keys.has(nameKey(n).replace(/ /g, '')));
    if (!hit) { current.notes.push(`CIK ヒント ${cik10(hint.cik)} の登録名 "${sub.name}" がカタログ名と一致しないため採用しない`); continue; }
    matches.set(t.id, { ...emptyMatch(t.id, 'MATCHED', 'CIK_HINT_VERIFIED_BY_SUBMISSIONS_NAME'), method: 'CIK_HINT_VERIFIED_BY_SUBMISSIONS_NAME', confidence: 'HIGH', cik: hint.cik, secTitle: sub.name, secTicker: sub.tickers[0] ?? null,
      notes: [`company_tickers.json に無い提出者（上場廃止・破綻など）。手動 CIK ヒントを data.sec.gov/submissions の登録名 "${hit}" とカタログ名の一致で検証`] });
    hintNotes.set(t.id, hint.note);
    noteEntity(t.id, { secStatus: 'MATCHED', detail: 'CIK_HINT_VERIFIED_BY_SUBMISSIONS_NAME', cik: hint.cik });
  }
  // UNMATCHED の候補提出者: どの様式を出しているか（10-K を出す会社か）だけ確認して記録する。対応付けはしない。
  const candidateInfo = new Map<number, CandidateInfo>();
  const KEY_FORMS = ['10-K', '20-F', '40-F', 'S-1', 'F-1', '6-K', 'D'];
  for (const m of matches.values()) {
    if (m.secStatus !== 'UNMATCHED') continue;
    for (const c of m.candidates) {
      if (candidateInfo.has(c.cik)) continue;
      const sr = await getSubmissions(c.cik);
      candidateInfo.set(c.cik, 'error' in sr
        ? { cik: c.cik, sic: '', sicDescription: '', keyForms: [], exchanges: [], stateOfIncorporation: '', error: sr.error }
        : { cik: c.cik, sic: sr.sic, sicDescription: sr.sicDescription, keyForms: KEY_FORMS.filter((f) => sr.recent.some((r) => r.form === f)), exchanges: sr.exchanges, stateOfIncorporation: sr.stateOfIncorporation });
    }
    noteEntity(m.id, { candidates: m.candidates.map((c) => ({ cik: c.cik, ticker: c.ticker, title: c.title, keyForms: candidateInfo.get(c.cik)?.keyForms ?? [] })) });
  }
  saveProgress('matched');

  // (c) 一致した提出者ごとに submissions / companyfacts を取得
  const ciks = [...new Set([...matches.values()].filter((m) => m.secStatus === 'MATCHED' && m.cik !== null).map((m) => m.cik as number))];
  const factsByCik = new Map<number, { ex: Extraction | null; error?: string; sub: SubmissionsInfo | null; cc: CrossCheck | null; archive: EntityOutcome['archive'] }>();
  for (const cik of ciks) {
    const subRes = await getSubmissions(cik);
    const sub = 'error' in subRes ? null : subRes;
    const fr = await secGet(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik10(cik)}.json`, `companyfacts-CIK${cik10(cik)}.json`);
    if (!fr.ok) {
      const msg = `companyfacts CIK${cik10(cik)}: ${fr.error ?? fr.status}`;
      noteError(msg); factsByCik.set(cik, { ex: null, error: msg, sub, cc: null, archive: null });
      saveProgress('facts', { counts: { factsFetched: factsByCik.size, factsTotal: ciks.length } });
      continue;
    }
    let ex: Extraction;
    try { ex = extractAnnual(cik, asRec(JSON.parse(fr.body)), sub); } catch (err) {
      const msg = `companyfacts CIK${cik10(cik)} parse/extract: ${errMsg(err)}`;
      noteError(msg); factsByCik.set(cik, { ex: null, error: msg, sub, cc: null, archive: null }); continue;
    }
    let cc: CrossCheck | null = null;
    let archive: EntityOutcome['archive'] = null;
    if (ex.anchor) {
      cc = crossCheck(ex.anchor, sub);
      const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${ex.anchor.accn.replace(/-/g, '')}/`;
      const ar = await secGet(url, `archive-${cik10(cik)}-${ex.anchor.accn.replace(/-/g, '')}.html`);
      archive = { url, status: ar.status, ok: ar.ok, checkedAt: AUDIT_DATE };
      if (!ar.ok) noteError(`10-K フォルダ確認 ${url}: ${ar.error ?? ar.status}`);
    }
    factsByCik.set(cik, { ex, sub, cc, archive });
    console.log(`[facts] CIK${cik10(cik)} ${ex.entityName}: ${ex.status}${ex.anchor ? ` FY${ex.anchor.fy} ${ex.anchor.end}` : ''}`);
    saveProgress('facts', { counts: { factsFetched: factsByCik.size, factsTotal: ciks.length } });
  }

  // (d) 候補生成
  const baseById = new Map(targetRecords.map((r) => [str(r.id), r]));
  const outcomes: EntityOutcome[] = [];
  const candidates: AnyRecord[] = [];
  for (const t of targets) {
    const match = matches.get(t.id) as MatchResult;
    const hintNote = hintNotes.get(t.id) ?? '';
    const o: EntityOutcome = { target: t, match, outcome: match.secStatus, note: match.detail, ex: null, cc: null, archive: null, candidateBuilt: false, hintNote, base: baseById.get(t.id) ?? {} };
    if (match.secStatus === 'MATCHED' && match.cik !== null) {
      const f = factsByCik.get(match.cik);
      if (!f || !f.ex) { o.outcome = 'MATCHED_FETCH_FAILED'; o.note = f?.error ?? 'companyfacts 未取得'; }
      else {
        o.ex = f.ex; o.cc = f.cc; o.archive = f.archive;
        if (f.ex.status === 'NO_10K_ANNUAL_FACTS') {
          o.outcome = 'MATCHED_NO_10K'; o.note = f.ex.statusNote;
          const annualReports = (f.sub?.recent ?? []).filter((r) => r.form === '20-F' || r.form === '40-F').sort((a, b) => (a.filingDate < b.filingDate ? 1 : -1));
          if (annualReports[0]) o.note += `。最新の年次報告書: ${annualReports[0].form} ${annualReports[0].accn}（期間末 ${annualReports[0].reportDate}、提出 ${annualReports[0].filingDate}）`;
        }
        else if (f.ex.status === 'NO_TARGET_METRICS') { o.outcome = 'MATCHED_NO_TARGET_METRICS'; o.note = f.ex.statusNote; }
        else if (!f.archive || !f.archive.ok) { o.outcome = 'MATCHED_ARCHIVE_UNVERIFIED'; o.note = `10-K フォルダを確認できない（${f.archive?.status ?? '未実施'}）ため候補を作らない`; }
        else {
          try {
            const cand = buildCandidate({ base: baseById.get(t.id) as AnyRecord, match, ex: f.ex, sub: f.sub, cc: f.cc as CrossCheck, archive: f.archive, tickersMeta, hintNote });
            parseFinancialEntity(cand); // 実行時スキーマ検査
            candidates.push(cand); o.candidateBuilt = true; o.outcome = 'CANDIDATE_BUILT'; o.note = '';
          } catch (err) { o.outcome = 'MATCHED_CANDIDATE_INVALID'; o.note = errMsg(err).slice(0, 300); noteError(`${t.id}: ${o.note}`); }
        }
      }
    }
    outcomes.push(o);
    noteEntity(t.id, { outcome: o.outcome, note: o.note, candidateBuilt: o.candidateBuilt });
  }
  const files: string[] = [];
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const n = i / BATCH_SIZE + 1;
    writeJson(batchPath(n), candidates.slice(i, i + BATCH_SIZE));
    files.push(batchPath(n));
  }
  saveProgress('candidates', { outputs: files, counts: { ...(progress.counts as AnyRecord), candidates: candidates.length, batches: files.length } });
  console.log(`[candidates] ${candidates.length} record(s) → ${files.length} batch file(s)`);

  // (e) validate-candidates を実行
  let validateText = '未実行（--skip-validate または候補なし）';
  let validateExit: number | null = null;
  if (!flag('skip-validate') && files.length) {
    const r = spawnSync(process.execPath, ['--import', 'tsx', VALIDATE_SCRIPT, ...files], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    validateExit = r.status;
    validateText = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
    console.log(validateText.split('\n').slice(-40).join('\n'));
  }
  saveProgress('validated', { validate: { exit: validateExit, summary: validateText.split('\n').slice(-1)[0] } });

  // レポート
  writeFileSync(REPORT_PATH, renderReport({ targets, byScale, enterpriseAllFamilies, outcomes, tickersMeta, files, validateText, validateExit, candidateInfo }), 'utf8');
  writeJson(TARGETS_PATH, {
    generatedAt: new Date().toISOString(), catalogEnterpriseAllFamilies: enterpriseAllFamilies, filter: "reaudit.family === 'generated' && scale in [ENTERPRISE, SCALEUP]", catalogSize: catalog.length, count: targets.length, byScale,
    targets: outcomes.map((o) => ({ ...o.target, sec: { status: o.match.secStatus, detail: o.match.detail, method: o.match.method, cik: o.match.cik !== null ? cik10(o.match.cik) : null, secTitle: o.match.secTitle, outcome: o.outcome, candidateBuilt: o.candidateBuilt, note: o.note || undefined } })),
  });
  saveProgress('done', { done: true, outputs: [...files, TARGETS_PATH, REPORT_PATH, PROGRESS_PATH], counts: { ...(progress.counts as AnyRecord), matched: outcomes.filter((o) => o.match.secStatus === 'MATCHED').length, unmatched: outcomes.filter((o) => o.match.secStatus === 'UNMATCHED').length, notSec: outcomes.filter((o) => o.match.secStatus === 'NOT_SEC').length, candidates: candidates.length, batches: files.length, http: httpStats } });
  console.log(`[done] report → ${REPORT_PATH}\nhttp: ${JSON.stringify(httpStats)}`);
}

// ---------------------------------------------------------------------------
// レポート
// ---------------------------------------------------------------------------
function renderReport(ctx: { targets: Target[]; byScale: Record<string, number>; enterpriseAllFamilies: number; outcomes: EntityOutcome[]; tickersMeta: AnyRecord; files: string[]; validateText: string; validateExit: number | null; candidateInfo: Map<number, CandidateInfo> }): string {
  const { targets, byScale, enterpriseAllFamilies, outcomes, tickersMeta, files, validateText, validateExit, candidateInfo } = ctx;
  const cnt = (f: (o: EntityOutcome) => boolean): number => outcomes.filter(f).length;
  const matched = outcomes.filter((o) => o.match.secStatus === 'MATCHED');
  const built = outcomes.filter((o) => o.candidateBuilt);
  const noTenK = outcomes.filter((o) => o.outcome === 'MATCHED_NO_10K');
  const noMetric = outcomes.filter((o) => o.outcome === 'MATCHED_NO_TARGET_METRICS');
  const failed = outcomes.filter((o) => ['MATCHED_FETCH_FAILED', 'MATCHED_ARCHIVE_UNVERIFIED', 'MATCHED_CANDIDATE_INVALID'].includes(o.outcome));
  const unmatched = outcomes.filter((o) => o.match.secStatus === 'UNMATCHED');
  const notSec = outcomes.filter((o) => o.match.secStatus === 'NOT_SEC');
  const nameOf = (o: EntityOutcome): string => `${o.target.name}`;
  const L: string[] = [];
  L.push(`# 再監査レーンA: SEC 公的開示（10-K）での引き直し — ${AUDIT_DATE}`, '');
  L.push('推計・按分・円換算は一切入れていない。数値は SEC の XBRL companyfacts に載っている 10-K の年次報告値を、そのまま USD で記録したもの。', '');
  L.push('## 1. 対象数と判定の内訳', '');
  L.push(`- 対象: **${targets.length} 件**（条件 \`reaudit.family === 'generated'\` かつ scale が ENTERPRISE / SCALEUP。内訳 ${Object.entries(byScale).map(([k, v]) => `${k} ${v}`).join(' / ')}）。指示にあった「約148件」は、全ファミリー合計の ENTERPRISE 件数（${enterpriseAllFamilies} 件）と一致する数字で、この条件の実数は ${targets.length} 件。`);
  L.push(`- SEC company_tickers.json: ${tickersMeta.entries} 行 / ${tickersMeta.uniqueCiks} CIK、取得 ${tickersMeta.fetchedAt}${tickersMeta.fromCache ? '（キャッシュ）' : ''}、sha256 \`${String(tickersMeta.sha256).slice(0, 16)}…\``, '');
  L.push('| 区分 | 件数 |', '|---|---|');
  L.push(`| 対象 | ${targets.length} |`, `| MATCHED（SEC の CIK に対応付け） | ${matched.length} |`);
  L.push(`| 　うち 10-K 候補を生成 | ${built.length} |`, `| 　うち 10-K なし（20-F 等の外国民間発行体） | ${noTenK.length} |`);
  L.push(`| 　うち 10-K あり・対象指標を取得できず | ${noMetric.length} |`, `| 　うち 取得失敗・検証失敗 | ${failed.length} |`);
  L.push(`| UNMATCHED（曖昧・親会社ブランド。対応付けせず） | ${unmatched.length} |`, `| 　うち 親会社が SEC 提出者のブランド | ${unmatched.filter((o) => o.match.detail.startsWith('BRAND_UNDER_PARENT')).length} |`, `| 　うち 名称の一部が重なるだけで断定不可 | ${unmatched.filter((o) => !o.match.detail.startsWith('BRAND_UNDER_PARENT')).length} |`);
  L.push(`| NOT_SEC（SEC 提出者として見つからない） | ${notSec.length} |`, `| 　うち 日本企業 | ${cnt((o) => o.match.secStatus === 'NOT_SEC' && o.target.country === 'JP')} |`);
  L.push(`| 　うち 日本以外の非米国企業 | ${cnt((o) => o.match.secStatus === 'NOT_SEC' && o.target.country !== 'JP' && o.target.country !== 'US')} |`, `| 　うち 米国企業（ティッカーファイルに該当なし） | ${cnt((o) => o.match.secStatus === 'NOT_SEC' && o.target.country === 'US')} |`, '');
  L.push('## 2. 取得した FY と3指標（10-K 候補を生成した記録）', '');
  L.push('| ID | 社名 | CIK | 一致方法 | FY | 期間 | 提出日 | accession | 売上 | 営業利益 | 純利益 | 備考 |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const o of built) {
    const ex = o.ex as Extraction; const a = ex.anchor as Anchor;
    const miss = ex.missing.map((m) => `${m.metric}: ${m.reason}${m.references.length ? `（参考 ${m.references.map((r) => `${r.tag}=${fmtUsd(r.value)}`).join(', ')}）` : ''}`);
    const warn = [...(o.cc?.warnings ?? []), ...ex.notes, ...(ex.revenue && ex.revenue.tag !== 'Revenues' ? [`売上タグ ${ex.revenue.tag}`] : []), ...(o.target.financialStatusBefore === 'POST_MORTEM' ? ['破綻事例の区分(POST_MORTEM)を維持'] : [])];
    L.push(`| ${mdCell(o.target.id)} | ${mdCell(nameOf(o))} | ${cik10(ex.cik)} | ${mdCell(o.match.method)} | FY${a.fy} | ${a.start}〜${a.end} | ${a.filed} | ${a.accn} | ${ex.revenue ? fmtUsd(ex.revenue.value) : '—'} | ${ex.operatingIncome ? fmtUsd(ex.operatingIncome.value) : '—'} | ${ex.netIncome ? fmtUsd(ex.netIncome.value) : '—'} | ${mdCell([...miss, ...warn].join(' / '))} |`);
  }
  L.push('', '## 3. MATCHED だが候補を作らなかった記録', '');
  L.push('| ID | 社名 | CIK | 区分 | 理由 |', '|---|---|---|---|---|');
  for (const o of [...noTenK, ...noMetric, ...failed]) L.push(`| ${mdCell(o.target.id)} | ${mdCell(nameOf(o))} | ${o.match.cik !== null ? cik10(o.match.cik) : ''} | ${o.outcome} | ${mdCell(`${o.note}${o.ex && o.ex.missing.length ? ` / ${o.ex.missing.map((m) => `${m.metric}: ${m.reason}${m.references.length ? `（参考 ${m.references.map((r) => `${r.tag}=${fmtUsd(r.value)}`).join(', ')}）` : ''}`).join(' / ')}` : ''}`)} |`);
  L.push('', '## 4. UNMATCHED（対応付けなし）', '');
  L.push('| ID | 社名 | 国 | 理由 | SEC 側の候補・メモ |', '|---|---|---|---|---|');
  for (const o of unmatched) L.push(`| ${mdCell(o.target.id)} | ${mdCell(nameOf(o))} | ${o.target.country} | ${mdCell(o.match.detail)} | ${mdCell([...o.match.candidates.map((c) => { const ci = candidateInfo.get(c.cik); return `${c.ticker} CIK ${cik10(c.cik)} "${c.title}"${ci ? `〔${[ci.sic ? `SIC ${ci.sic} ${ci.sicDescription}` : '', `主な提出様式: ${ci.keyForms.join(', ') || 'なし'}`, ci.error ? `取得失敗 ${ci.error}` : ''].filter(Boolean).join('; ')}〕` : ''}`; }), ...o.match.notes].join(' / '))} |`);
  L.push('', '## 5. NOT_SEC（SEC 提出者として見つからない）', '');
  for (const [label, filter] of [['日本企業（公的開示があれば EDINET / TDnet。このレーンの対象外）', (o: EntityOutcome) => o.target.country === 'JP'], ['日本以外の非米国企業', (o: EntityOutcome) => o.target.country !== 'JP' && o.target.country !== 'US'], ['米国企業（ティッカーファイルに該当なし。非上場・上場廃止・ブランド名のみの可能性。個別の上場状況は未検証）', (o: EntityOutcome) => o.target.country === 'US']] as const) {
    const list = notSec.filter(filter);
    L.push(`### ${label}（${list.length} 件）`, '', list.map((o) => `${o.target.name}〔${o.target.id}〕`).join(' / ') || '（なし）', '');
  }
  L.push('## 6. 取得の失敗・欠損の理由', '');
  const problems = outcomes.filter((o) => o.candidateBuilt && (o.ex?.missing.length || o.ex?.notes.length || o.cc?.warnings.length));
  if (!problems.length && !failed.length && !noTenK.length && !noMetric.length) L.push('- 失敗・欠損なし', '');
  for (const o of noTenK) L.push(`- ${o.target.name}: ${o.note}`);
  for (const o of noMetric) L.push(`- ${o.target.name}: ${o.note}${o.ex?.missing.length ? ` / ${o.ex.missing.map((m) => `${m.metric}: ${m.reason}`).join(' / ')}` : ''}`);
  for (const o of failed) L.push(`- ${o.target.name}: ${o.outcome} — ${o.note}`);
  for (const o of problems) L.push(`- ${o.target.name}: ${[...(o.ex?.missing ?? []).map((m) => `${m.metric}: ${m.reason}`), ...(o.ex?.notes ?? []), ...(o.cc?.warnings ?? [])].join(' / ')}`);
  const claimRows = built.map((o) => ({ o, claims: legacyMoneyClaims(o.base) })).filter((x) => x.claims.length);
  if (claimRows.length) {
    L.push('', '旧表示に残っている金額表現（出典なし。候補では書き換えず `reaudit.conflicts` に記録した）:');
    for (const { o, claims } of claimRows) L.push(`- ${o.target.name}: ${claims.join(' / ')}`);
  }
  L.push('', '## 7. 出力ファイルと検証', '');
  L.push(`- 候補: ${files.length ? files.map((f) => `\`${f.replace(`${REPO_ROOT}/`, '')}\``).join(', ') : '（なし）'}（合計 ${built.length} 件、${BATCH_SIZE} 件ずつ）`);
  L.push(`- validate-candidates: 終了コード ${validateExit ?? '未実行'}`, '', '```', validateText.split('\n').slice(-Math.max(12, built.length + 4)).join('\n'), '```', '');
  L.push('## 8. 方針と注意', '');
  L.push('- 推計・月次按分・円換算はしていない。`pnl` の数値は 0、全項目 unconfirmed のまま。年次の報告値は `pnl.revenueLabel`、`reportedMetrics`、証拠カードにだけ置いた。');
  L.push('- 10-K 原本のみ（10-K/A は対象外）。同一期間に訂正版がある場合は候補の `reaudit.secExtraction.submissionsCrossCheck` に記録した。');
  L.push('- 破綻事例として `POST_MORTEM` の記録は、honest-rebuild と同じく区分を維持した（`REPORTED` へ変えていない）。');
  L.push('- 「出典が記録されていない」カード（`_reaudit_no_source`）は SEC 出典の追加後は事実と合わないため外し、「調査限界」カードは残した。');
  L.push(`- SEC への負荷: ネットワーク ${httpStats.network} 回、キャッシュ ${httpStats.cached} 回、失敗 ${httpStats.failed} 回、最小間隔 ${MIN_INTERVAL_MS}ms（約 ${(1000 / MIN_INTERVAL_MS).toFixed(1)} req/s）。宣言済み User-Agent 付き。`);
  L.push('- このスクリプトが使う SEC エンドポイントは company_tickers.json、data.sec.gov の submissions と companyfacts、Archives/edgar/data の10-Kフォルダ確認のみ。`/cgi-bin` は robots.txt で Disallow のため使っていない。');
  L.push('- 開示: 上場廃止・破綻6社の CIK ヒントを探す際、実装前の手作業で EDGAR 企業検索（`/cgi-bin/browse-edgar`）を14回（うちタイムアウト4回）叩いた。robots.txt が `/cgi-bin` を Disallow していると後で確認したため、以後は使っておらず、スクリプトにも含めていない。ヒントの CIK は data.sec.gov の登録名との一致で再検証している。', '');
  L.push('## 9. 次の担当への申し送り', '');
  const jp = notSec.filter((o) => o.target.country === 'JP').length;
  const us = notSec.filter((o) => o.target.country === 'US').length;
  L.push(`- 日本企業 ${jp} 件は SEC 提出者ではない。有価証券報告書などの公的開示があるものは EDINET / TDnet 系のレーンで引き直す（EDINET は不可侵の運用があるため、取得方法は別途決める）。`);
  L.push(`- 米国企業 ${us} 件と日本以外の非米国企業は、SEC の公的財務開示が見つからない（非上場が大半）。財務の一次資料は公式発表・報道・Form D / S-1 などが候補で、SEC 10-K では引き直せない。`);
  if (noTenK.length) L.push(`- 20-F 提出者 ${noTenK.length} 件（${noTenK.map(nameOf).join('、')}）は IFRS で、報告通貨も USD ではない可能性が高い。10-K と別の抽出処理（通貨を保ったまま記録する）が必要。`);
  if (noMetric.length) L.push(`- 10-K はあるが指定タグで取れなかった ${noMetric.length} 件（${noMetric.map(nameOf).join('、')}）は、銀行用の収益・利益タグ（受取利息・非金利収入・ProfitLoss 等）を使う別設計が必要。報告書 §3 に参考値を残した。`);
  L.push(`- UNMATCHED のうち親会社ブランド ${unmatched.filter((o) => o.match.detail.startsWith('BRAND_UNDER_PARENT')).length} 件は、親会社 10-K の本文にブランド別売上があるかを確認する（連結数値をブランドへ付けない）。名称あいまいの ${unmatched.filter((o) => !o.match.detail.startsWith('BRAND_UNDER_PARENT')).length} 件は、SEC の登録名・提出様式を §4 に併記した。`);
  L.push('- 候補を通常パイプラインへ取り込むときの注意: `ingest-accepted.ts` は Tier 1 の出典を raw として取得するため、companyfacts JSON（数百KB〜数MB）と Archives フォルダの HTML を sec.gov / data.sec.gov へ取りに行く。SEC は連絡先入りの User-Agent と 10 req/s 未満を求めるので、その UA では要調整。');
  L.push('- 取り込み時の注意（`scripts/pipeline/auto-enrich-entity.ts`）: `収集事例` タグを再付与する（honest-rebuild が取り下げたタグ）。撤退・破綻・清算などの語を含むタグを持つ記録は `pnl.financialStatus` を POST_MORTEM に固定する。');
  L.push('- 候補の `tags`（「再監査中」「財務未確認」）と物語系の項目（`strategy` など）は基準レコードのまま。月次P&Lは未確認のままなので `財務未確認` は残している。年次の報告値を出す表示側の対応（`revenueLabel` と証拠カード）は、表示契約に従って確認が必要。', '');
  return L.join('\n');
}

main().catch((err) => { noteError(errMsg(err)); saveProgress('failed'); console.error(err); process.exit(1); });
