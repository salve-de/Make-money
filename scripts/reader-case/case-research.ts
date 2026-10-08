/**
 * queue の候補から、最初の調査記録（docs/research-record/ の形）を自動で作り、一覧に入れる。人が付き添わない。
 *
 *   pnpm case:research --ids cand_a,cand_b      （候補ID。社名のスラッグでもよい）
 *   pnpm case:research --next 3                 （優先度の高い順に3件）
 *   オプション: --agent codex|claude（調べる役。既定 codex）  --model  --codex-effort
 *              --repair-agent claude|codex（文の直し役。既定 claude の Sonnet）  --concurrency N（既定3）
 *              --generation N（世代。省略時は取り込み済みの最大）  --no-apply（一覧に入れない）  --run-id
 *
 * 流れ: 予約（CLAIMED_TARGETS）→ 出典の取得 → 調べる役（web 検索あり）が調査記録の材料を返す
 *   → 引用が出典の本文にある物だけ残す → 記録に組む → add-entity-records --from-research
 *   → 数字の決まりを満たさない文があれば直し役が1回直す → 一覧に入れる（--apply）→ registry:sync。
 * 見送り（記録を作らない）: 数字の出典が取れない・引用が本文に無い／数字の出典が残らない／創業も転機も出典で確認できない／重複。
 * 数字は出典に書かれた物だけ。推測は入れない。各段の時間は data/pipeline/case-run.jsonl。
 * 次は `pnpm case:run --ids-file <出力される ids ファイル>`。
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { entityDomain } from '../pipeline/entity-identity.mjs';
import { makeCaller, mapPool, pickAgent, type Agent, type Caller } from './agent-call';
import { ownerContext } from './owner-context';
import { buildDedupIndex, claimTarget, extractJson, slugify, timed, updateCandidates, type Candidate } from './candidates-lib';
import { fetchOne } from './fetch-sources';
import { cachePath, MIN_TEXT, quoteInText } from './verify-lib';
import { makeExec, type Exec } from './case-run';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../..');
const METRIC_KINDS_WITH_SUBSTANCE = ['REVENUE', 'GMV', 'DIRECT_PAYMENT', 'PROFIT', 'USERS', 'FUNDING', 'VALUATION', 'EXIT', 'COST', 'OTHER'];
const SECTORS = ['AI_AUTOMATION', 'NICHE_SAAS', 'MONOPOLY_MFG', 'CONTENT_MEDIA', 'PHYSICAL_ASSET', 'FINTECH_INFRA', 'LOCAL_SERVICES', 'UNKNOWN'];
const SCALES = ['SOLO', 'SMALL_TEAM', 'SCALEUP', 'ENTERPRISE', 'UNKNOWN'];
const MAX_SOURCE_CHARS = 14_000;

export interface ResearchOptions {
  root: string;
  /** 候補ID・スラッグ・社名のどれか。ids が空なら next 件を優先度順に選ぶ */
  ids: string[];
  next?: number;
  runId: string;
  concurrency: number;
  generation?: number;
  apply: boolean;
  /** 文の直しを何回まで頼むか（既定 1） */
  maxRepairs?: number;
  today?: string;
  log?: (t: string) => void;
}
export type SourceFetcher = (url: string) => Promise<string>;
export interface ResearchDeps {
  /** 調べる役（web 検索あり） */
  caller: Caller;
  /** 文の直し役（web なしでよい）。省略時は caller */
  repairCaller?: Caller;
  exec: Exec;
  fetchText?: SourceFetcher;
  now?: () => number;
}
export interface ResearchOutcome {
  candidateId: string;
  name: string;
  status: 'recorded' | 'skipped';
  reason?: string;
  entityId?: string;
  additionName?: string;
  recordFile?: string;
  seconds: number;
  unconfirmed?: number;
}
export interface ResearchSummary { runId: string; outcomes: ResearchOutcome[]; applied: string[]; idsFile?: string; seconds: number }

/** 出典を取得して本文を返す（取れなければ空）。取得した物は data/source-cache にも残し、後の段（case:run）が再利用する */
export const defaultFetchText: SourceFetcher = async (url) => {
  const rec = await fetchOne(url);
  try { mkdirSync('data/source-cache', { recursive: true }); writeFileSync(cachePath(url), JSON.stringify(rec)); } catch { /* 保存できなくても続ける */ }
  return rec.text.length >= MIN_TEXT ? rec.text : '';
};

// ---- AI に渡す指示 ------------------------------------------------------------------------

const APPENDIX = `

## 実行方式（この節が上の指示より優先）
- web の検索と閲覧は使ってよい（公開ページだけ。ログインが要る所・規約で自動取得を禁じた所は使わない）。コマンド実行・ファイル作成はしない。
- 出典の本文は依頼本文に貼ってある物がある。それ以外のページを開いた時は、そのページから原文を一字も変えずに写した引用だけを使う。引用は後で機械が出典の本文と照らし、無い物は捨てる。
- 数字は出典に書かれた物だけ。推測・換算・平均を事実にしない。分からないことは unknown に書く。
- 事実の文の数字は、同じ事実の quote に同じ数字がそのまま入っている形にする（検査が機械で照らす）。引用は英語か日本語の表記（例 "$50 million"、"5000万円"）の箇所を優先する。ポルトガル語などの "R$ 50 milhões"・小数点がカンマの "79,90" は機械が数として読めず、その数字は外れる。同じ数字を英語・日本語で書いた別の出典や箇所があればそちらを使う。
- 最終メッセージは JSON だけ（前置き・説明・コードフェンス無し）。形:
{"name":"事業名","tagline":"何の事業かの1〜2文(日本語)","description":"2〜3文(日本語)","sector":"NICHE_SAAS など","scale":"SOLO など","founder":"名前か未確認","country":"国か未確認","architecturePattern":"どう売っているかの1文","tags":["..."],"foundedYear":2016,
 "facts":[{"kind":"DESCRIPTION|PRICING|FOUNDING|TEAM|CHANNEL|TOOL|EVENT|EXIT|FUNDING|OTHER","text":"画面に出せる自然な日本語の1文","sourceUrl":"https://...","statedAt":"YYYY-MM か YYYY-MM-DD(任意)","quote":"原文の引用","numberKind":"数を含む事実は必須","asOf":"数を含む事実は必須"}],
 "metrics":[{"numberKind":"REVENUE など","amount":24,"currency":"USD","unit":"任意","label":"何の数字か","asOf":"YYYY など","periodKind":"期間の数字は必須","quote":"数字を含む原文の引用","sourceUrl":"https://...","origin":"SELF_REPORTED|ARTICLE|FILED|THIRD_PARTY","basis":"任意"}],
 "sources":[{"url":"https://...","publisher":"公式サイト など","sourceType":"official_website|official_blog|article|forum|filing","publicationDate":"YYYY-MM-DD か null","rights":{"loginFree":"yes|no|unconfirmed","noPaywall":"yes|no|unconfirmed","quoteTerms":"permits|prohibits|silent|unconfirmed","termsUrl":"規約ページの URL か null","note":"判断の根拠を1〜2文"}}],
 "unknown":["取れなかったこと"],"conflicts":["出典どうしの食い違い"]}
- sector は ${SECTORS.join(' / ')}、scale は ${SCALES.join(' / ')} のどれか。
- 後の段（分析・リード）は、確かめられた事実だけを材料にする。「誰が・いつ・何をして・何が起きたか」が分かる具体的な行動と転機の事実（最初の客をどう得たか、何を変えて伸びたか、最初の1年の動き）を、数字の事実とは別に、できるだけ多く（目安10件以上）集める。製品の機能説明で件数を埋めない。
- 先頭の事実は公式サイトを出典にした DESCRIPTION。創業(FOUNDING)と転機(EVENT/TEAM/CHANNEL/EXIT/FUNDING)の事実を必ず探す。見つからなければ unknown に書く。`;

/** 調べる役は空の作業場所で動くのでファイルを開けない。文の書き方の正本（natural-japanese）はここに貼って渡す */
export function collectSystem(root: string): string {
  const skillFile = join(root, '.claude/skills/natural-japanese/SKILL.md');
  const skill = existsSync(skillFile) ? `\n\n## 文の書き方の正本（natural-japanese。上の指示で「必ず全部読む」とした物。ここに全文を貼る）\n${readFileSync(skillFile, 'utf8')}` : '';
  return readFileSync(join(root, 'scripts/reader-case/collect-prompt.md'), 'utf8') + skill + APPENDIX + ownerContext(root);
}

function sourceBlock(texts: Map<string, string>): string {
  const parts: string[] = [];
  for (const [url, text] of texts) if (text) parts.push(`### ${url}\n${text.slice(0, MAX_SOURCE_CHARS)}`);
  return parts.length ? parts.join('\n\n') : '（取得できた本文なし）';
}

export function collectUser(c: Candidate, texts: Map<string, string>, today: string): string {
  return `## 対象の候補\n${JSON.stringify({ name: c.name, officialUrl: c.url || '（公式サイトなし）', 見つけた理由: c.reason, 数字の出典: c.sources.map((s) => ({ url: s.url, quote: s.quote, what: s.what })) }, null, 1)}\n\n今日は ${today}。\n\n## 取得済みの出典の本文\n${sourceBlock(texts)}\n\n上の指示のとおり調査記録の材料を JSON で返す。`;
}

// ---- 材料の検査と記録への組み立て --------------------------------------------------------------

export interface Compact {
  name?: string; tagline?: string; description?: string; sector?: string; scale?: string; founder?: string; country?: string;
  architecturePattern?: string; tags?: string[]; foundedYear?: number;
  facts?: Record<string, unknown>[]; metrics?: Record<string, unknown>[];
  sources?: { url?: string; publisher?: string; sourceType?: string; publicationDate?: string | null; rights?: Record<string, unknown> }[];
  unknown?: string[]; conflicts?: string[];
}

/** AI が書いた権利の判断を、台帳に入る形に整える（列挙外は unconfirmed、規約の URL は http(s) だけ、根拠は400字まで） */
export function normalizeRights(x: unknown): { loginFree: string; noPaywall: string; quoteTerms: string; termsUrl: string | null; note?: string } | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const r = x as Record<string, unknown>;
  const tri = (v: unknown): string => (v === 'yes' || v === 'no' ? v : 'unconfirmed');
  const quote = ['permits', 'prohibits', 'silent'].includes(String(r.quoteTerms)) ? String(r.quoteTerms) : 'unconfirmed';
  let termsUrl: string | null = null;
  try { const u = new URL(String(r.termsUrl)); if (/^https?:$/.test(u.protocol)) termsUrl = u.href; } catch { /* null のまま */ }
  const note = typeof r.note === 'string' && r.note.trim() ? r.note.trim().slice(0, 400) : undefined;
  return { loginFree: tri(r.loginFree), noPaywall: tri(r.noPaywall), quoteTerms: quote, termsUrl, ...(note ? { note } : {}) };
}

const isUrl = (u: unknown): u is string => typeof u === 'string' && /^https?:\/\//i.test(u) && !!entityDomain(u);
const BANNED_HOST = /ebiz/i;

/** 引用が出典の本文にある事実・数字だけ残す。本文が取れない出典の物は残さない。外した物は理由つきで返す */
export async function verifyCompact(c: Compact, fetchText: SourceFetcher, texts: Map<string, string>): Promise<{ compact: Compact; dropped: string[] }> {
  const urls = new Set<string>();
  for (const x of [...(c.facts ?? []), ...(c.metrics ?? [])]) if (isUrl(x.sourceUrl)) urls.add(x.sourceUrl);
  await mapPool([...urls].filter((u) => !texts.has(u)), 6, async (u) => { texts.set(u, await fetchText(u).catch(() => '')); });
  const dropped: string[] = [];
  const ok = (x: Record<string, unknown>, label: string): boolean => {
    const u = x.sourceUrl; const q = typeof x.quote === 'string' ? x.quote : '';
    if (!isUrl(u) || BANNED_HOST.test(u)) { dropped.push(`${label}: 出典の URL が使えない`); return false; }
    if (!q.trim()) { dropped.push(`${label}: 引用が無い`); return false; }
    const t = texts.get(u) ?? '';
    if (!t) { dropped.push(`${label}: 出典の本文を取得できない（${u}）`); return false; }
    if (!quoteInText(q, t)) { dropped.push(`${label}: 引用が出典の本文に無い（${u}）`); return false; }
    return true;
  };
  const facts = (c.facts ?? []).filter((f) => ok(f, `事実「${String(f.text ?? '').slice(0, 24)}」`));
  const metrics = (c.metrics ?? []).filter((m) => ok(m, `数字「${String(m.label ?? m.numberKind ?? '')}」`));
  return { compact: { ...c, facts, metrics }, dropped };
}

/** 数字の出典が残っているか（価格だけ・推定だけでは足りない） */
export function hasSubstantialMetric(c: Compact): boolean {
  return (c.metrics ?? []).some((m) => METRIC_KINDS_WITH_SUBSTANCE.includes(String(m.numberKind)));
}


export function entityIdOf(name: string, url: string): string {
  const slug = slugify(name).replace(/-/g, '_');
  return `ent_${slug}_${createHash('sha1').update(entityDomain(url) || name).digest('hex').slice(0, 12)}`;
}

/** 材料から調査記録（配列の1件）を組む。分からない欄は「未確認」と印で残し、0や仮の値を事実にしない */
export function buildRecord(c: Candidate, m: Compact, today: string, dropped: string[]): Record<string, unknown> {
  const name = (m.name?.trim() || c.name);
  const id = entityIdOf(name, c.url);
  const officialDomain = entityDomain(c.url);
  const facts: Record<string, unknown>[] = (m.facts ?? []).map((f) => ({ ...f, checkedAt: today }));
  const metrics: Record<string, unknown>[] = (m.metrics ?? []).map((x) => ({ ...x, checkedAt: today }));
  const srcMap = new Map<string, Record<string, unknown>>();
  const addSrc = (url: string, extra: Record<string, unknown> = {}): void => {
    if (srcMap.has(url) || !isUrl(url) || BANNED_HOST.test(url)) return;
    const own = !!officialDomain && (entityDomain(url) === officialDomain || entityDomain(url).endsWith(`.${officialDomain}`));
    srcMap.set(url, { url, publisher: own ? '公式サイト' : entityDomain(url), sourceType: own ? 'official_website' : 'article', publicationDate: null, checkedAt: today, rightsTier: own ? 'TIER1_OFFICIAL' : 'TIER2_FACTS_ONLY', ...extra });
  };
  for (const s of m.sources ?? []) if (isUrl(s.url)) addSrc(s.url, { ...(s.publisher ? { publisher: s.publisher } : {}), ...(s.sourceType ? { sourceType: s.sourceType } : {}), publicationDate: s.publicationDate ?? null, ...(normalizeRights(s.rights) ? { rights: normalizeRights(s.rights) } : {}) });
  for (const x of [...facts, ...metrics]) if (isUrl(x.sourceUrl)) addSrc(x.sourceUrl);
  const unknown = [...(m.unknown ?? []), ...dropped.map((d) => `出典で確かめられず外した: ${d}`)];
  const slug = slugify(name);
  const founded = Number.isInteger(m.foundedYear) ? Number(m.foundedYear) : undefined;
  const unconfirmedOps = { teamSize: 0, weeklyHours: 0, initialCapitalRequired: 0, automationLevel: 0, primaryChannels: [], toolStack: [], isTeamSizeUnconfirmed: true, isWeeklyHoursUnconfirmed: true, isCapitalUnconfirmed: true, isAutomationUnconfirmed: true };
  return {
    id, ticker: slug.replace(/-/g, '').toUpperCase().slice(0, 8) || 'CASE', name,
    tagline: m.tagline?.trim() || c.reason, description: m.description?.trim() || m.tagline?.trim() || c.reason,
    sector: SECTORS.includes(String(m.sector)) ? m.sector : 'UNKNOWN', scale: SCALES.includes(String(m.scale)) ? m.scale : 'UNKNOWN',
    founder: m.founder?.trim() || '未確認', country: m.country?.trim() || '未確認',
    url: c.url, ...(c.url ? { officialUrl: c.url } : {}), verifiedBadge: false, growthRateYoY: 0, isGrowthUnconfirmed: true,
    architecturePattern: m.architecturePattern?.trim() || '未確認', pipelineStack: '未確認', targetPainWallet: '未確認',
    tags: Array.isArray(m.tags) ? m.tags.filter((t) => typeof t === 'string' && t) : [],
    pnl: {
      monthlyRevenue: 0, cogs: 0, grossProfit: 0, grossMargin: 0,
      operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
      operatingProfit: 0, operatingMargin: 0, estimatedAnnualNetProfit: 0,
      isRevenueUnconfirmed: true, isOperatingProfitUnconfirmed: true, isMarginUnconfirmed: true, isGrossProfitUnconfirmed: true,
      isGrossMarginUnconfirmed: true, isCogsUnconfirmed: true, isCostsUnconfirmed: true, isNetProfitUnconfirmed: true,
      financialStatus: 'UNAVAILABLE', sourceClass: 'PRIMARY', sourceDoc: c.sources[0]?.url || c.url || undefined,
    },
    operations: unconfirmedOps,
    strategy: { moatType: 'UNKNOWN', blindspot: '未確認', moatDescription: '未確認', initialTraction: [], actionPlaybook: [] },
    ...(founded ? { temporal: { foundedYear: founded, initialTractionPeriod: '未確認', dataSnapshotPeriod: `${today} 時点の公開情報`, viabilityStatus: 'UNKNOWN', viabilityLabel: '未確認', eraContext: '未確認', currentViabilityAnalysis: '未確認' } } : {}),
    facts, metrics,
    reaudit: { status: 'PARTIAL', auditDate: today, timezone: 'Asia/Tokyo', auditOwner: 'case:research', method: 'MANUAL_REAUDIT', family: 'new-collection', sources: [...srcMap.values()], supported: [], unknown, conflicts: m.conflicts ?? [] },
    observationsStream: [], observations: [], claimBindings: [], publishability: 'PUBLISHABLE', batchId: `research_${slug}_${today.replace(/-/g, '')}`, financialStatus: 'UNAVAILABLE',
    unknownsNotes: unknown,
  };
}

// ---- 取り込みの出力の読み取り --------------------------------------------------------------------

interface ImportReport { collected?: number; file?: string; unconfirmedFacts?: Record<string, number>; thinCases?: string[]; returned?: number; held?: number; returnFile?: string }
export function parseReport(stdout: string): ImportReport | undefined {
  for (const line of stdout.trim().split('\n').reverse()) { try { const j = JSON.parse(line) as ImportReport; if (j && typeof j === 'object') return j; } catch { /* 次の行 */ } }
  return undefined;
}

function repairUser(c: Candidate, compact: Compact, problems: string, texts: Map<string, string>): string {
  return `## 対象の候補\n${c.name}（${c.url}）\n\n## 直前の材料\n${JSON.stringify(compact)}\n\n## 取り込みの検査で外れた項目\n${problems}\n\n## 出典の本文\n${sourceBlock(texts)}\n\n外れた項目を直す。直し方は上の指示の「事実の文の書き方」「数字の決まり」に従う。出典の事実を変えない。直せない項目は材料から外して unknown に書く。直した材料の全体を、同じ形の JSON だけで返す。`;
}

// ---- 本体 ---------------------------------------------------------------------------------------

interface State { c: Candidate; texts: Map<string, string>; compact?: Compact; dropped: string[]; outcome?: ResearchOutcome; slug: string; t0: number; recordFile?: string; repairs: number; additionFile?: string; unconfirmedText?: string }

/** 調査待ち。researching のまま3時間を過ぎた候補（落ちた命令の物）も選び直せる */
const STALE_MS = 3 * 3600_000;
export const pickable = (r: Candidate, nowMs = Date.now()): boolean => r.status === 'queued' || (r.status === 'researching' && nowMs - Date.parse(r.researchStartedAt ?? '') > STALE_MS);

export function selectCandidates(rows: readonly Candidate[], ids: string[], next?: number): Candidate[] {
  if (ids.length) {
    return ids.map((i) => rows.find((r) => r.id === i || r.name === i || r.id.startsWith(`cand_${slugify(i)}_`))).filter((r): r is Candidate => !!r && pickable(r));
  }
  return rows.filter((r) => pickable(r)).sort((a, b) => b.priority - a.priority || a.discoveredAt.localeCompare(b.discoveredAt)).slice(0, next ?? 1);
}

export async function runResearch(opt: ResearchOptions, deps: ResearchDeps): Promise<ResearchSummary> {
  const log = opt.log ?? ((t: string) => console.log(`[case:research] ${t}`));
  const now = deps.now ?? Date.now;
  const fetchText = deps.fetchText ?? defaultFetchText;
  const repairCaller = deps.repairCaller ?? deps.caller;
  const today = opt.today ?? new Date().toISOString().slice(0, 10);
  const maxRepairs = opt.maxRepairs ?? 1;
  const T0 = now();
  // 別の命令が同じ候補を同時に選ばないよう、ロックの下で researching にして自分の物にする
  const picked = updateCandidates(opt.root, (fresh) => {
    const mine = selectCandidates(fresh, opt.ids, opt.next);
    for (const m of mine) { const row = fresh.find((r) => r.id === m.id)!; row.status = 'researching'; row.researchStartedAt = new Date().toISOString(); }
    return mine;
  });
  const missing = opt.ids.filter((i) => !picked.some((p) => p.id === i || p.name === i || p.id.startsWith(`cand_${slugify(i)}_`)));
  for (const m of missing) log(`候補に無い、または調査待ちでない: ${m}`);
  const states: State[] = picked.map((c) => ({ c, texts: new Map(), dropped: [], slug: slugify(c.name), t0: now(), repairs: 0 }));
  const recDir = join(opt.root, 'data/candidates/records');
  mkdirSync(recDir, { recursive: true });
  log(`対象 ${states.length} 件: ${states.map((s) => s.c.name).join('、')}`);

  const skip = (s: State, reason: string): void => { s.outcome = { candidateId: s.c.id, name: s.c.name, status: 'skipped', reason, seconds: (now() - s.t0) / 1000 }; log(`見送り: ${s.c.name} — ${reason}`); };
  const live = (): State[] => states.filter((s) => !s.outcome);

  // 1. 重複と予約
  const idx = buildDedupIndex(opt.root, []);
  for (const s of states) {
    const dup = idx.check(s.c.name, s.c.url);
    // 予約の一覧に自分の名前がある場合（前の実行で予約した等）は見送らない: 既存の事例か取り込み待ちにある時だけ重複
    if (dup && !/予約の一覧/.test(dup)) { skip(s, `重複: ${dup}`); continue; }
    claimTarget(opt.root, s.c.name, s.c.url, `case-research-${opt.runId}`, today, idx); // ロックを取って一覧を読み直し、無い時だけ足す
  }

  // 2. 出典の取得
  await timed(opt.root, opt.runId, 'research:fetch', live().length, async () => {
    await mapPool(live(), opt.concurrency * 2, async (s) => {
      const urls = [...new Set([...s.c.sources.map((x) => x.url), ...(s.c.url ? [s.c.url] : [])])];
      await mapPool(urls, 4, async (u) => { s.texts.set(u, await fetchText(u).catch(() => '')); });
      const good = s.c.sources.some((x) => quoteInText(x.quote, s.texts.get(x.url) ?? ''));
      if (!good) skip(s, s.c.sources.some((x) => (s.texts.get(x.url) ?? '').length) ? '数字の引用が出典の本文に無い' : '数字の出典を取得できない');
    });
    return { value: undefined, failed: states.filter((s) => s.outcome).length };
  }, now);

  // 3. 調べる役
  const ask = async (caller: Caller, s: State, system: string, user: string, label: string): Promise<boolean> => {
    try {
      const r = await caller({ system, user, label });
      const j = extractJson(r.text) as Compact | undefined;
      if (!j || typeof j !== 'object' || Array.isArray(j)) { skip(s, 'AI の返答が JSON として読めない'); return false; }
      s.compact = j; return true;
    } catch (e) { skip(s, `AI の呼び出しが失敗: ${String(e).slice(0, 160)}`); return false; }
  };
  const system = collectSystem(opt.root);
  await timed(opt.root, opt.runId, 'research:ai', live().length, async () => {
    await mapPool(live(), opt.concurrency, (s) => ask(deps.caller, s, system, collectUser(s.c, s.texts, today), `research:${s.slug}`));
    return { value: undefined, failed: states.filter((s) => s.outcome).length };
  }, now);

  // 4. 検査 → 記録 → 取り込み（取り込みの命令は共有の状態ファイルを書くので1本ずつ）
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => { const p = chain.then(fn, fn); chain = p.catch(() => undefined); return p; };
  const importOne = async (s: State): Promise<void> => {
    const v = await verifyCompact(s.compact!, fetchText, s.texts);
    s.compact = v.compact; s.dropped = v.dropped;
    if (!hasSubstantialMetric(v.compact)) { skip(s, '数字の出典が残らない（引用が本文で確かめられる数字が無い）'); return; }
    const record = buildRecord(s.c, v.compact, today, v.dropped);
    s.recordFile = join(recDir, `${s.slug}.research.json`);
    writeFileSync(s.recordFile, `${JSON.stringify([record], null, 1)}\n`);
    const args = ['scripts/reader-case/add-entity-records.ts', '--from-research', s.recordFile, '--name', s.slug, ...(opt.generation ? ['--generation', String(opt.generation)] : [])];
    const r = await serial(() => deps.exec(`import-${s.slug}`, ['--import', 'tsx', ...args]));
    const rep = parseReport(r.stdout);
    if (r.code !== 0 || !rep) { skip(s, `形の検査で落ちた: ${(r.stderr || r.stdout).trim().split('\n').slice(-2).join(' ').slice(0, 300)}`); return; }
    s.additionFile = join(opt.root, 'data/entity-additions', `${s.slug}.json`);
    const eid = String(record.id);
    const unconfirmed = rep.unconfirmedFacts?.[eid] ?? 0;
    if (rep.thinCases?.includes(eid)) { try { rmSync(s.additionFile, { force: true }); } catch { /* 無くてよい */ } skip(s, '創業も転機も出典で確認できず、薄い事例になる'); return; }
    s.outcome = { candidateId: s.c.id, name: s.c.name, status: 'recorded', entityId: eid, additionName: s.slug, recordFile: s.recordFile, seconds: 0, unconfirmed };
    if (unconfirmed > 0 && existsSync(s.additionFile)) {
      const add = JSON.parse(readFileSync(s.additionFile, 'utf8')) as { records: { record: { unconfirmedFacts?: { where: string; item: unknown; reasonLabels?: string[]; detail?: string[] }[] } }[] };
      s.unconfirmedText = JSON.stringify((add.records[0]?.record.unconfirmedFacts ?? []).map((u) => ({ where: u.where, 理由: u.reasonLabels, 直し方: u.detail, 項目: u.item })), null, 1);
    }
  };
  await timed(opt.root, opt.runId, 'research:import', live().length, async () => {
    await mapPool(live(), opt.concurrency, importOne);
    return { value: undefined, failed: states.filter((s) => s.outcome?.status === 'skipped').length };
  }, now);

  // 5. 数字の決まり・文の検査で外れた項目を直し役が直す（1回）
  for (let round = 1; round <= maxRepairs; round++) {
    const need = states.filter((s) => s.outcome?.status === 'recorded' && (s.outcome.unconfirmed ?? 0) > 0 && s.unconfirmedText && s.repairs < round);
    if (!need.length) break;
    await timed(opt.root, opt.runId, `research:repair:r${round}`, need.length, async () => {
      await mapPool(need, opt.concurrency, async (s) => {
        s.repairs = round;
        const before = s.outcome; s.outcome = undefined;
        // 直しの結果が使えなかった時に、直す前の記録と取り込み待ちのファイルへ戻せるよう、中身を控える
        const keep = (f?: string): string | undefined => (f && existsSync(f) ? readFileSync(f, 'utf8') : undefined);
        const snap = { record: keep(s.recordFile), addition: keep(s.additionFile), compact: s.compact, text: s.unconfirmedText };
        if (!(await ask(repairCaller, s, system, repairUser(s.c, s.compact!, s.unconfirmedText!, s.texts), `repair:${s.slug}`))) { s.outcome = before; s.compact = snap.compact; return; }
        await importOne(s);
        if ((s.outcome as ResearchOutcome | undefined)?.status === 'skipped') {
          s.outcome = before; s.compact = snap.compact; s.unconfirmedText = snap.text;
          if (snap.record !== undefined && s.recordFile) writeFileSync(s.recordFile, snap.record);
          if (snap.addition !== undefined && s.additionFile) { mkdirSync(dirname(s.additionFile), { recursive: true }); writeFileSync(s.additionFile, snap.addition); }
          log(`${s.c.name}: 直しの結果が使えず、直す前の記録のまま`);
        }
      });
      return { value: undefined };
    }, now);
  }

  // 6. 一覧に入れる
  const recorded = states.filter((s) => s.outcome?.status === 'recorded');
  const applied: string[] = [];
  if (opt.apply && recorded.length) {
    await timed(opt.root, opt.runId, 'research:apply', recorded.length, async () => {
      const r = await deps.exec('apply', ['--import', 'tsx', 'scripts/reader-case/add-entity-records.ts', '--apply']);
      const rep = parseReport(r.stdout) as { added?: string[]; skipped?: { id: string; reason: string }[] } | undefined;
      if (r.code !== 0 || !rep) throw new Error(`一覧への取り込みが失敗: ${(r.stderr || r.stdout).slice(-300)}`);
      for (const s of recorded) {
        const eid = s.outcome!.entityId!;
        const sk = rep.skipped?.find((k) => k.id === eid);
        if (sk) { try { rmSync(s.additionFile!, { force: true }); } catch { /* 無くてよい */ } skip(s, `一覧に入れられない: ${sk.reason}`); }
        else applied.push(eid);
      }
      const sync = await deps.exec('registry-sync', ['pnpm', 'registry:sync']);
      if (sync.code !== 0) log(`registry:sync が失敗（取り込み自体は済み）: ${sync.stderr.slice(-200)}`);
      return { value: undefined, failed: states.filter((s) => s.outcome?.status === 'skipped').length };
    }, now);
  }

  // 7. queue と ids ファイル
  for (const s of states) if (s.outcome) s.outcome.seconds = Math.round((now() - s.t0) / 100) / 10;
  updateCandidates(opt.root, (all) => {
    for (const s of states) {
      const row = all.find((r) => r.id === s.c.id); const o = s.outcome;
      if (!row || !o) continue;
      row.researchedAt = new Date().toISOString(); row.researchRunId = opt.runId;
      if (o.status === 'recorded' && applied.includes(o.entityId!)) { row.status = 'done'; row.entityId = o.entityId; delete row.researchStartedAt; }
      else if (o.status === 'recorded') { row.status = 'queued'; delete row.researchStartedAt; } // --no-apply: 一覧に入れていない。調査待ちのまま（記録は残る）
      else { row.status = 'skipped'; row.skipReason = o.reason ?? '取り込まれなかった'; delete row.researchStartedAt; }
    }
    // 結果が出なかった（途中で例外など）候補を researching のまま残さない
    for (const s of states) { const row = all.find((r) => r.id === s.c.id); if (row && row.status === 'researching' && !s.outcome) { row.status = 'queued'; delete row.researchStartedAt; } }
  });
  const workDir = join(opt.root, 'data/pipeline/case-run', opt.runId);
  mkdirSync(workDir, { recursive: true });
  // case:run が読めるのは一覧に入った事例だけ。--no-apply の時は ids ファイルを出さない
  const ids = applied;
  const idsFile = ids.length ? join(workDir, 'research.ids.txt') : undefined;
  if (idsFile) writeFileSync(idsFile, `${ids.join('\n')}\n`);
  const summary: ResearchSummary = { runId: opt.runId, outcomes: states.map((s) => s.outcome!).filter(Boolean), applied, idsFile, seconds: Math.round((now() - T0) / 100) / 10 };
  writeFileSync(join(workDir, 'research-summary.json'), JSON.stringify(summary, null, 1));
  return summary;
}

function parseArgs(argv: string[]) {
  const val = (k: string): string | undefined => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const ids = (val('--ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const next = val('--next') ? Number(val('--next')) : undefined;
  if (!ids.length && !(next && next > 0)) throw new Error('--ids <候補ID,…> か --next N が要る');
  const gen = val('--generation');
  if (gen !== undefined && !(Number.isInteger(Number(gen)) && Number(gen) >= 1)) throw new Error('--generation は1以上の整数');
  return {
    ids, next, apply: !argv.includes('--no-apply'), generation: gen ? Number(gen) : undefined,
    agent: (val('--agent') ?? 'codex') as Agent | 'auto', repairAgent: (val('--repair-agent') ?? 'claude') as Agent | 'auto',
    model: val('--model'), codexEffort: val('--codex-effort'), concurrency: Math.max(1, Number(val('--concurrency') ?? 3)),
    runId: val('--run-id') ?? `research-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`,
  };
}

async function main(): Promise<number> {
  const a = parseArgs(process.argv.slice(2));
  const agent = a.agent === 'auto' ? pickAgent('auto') : a.agent;
  const repairAgent = a.repairAgent === 'auto' ? pickAgent('auto') : a.repairAgent;
  const caller = makeCaller(agent, { model: a.model, codexEffort: a.codexEffort ?? 'medium', web: true, timeoutMs: 30 * 60_000 });
  // 文の直しは Sonnet（claude -p）。Opus は使わない
  const repairCaller = makeCaller(repairAgent, { model: repairAgent === 'claude' ? 'sonnet' : a.model });
  const exec = makeExec(ROOT, join(ROOT, 'data/pipeline/case-run', a.runId, 'logs'));
  const s = await runResearch({ root: ROOT, ids: a.ids, next: a.next, runId: a.runId, concurrency: a.concurrency, generation: a.generation, apply: a.apply }, { caller, repairCaller, exec });
  const rec = s.outcomes.filter((o) => o.status === 'recorded');
  console.log(`\n調査記録を作った ${rec.length} 件 / 見送り ${s.outcomes.length - rec.length} 件（${s.seconds}秒）`);
  for (const o of s.outcomes) console.log(o.status === 'recorded' ? `- 作成: ${o.name} → ${o.entityId}（${o.seconds}秒、外れた項目 ${o.unconfirmed ?? 0}）` : `- 見送り: ${o.name} — ${o.reason}（${o.seconds}秒）`);
  if (s.idsFile) console.log(`次: pnpm case:run --ids-file ${s.idsFile}`);
  console.log(JSON.stringify({ runId: s.runId, recorded: rec.map((o) => o.entityId), skipped: s.outcomes.filter((o) => o.status === 'skipped').map((o) => ({ id: o.candidateId, reason: o.reason })), idsFile: s.idsFile ?? null, seconds: s.seconds }));
  return rec.length ? 0 : 3;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c), (e) => { console.error(`[case:research] ${(e as Error).message}`); process.exit(1); });
}
