/**
 * eBiz Facts 抽出結果の適用（apply-ebiz-facts v1）— 2026-09-29 / レーンB
 *
 * 調査担当が保存済み原文（data/r2-local/ebiz-text/）を読んで書いた「自分の言葉の事実」
 * reports/reaudit-ebiz-facts/batch-NNN.facts.json を、candidate-skeleton の雛形へ機械的に埋め込み、
 * validate-candidates を実行し、進捗（reports/reaudit-ebiz-progress.json）と報告表（reports/reaudit-ebiz-20260929.md）を更新する。
 * 原文は一切コピーしない（facts には日本語の要約・数値・URL だけを書く）。pnl の数値は 0 のまま全項目 unconfirmed に保つ。月次換算・推計は挿入しない。
 *
 * 使い方: node --import tsx scripts/reaudit/apply-ebiz-facts.ts --batch 1 [--size 25]
 *   batch N は ebizfacts 内の index (N-1)*size 〜 N*size-1 を担当（最終バッチは 760 まで）。
 *
 * facts 1件の形（JSON。文字列内に二重引用符は使わず「」を使う）:
 *   { "i": 12, "n": "Kevin Hardin",                 // ebizfacts 内 index と、カタログ name に含まれる名前（取り違え防止）
 *     "tag": "…", "what": "…", "who": "…", "pain": "…",   // 金額・記号を含めない日本語
 *     "price": "…"|null,                              // 価格・プラン（記事記載。金額を含んでよい。カード/観測にのみ出る）
 *     "m": [["$40,000","MONTHLY_REVENUE","月次売上","self","補足","USD",40000], …],  // [原文金額, 単位コード, 表示ラベル, 出所(self|art|3rd), 補足?, 通貨?, 数値?]（先頭が見出し金額。通貨・数値は原文金額から読めない時だけ）
 *     "tools": ["Shopify","Stripe|PAYMENT"], "chan": "…"|null, "ch": ["Reddit"],   // ツール名 / 集客経路の記述 / 主要チャネル短縮名
 *     "team": "…"|null, "since": "…"|null,           // チーム・稼働 / 開始時期（記事に明示がある時だけ）
 *     "links": [["https://…","founder"|"official"|"cited"]],  // 記事が引用する 創業者本人の一次発信 / 公式サイト / 第三者ページ（本人の発言を載せた取材・ニュースレター等）
 *     "sup": ["…"], "skip": "理由" }                   // その他の裏付け事実（日本語）/ 除外する場合の理由
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

type AnyRecord = Record<string, unknown>;
type Who = 'self' | 'art' | '3rd';
type MoneyTuple = [string, string, string, Who, string?, string?, number?];
interface Facts {
  i: number; n: string; tag?: string; what?: string; who?: string; pain?: string; price?: string | null; m?: MoneyTuple[]; tools?: string[];
  chan?: string | null; ch?: string[]; team?: string | null; since?: string | null; links?: [string, 'official' | 'founder' | 'cited'][]; sup?: string[]; skip?: string;
  /** 記録の url（雛形が「公式サイト」Tier1 として登録）が公式サイトではない時の再判定: cited=第三者ページ / founder=本人の投稿ページ / drop=出典から外す */
  off?: 'cited' | 'founder' | 'drop';
}

const ROOT = process.cwd();
const AUDIT_DATE = '2026-09-29';
const OWNER = 'lane:B ebiz-raw agent';
const TEXT_ROOT = resolve(ROOT, 'data/r2-local/ebiz-text');
const RAW_ROOT = resolve(ROOT, 'data/r2-local/foundation-raw');
const FACTS_DIR = resolve(ROOT, 'reports/reaudit-ebiz-facts');
const PROGRESS = resolve(ROOT, 'reports/reaudit-ebiz-progress.json');
const REPORT = resolve(ROOT, 'reports/reaudit-ebiz-20260929.md');
const WHO_LABEL: Record<Who, string> = { self: '本人申告', art: '記事記載', '3rd': '第三者の報告' };
const MONTHLY_UNITS = new Set(['MONTHLY_REVENUE', 'MONTHLY_PROFIT', 'MONTHLY_INCOME', 'BEST_MONTH_REVENUE', 'MRR']);
const UNIT_LABEL: Record<string, string> = {
  MONTHLY_REVENUE: '月次売上', MONTHLY_PROFIT: '月次利益', MONTHLY_INCOME: '月次収入', ANNUAL_REVENUE: '年間売上', ANNUAL_PROFIT: '年間利益', ANNUAL_INCOME: '年間収入',
  WEEKLY_REVENUE: '週次売上', DAILY_REVENUE: '日次売上', BEST_MONTH_REVENUE: '最高月の売上', CUMULATIVE_REVENUE: '累計売上', PERIOD_REVENUE: '期間売上', PERIOD_PROFIT: '期間利益',
  PRICE: '販売価格', COST: '費用', FUNDING: '調達額', EXIT_VALUE: '売却額', PRIZE: '賞金', OTHER_AMOUNT: 'その他の金額', MRR: 'MRR',
};
const CURRENCY: Record<string, string> = { '$': 'USD', 'US$': 'USD', USD: 'USD', 'A$': 'AUD', 'AU$': 'AUD', AUD: 'AUD', 'C$': 'CAD', 'CA$': 'CAD', CAD: 'CAD', 'NZ$': 'NZD', NZD: 'NZD', '£': 'GBP', GBP: 'GBP', '€': 'EUR', EUR: 'EUR', '¥': 'JPY', JPY: 'JPY', '₹': 'INR', INR: 'INR' };
const FORBIDDEN = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所', 'Indie Hackers表示', '報告値・利益ではない', '掲載タグラインが示す課題', '防御要因は未確認'];

const args = process.argv.slice(2);
const opt = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const batch = Number.parseInt(opt('batch') ?? '', 10);
const size = Number.parseInt(opt('size') ?? '25', 10);
if (!Number.isFinite(batch) || batch < 1) { console.error('usage: --batch N [--size 25]'); process.exit(64); }

const isHttp = (v: unknown): v is string => typeof v === 'string' && /^https?:\/\//i.test(v);
const hostOf = (u: string): string => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const pad = (n: number): string => String(n).padStart(3, '0');
const sha256 = (buf: Buffer): string => createHash('sha256').update(buf).digest('hex');

function parseMoney(original: string): { currency: string; amount: number } | null {
  const m = /^(US\$|USD|AU\$|A\$|AUD|CA\$|C\$|CAD|NZ\$|NZD|GBP|£|EUR|€|JPY|¥|INR|₹|\$)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(thousand|million|billion|bn|k|m|b)?(?![a-z])/i.exec(original.trim());
  if (!m) return null;
  const currency = CURRENCY[m[1].toUpperCase()] ?? CURRENCY[m[1]];
  if (!currency) return null;
  const base = Number.parseFloat(m[2].replace(/,/g, ''));
  const mult = ({ k: 1e3, thousand: 1e3, m: 1e6, million: 1e6, b: 1e9, bn: 1e9, billion: 1e9 } as Record<string, number>)[(m[3] ?? '').toLowerCase()] ?? 1;
  return { currency, amount: Math.round(base * mult * 100) / 100 };
}

interface Metric { original: string; currency: string; amount: number; unit: string; label: string; who: Who; note: string }

function buildMetrics(f: Facts, problems: string[]): Metric[] {
  const out: Metric[] = [];
  for (const t of f.m ?? []) {
    const [original, unit, label, who, note, curOverride, amtOverride] = t;
    const parsed = parseMoney(original);
    const currency = curOverride ?? parsed?.currency; const amount = typeof amtOverride === 'number' ? amtOverride : parsed?.amount;
    if (!currency || typeof amount !== 'number') { problems.push(`money not parseable: ${original} (give currency and amount)`); continue; }
    if (!['self', 'art', '3rd'].includes(who)) problems.push(`bad who for ${original}: ${String(who)}`);
    if (!(unit in UNIT_LABEL)) problems.push(`unknown unit ${unit}`);
    const plainLabel = (label || UNIT_LABEL[unit] || 'その他の金額').replace(/（([^（）]*)）/g, '・$1');
    out.push({ original, currency, amount, unit, label: plainLabel, who, note: note ?? '' });
  }
  return out;
}

const listText = (a: string[]): string => a.join('、');
/** 権利3層: 公式サイト=Tier1、GitHub・アプリストア・プレス配信=Tier1(platform)、それ以外の一次発信・第三者ページ=Tier2(事実のみ)。LinkedIn は Tier3 で出典に入れない。 */
function tierFor(url: string, kind: string): string {
  if (/(^|\.)(github\.com|apps\.apple\.com|play\.google\.com|prnewswire\.com|globenewswire\.com|businesswire\.com|prtimes\.jp)$/.test(hostOf(url))) return 'TIER1_PLATFORM';
  return kind === 'official' ? 'TIER1_OFFICIAL' : 'TIER2_FACTS_ONLY';
}
/** Tier 3（LinkedIn・有料本文の媒体）は出典に入れない。 */
const BLOCKED_SOURCE_HOSTS = /(^|\.)(linkedin\.com|wsj\.com|ft\.com|barrons\.com|economist\.com|nytimes\.com)$/;
/** 雛形は record.url を「公式サイト（Tier1）」として登録する。記事本文の最初のリンクが第三者の記事・SNS・アーカイブだった記録では公式ではない。
 *  SOCIAL_HOSTS: links に載せていなくても公式扱いを外す（SNS・アーカイブ）。POST_PLATFORM_HOSTS: 本人の投稿ページだと links に founder と書いた時に Tier2 へ下げる。 */
const SOCIAL_HOSTS = /(^|\.)(twitter\.com|x\.com|youtube\.com|youtu\.be|instagram\.com|tiktok\.com|facebook\.com|threads\.net|threads\.com|pinterest\.com|reddit\.com|web\.archive\.org)$/;
const POST_PLATFORM_HOSTS = /(^|\.)(twitter\.com|x\.com|youtube\.com|youtu\.be|instagram\.com|tiktok\.com|facebook\.com|threads\.net|threads\.com|pinterest\.com|reddit\.com|medium\.com|substack\.com|indiehackers\.com|news\.ycombinator\.com|producthunt\.com|upwork\.com|fiverr\.com|italki\.com|github\.com)$/;
const SELF_HOSTS = /(^|\.)ebizfacts\.com$/;
interface Relabel { url: string; action: 'dropped' | 'downgraded'; kind: string; tier: string; reason: string }
const normUrl = (u: string): string => u.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();

function moneyLine(m: Metric): string { return `${m.original}（${m.label}）／${WHO_LABEL[m.who]}${m.note ? `／${m.note}` : ''}`; }
const shortMoney = (m: Metric): string => `${m.original}（${m.label}・${WHO_LABEL[m.who]}）`;

/** facts に書いた URL・金額が、読んだ原文テキストに実在するか（転記ミスの検出）。URL は誤りとして扱い、金額の数字は警告。 */
function verifyAgainstText(id: string, f: Facts, problems: string[], warnings: string[]): void {
  const p = resolve(TEXT_ROOT, `${id}.txt`);
  if (!existsSync(p)) return;
  const text = readFileSync(p, 'utf8');
  const norm = (u: string): string => u.replace(/[?#].*$/, '').replace(/\/+$/, '').toLowerCase();
  const urls = new Set<string>();
  for (const raw of text.match(/https?:\/\/\S+/g) ?? []) { urls.add(norm(raw)); urls.add(norm(raw.replace(/[).,;\]>]+$/, ''))); }
  for (const [u] of f.links ?? []) if (!urls.has(norm(u))) problems.push(`link not found in the stored text: ${u}`);
  const flat = text.replace(/\s+/g, ' ').toLowerCase();
  for (const t of f.m ?? []) {
    const digits = /[0-9][0-9,]*(?:\.[0-9]+)?/.exec(t[0])?.[0];
    if (digits && !flat.includes(digits.toLowerCase()) && !flat.replace(/,/g, '').includes(digits.replace(/,/g, '').toLowerCase())) warnings.push(`money digits not found in text: ${t[0]}`);
  }
}

function apply(rec: AnyRecord, f: Facts, index: number, pool: AnyRecord[]): { rec: AnyRecord; problems: string[]; warnings: string[]; counts: Record<string, number>; relabels: Relabel[] } {
  const problems: string[] = [];
  const warnings: string[] = [];
  const id = String(rec.id);
  verifyAgainstText(id, f, problems, warnings);
  const sm = (rec.sourceMetadata as AnyRecord | undefined) ?? {};
  const pub = typeof sm.publishedAt === 'string' ? sm.publishedAt.slice(0, 10) : '掲載日不明';
  const reaudit = { ...((rec.reaudit as AnyRecord | undefined) ?? {}) };
  let sources = Array.isArray(reaudit.sources) ? (reaudit.sources as AnyRecord[]).map((s) => ({ ...s })) : [];
  const articleUrl = String(sources[0]?.url ?? (rec.pnl as AnyRecord | undefined)?.sourceDoc ?? '');
  const officialUrl = typeof rec.officialUrl === 'string' ? rec.officialUrl : (typeof rec.url === 'string' ? rec.url : '');

  if (!String(rec.name).toLowerCase().includes(f.n.toLowerCase())) problems.push(`name check failed: catalog "${String(rec.name)}" does not contain "${f.n}"`);
  for (const k of ['tag', 'what', 'who', 'pain'] as const) if (!f[k] || !String(f[k]).trim()) problems.push(`missing ${k}`);
  const metrics = buildMetrics(f, problems);
  const tools = (f.tools ?? []).map((t) => { const [name, cat] = t.split('|'); return { name: name.trim(), category: (cat ?? 'OTHER').trim() }; }).filter((t) => t.name);
  const channels = (f.ch ?? []).filter(Boolean);
  const links = (f.links ?? []).filter(([u]) => isHttp(u));
  f.price = f.price ? f.price.replace(/[（(]記事記載[）)]\s*$/, '').trim() : f.price;

  // --- 雛形が「公式サイト（Tier1）」として登録した出典の再判定（第三者の記事・SNS・記事自身を Tier1 のまま流さない）
  const relabels: Relabel[] = [];
  {
    const kindByUrl = new Map<string, string>(links.map(([u, k]) => [normUrl(u), k]));
    const kept: AnyRecord[] = [];
    for (const s of sources) {
      if (s.sourceType !== 'official_website' || s.publisher !== '公式サイト') { kept.push(s); continue; }
      const u = String(s.url); const h = hostOf(u);
      const k = kindByUrl.get(normUrl(u)) ?? f.off;
      const drop = f.off === 'drop' || BLOCKED_SOURCE_HOSTS.test(h) || SELF_HOSTS.test(h) || (articleUrl !== '' && normUrl(u) === normUrl(articleUrl));
      if (drop) {
        relabels.push({ url: u, action: 'dropped', kind: 'none', tier: 'none', reason: BLOCKED_SOURCE_HOSTS.test(h) ? 'Tier3 host (paywalled press / LinkedIn) must not be a source' : SELF_HOSTS.test(h) || (articleUrl !== '' && normUrl(u) === normUrl(articleUrl)) ? 'same page as the eBiz article source' : 'marked off=drop' });
        continue;
      }
      let kind: string | undefined = k === 'official' ? undefined : k;
      if (kind === 'founder' && !POST_PLATFORM_HOSTS.test(h)) kind = undefined; // 本人の個人サイト・事業サイトは entity-bound の公式サイトとして雛形のまま
      if (!k && SOCIAL_HOSTS.test(h)) kind = /web\.archive\.org$/.test(h) ? 'cited' : 'founder';
      if (!kind) { kept.push(s); continue; }
      const tier = tierFor(u, kind);
      kept.push({ ...s, publisher: h, sourceType: kind === 'founder' ? 'founder_primary_post_cited_by_article' : 'third_party_page_cited_by_article', periodCovered: '記事が引用したURL。本担当は再取得していない。', claimStatus: 'CITED_BY_ARTICLE_NOT_REOPENED', rightsTier: tier });
      relabels.push({ url: u, action: 'downgraded', kind, tier, reason: kind === 'founder' ? '本人の投稿・プロフィールページ（公式サイトではない）' : '第三者のページ（公式サイトではない）' });
    }
    sources = kept;
  }

  // --- 出典（記事が引用する一次発信・公式サイト）
  const known = new Set(sources.map((s) => String(s.url).replace(/\/+$/, '')));
  const extraSources: AnyRecord[] = [];
  for (const [url, kind] of links) {
    if (known.has(url.replace(/\/+$/, ''))) continue;
    if (BLOCKED_SOURCE_HOSTS.test(hostOf(url))) { problems.push(`Tier 3 host must not be a source (LinkedIn / paywalled press): ${url}`); continue; }
    known.add(url.replace(/\/+$/, ''));
    extraSources.push({
      url, publisher: kind === 'official' ? '公式サイト（記事内リンク）' : hostOf(url),
      sourceType: kind === 'official' ? 'official_website' : kind === 'founder' ? 'founder_primary_post_cited_by_article' : 'third_party_page_cited_by_article',
      publicationDate: null, checkedAt: AUDIT_DATE, periodCovered: '記事が引用したURL。本担当は再取得していない。',
      claimStatus: 'CITED_BY_ARTICLE_NOT_REOPENED', rightsTier: tierFor(url, kind), rawStoredPrivately: false,
    });
  }

  // --- 原文の所在（読み取り専用で参照した保存済み HTML）
  let rawEvidence: AnyRecord = { bucket: 'foundation-raw', note: 'payloadKey なし' };
  const rawStorage = (sm.rawStorage as AnyRecord | undefined) ?? {};
  let payloadKey = typeof rawStorage.payloadKey === 'string' ? rawStorage.payloadKey : '';
  let resolvedBy = 'record';
  if (!payloadKey && existsSync(resolve(TEXT_ROOT, '_payload-key-overrides.json'))) {
    const ov = (JSON.parse(readFileSync(resolve(TEXT_ROOT, '_payload-key-overrides.json'), 'utf8')) as Record<string, AnyRecord>)[id];
    if (ov && typeof ov.payloadKey === 'string') { payloadKey = ov.payloadKey; resolvedBy = `post-id-match (${String(ov.matchedBy)})`; }
  }
  if (payloadKey) {
    const p = resolve(RAW_ROOT, payloadKey);
    rawEvidence = { bucket: 'foundation-raw', payloadKey, resolvedBy, ...(existsSync(p) ? { bytes: readFileSync(p).length, sha256: sha256(readFileSync(p)) } : {}), readOnly: true };
  }

  // --- 見出しラベル（既存形式を維持）
  const head = metrics[0];
  const revenueLabel = head
    ? `${WHO_LABEL[head.who]} ${head.original}（${head.label}）/ eBiz Facts ${pub}掲載・独立確認なし${MONTHLY_UNITS.has(head.unit) ? '' : '・月次換算なし'}`
    : '売上未確認（記事に金額の記載なし）';
  const pnl: AnyRecord = { ...(rec.pnl as AnyRecord), revenueLabel, financialStatus: head ? 'REPORTED' : 'UNAVAILABLE' };
  for (const k of ['monthlyRevenue', 'cogs', 'grossProfit', 'grossMargin', 'operatingProfit', 'operatingMargin', 'estimatedAnnualNetProfit']) if (pnl[k] !== 0) problems.push(`pnl.${k} is not 0`);

  const reportedMetrics = metrics.map((m) => ({
    original: m.original, currency: m.currency, amount: m.amount, unit: m.unit, source: 'ebizfacts-article',
    context: `${m.label}／${WHO_LABEL[m.who]}／記事掲載${pub}${m.note ? `／${m.note}` : ''}`,
  }));

  // --- カード（既存の出典カードは残し、詳細を原文断片なしの要約へ。要約カードを1枚追加）
  let cards = (Array.isArray(rec.evidenceCards) ? (rec.evidenceCards as AnyRecord[]) : []).map((c) => ({ ...c }));
  for (const r of relabels) {
    const same = (c: AnyRecord): boolean => normUrl(String(c.url ?? '')) === normUrl(r.url);
    if (r.action === 'dropped') {
      cards = cards.filter((c) => !(String(c.id).endsWith('_reaudit_source_official') && same(c)));
      if (BLOCKED_SOURCE_HOSTS.test(hostOf(r.url))) for (const c of cards) if (same(c)) c.url = articleUrl; // Tier3 の URL を証拠カードのリンクに残さない（記事自身へ）
    } else {
      const off = cards.find((c) => String(c.id).endsWith('_reaudit_source_official') && same(c));
      if (off) {
        off.title = r.kind === 'founder' ? '出典: 本人の投稿・プロフィールページ（記事が引用）' : '出典: 記事が引用した第三者ページ';
        off.punchline = '公式サイトではない。記事が引用したページのURLを記録しただけで、この再監査ではページを再取得していない。';
        off.sourceNote = `${r.kind === 'founder' ? 'founder primary page' : 'third-party page'} cited by article ${r.url} / rights: ${r.tier.startsWith('TIER1') ? 'Tier 1 platform' : 'Tier 2 facts-only'}`;
        off.sourceClass = r.kind === 'founder' ? 'PRIMARY' : 'INDEPENDENT_SECONDARY';
      }
    }
  }
  const srcCard = cards.find((c) => String(c.id).endsWith('_reaudit_source_ebizfacts'));
  if (srcCard) {
    srcCard.punchline = head ? `記事は金額を${metrics.length}件掲載（${WHO_LABEL[head.who]}が中心）。独立した会計確認はない。` : '記事は事業の紹介のみで、金額は掲載されていない。';
    srcCard.evidenceStatus = head ? 'REPORTED' : 'UNKNOWN';
    srcCard.details = [
      head ? `金額${metrics.length}件の内訳は「本人申告の要約」カードに別掲` : '金額の記載なし',
      `掲載日: ${pub} / 確認日: ${AUDIT_DATE} / 権利: 事実のみ表示（原文・画像は転載しない）`,
    ];
  } else problems.push('existing eBiz source card not found');
  const limits = cards.find((c) => String(c.id).endsWith('_reaudit_limits'));
  const stillUnknown: string[] = ['本人申告の金額の独立確認（決済記録・会計書類は未確認）', '原価・利益・手残りの実額'];
  if (!f.team) stillUnknown.push('チーム規模・稼働時間・初期資本');
  if (!f.since) stillUnknown.push('創業年・開始時期');
  stillUnknown.push('記事掲載後の稼働状況');
  if (!f.chan && channels.length === 0) stillUnknown.push('集客経路');
  if (tools.length === 0) stillUnknown.push('ツール構成');
  if (!f.price) stillUnknown.push('価格・プラン');
  if (limits) {
    limits.punchline = `独立確認と原価・利益・手残りは未確認${f.team ? '' : '、チーム規模'}${f.since ? '' : '、開始時期'}${(f.chan || channels.length) ? '' : '、集客経路'}${tools.length ? '' : '、ツール構成'}も未確認。記事の金額は出所を付けて別掲。`;
    limits.details = [
      ...stillUnknown.map((u) => `未確認: ${u}`),
      `次の作業: 記事が引用した創業者の一次発信と公式サイトを再取得し、出典・時点・利用条件付きで確認する（${AUDIT_DATE} 時点）`,
    ];
  } else problems.push('existing limits card not found');
  const summaryDetails: string[] = [
    ...metrics.map(moneyLine),
    ...(f.price ? [`価格・プラン（記事記載）: ${f.price}`] : []),
    ...(tools.length ? [`ツール（記事記載）: ${listText(tools.map((t) => t.name))}`] : []),
    ...(f.chan ? [`集客経路（記事記載）: ${f.chan}`] : []),
    ...(f.team ? [`チーム・稼働（記事記載）: ${f.team}`] : []),
    ...(f.since ? [`開始時期（記事記載）: ${f.since}`] : []),
    `掲載日: ${pub} / 確認日: ${AUDIT_DATE} / 権利: 事実のみ表示（自分の言葉で要約。原文・画像は転載しない）`,
  ];
  const summaryCard = {
    id: `${id}_reaudit_selfreport`, type: 'UNKNOWN_AUDIT', title: '本人申告の要約（記事から再抽出した金額・期間）', badge: head ? WHO_LABEL[head.who] : '金額なし',
    evidenceStatus: head ? 'REPORTED' : 'UNKNOWN',
    punchline: head ? `${WHO_LABEL[head.who]} ${head.original}（${head.label}）ほか計${metrics.length}件を記載。期間・単位は記事のとおりで、月次換算はしていない。独立確認なし。` : '記事に金額の記載はない。事業内容・ツール・集客の記述だけを要約した。',
    details: summaryDetails, url: articleUrl,
    sourceNote: `eBiz Facts ${articleUrl} / ${AUDIT_DATE} に保存済み原文から再抽出 / rights: Tier 2 facts-only（原文は非公開のまま）`, sourceClass: 'INDEPENDENT_SECONDARY',
  };
  const at = cards.findIndex((c) => String(c.id).endsWith('_reaudit_source_ebizfacts'));
  cards.splice(at >= 0 ? at + 1 : cards.length, 0, summaryCard);

  // --- 観測（機械生成の英語要約・穴あき見出しを外し、自分の言葉の行へ）
  const dropPrefix = ['eBiz Factsプロフィール記事:', '記事更新日:', '記事要約:', '記事記載金額:', '外部リンク候補:'];
  const keptObs = (Array.isArray(rec.observations) ? (rec.observations as unknown[]) : []).filter((o): o is string => typeof o === 'string' && !dropPrefix.some((p) => o.startsWith(p)));
  const observations = [
    `eBiz Factsのプロフィール記事（${pub}掲載）を保存済み原文から再抽出（${AUDIT_DATE}）。原文は非公開のまま、自分の言葉で要約。`,
    head ? `記事が載せる金額（独立確認なし）: ${metrics.map(shortMoney).join('、')}` : '記事に金額の記載なし。',
    ...(f.price ? [`価格・プラン（記事記載）: ${f.price}`] : []),
    ...(tools.length ? [`ツール（記事記載）: ${listText(tools.map((t) => t.name))}`] : []),
    ...(f.chan ? [`集客経路（記事記載）: ${f.chan}`] : []),
    ...(f.team ? [`チーム・稼働（記事記載）: ${f.team}`] : []),
    ...(f.since ? [`開始時期（記事記載）: ${f.since}`] : []),
    ...(links.length ? [`記事が引用するURL: ${links.map(([u]) => u).join(' , ')}`] : []),
    ...keptObs,
  ];
  const stream = (Array.isArray(rec.observationsStream) ? (rec.observationsStream as AnyRecord[]) : []).map((o) => ({ ...o }));
  stream.push({
    id: `${id}-reaudit-20260929-ebiz-raw`, category: 'RESEARCH_LIMIT', originType: 'reported', verificationStatus: 'UNVERIFIED',
    text: head
      ? `${AUDIT_DATE} 保存済み原文から再抽出: 記事が載せる金額は${metrics.map(shortMoney).join('、')}。独立確認なし。月次への換算・推計はしていない。`
      : `${AUDIT_DATE} 保存済み原文から再抽出: 記事に金額の記載はない。`,
    sourceUrl: articleUrl, observedAt: AUDIT_DATE, sourceClass: 'INDEPENDENT_SECONDARY',
  });

  // --- 運用（記事に明示のあるツール・チャネルだけ。費用は未確認のまま）
  const ops = { ...(rec.operations as AnyRecord) };
  if (tools.length) ops.toolStack = tools.map((t) => ({ name: t.name, category: t.category, monthlyCost: 0, isCostUnconfirmed: true, purpose: 'eBiz Factsの記事に使用の記載あり（費用は未確認）' }));
  if (channels.length) ops.primaryChannels = channels;

  // --- reaudit ブロック
  const supported: string[] = [
    `eBiz Factsの掲載ページ（${pub}掲載）の保存済み原文から再抽出（原文は非公開のまま。転載なし）`,
    `事業内容（記事記載）: ${f.what}`,
    ...metrics.map((m) => `金額: ${moneyLine(m)}`),
    ...(f.price ? [`価格・プラン（記事記載）: ${f.price}`] : []),
    ...(tools.length ? [`ツール（記事記載）: ${listText(tools.map((t) => t.name))}`] : []),
    ...(f.chan ? [`集客経路（記事記載）: ${f.chan}`] : []),
    ...(f.team ? [`チーム・稼働（記事記載）: ${f.team}`] : []),
    ...(f.since ? [`開始時期（記事記載）: ${f.since}`] : []),
    ...links.map(([u, k]) => `${k === 'official' ? '公式サイト' : k === 'founder' ? '創業者の一次発信' : '本人の発言を載せた第三者ページ'}を記事が引用: ${u}`),
    ...(f.sup ?? []),
  ];
  const unresearched = ['記事が引用した創業者の一次発信・公式サイトの再取得と、金額・時点の突き合わせ', '出典の利用条件の個別確認（Tier 2: 事実のみ表示）'];
  const newReaudit: AnyRecord = {
    ...reaudit,
    status: 'PARTIAL', auditDate: AUDIT_DATE, timezone: 'Asia/Tokyo', method: 'MANUAL_REAUDIT', lane: 'ebiz', auditOwner: OWNER,
    sources: [...sources, ...extraSources], supported, unknown: stillUnknown, unresearched,
    rights: { status: 'REVIEWED', permission: 'FACTS_ONLY_WITH_ATTRIBUTION', basis: 'eBiz Facts Tier 2 facts-only; raw stays private' },
    rawEvidence, extractionNote: `eBiz Facts保存済み原文（foundation-raw）を読み取り専用で参照し ${AUDIT_DATE} に再抽出。金額は本人申告等として別掲し、pnl は 0/未確認のまま。月次換算・推計なし。`,
  };
  delete newReaudit.skeletonNote;

  const next: AnyRecord = {
    ...rec, tagline: f.tag, pnl, evidenceCards: cards, observations, observationsStream: stream, operations: ops,
    essence: { whatItDoes: f.what, targetCustomer: f.who, painRelief: f.pain }, reportedMetrics, reaudit: newReaudit,
  };

  // --- 追加の局所検査（check-ingest-quality / validate-candidates と同じ観点）
  const moneyish = /[¥$€£₹]\s?\d|\d\s?(億|万|千)?円|\d\s?ドル|\d\s?ユーロ|\d\s?ポンド/;
  for (const k of ['tag', 'what', 'who', 'pain'] as const) {
    const v = String(f[k] ?? '');
    if (moneyish.test(v)) problems.push(`${k} contains a money figure`);
    if (!/[ぁ-んァ-ヶ]/.test(v)) problems.push(`${k} has no Japanese kana`);
  }
  if (String(f.what ?? '').startsWith(`${String(rec.name)}は`) || String(f.what ?? '').startsWith(`${String(rec.name)}が`) || String(f.what ?? '').includes('は、「')) problems.push('what starts with entity name / contains は、「');
  if (String(f.tag ?? '').length > 70) problems.push(`tag too long (${String(f.tag).length})`);
  const text = JSON.stringify(next, (k, v) => (k === 'sourceMetadata' || k === 'legacyDisplaySnapshot' ? undefined : v));
  for (const w of FORBIDDEN) if (text.includes(w)) problems.push(`forbidden phrase: ${w}`);
  if (/〔金額未確認〕/.test(JSON.stringify([f.tag, f.what, f.who, f.pain, f.price, f.chan, f.team, f.since, f.sup]))) problems.push('facts contain 〔金額未確認〕 placeholder');
  void index; void pool; void officialUrl;
  return { rec: next, problems, warnings, relabels, counts: { money: metrics.length, price: f.price ? 1 : 0, tools: tools.length ? 1 : 0, channels: (f.chan || channels.length) ? 1 : 0, team: f.team ? 1 : 0, since: f.since ? 1 : 0, links: links.length ? 1 : 0, headlineByWho: head ? (head.who === 'self' ? 1 : 0) : 0 } };
}

function main(): void {
  const catalog = JSON.parse(readFileSync(resolve(ROOT, 'data/entities-index.json'), 'utf8')) as AnyRecord[];
  const pool = catalog.filter((e) => ((e.reaudit as AnyRecord | undefined)?.family) === 'ebizfacts');
  const a = (batch - 1) * size; const b = Math.min(a + size - 1, pool.length - 1);
  if (a >= pool.length) { console.error(`batch ${batch} is beyond the last record (${pool.length})`); process.exit(1); }
  const outRel = `data/incoming/reaudit-ebiz-batch-${pad(batch)}-20260929.json`;
  const outAbs = resolve(ROOT, outRel);
  const factsPath = resolve(FACTS_DIR, `batch-${pad(batch)}.facts.json`);
  if (!existsSync(factsPath)) { console.error(`facts file not found: ${factsPath}`); process.exit(2); }

  execFileSync(process.execPath, ['--import', 'tsx', 'scripts/reaudit/candidate-skeleton.ts', '--range', `${a}-${b}`, '--family', 'ebizfacts', '--lane', 'ebiz', '--out', outRel], { cwd: ROOT, stdio: 'pipe' });
  const skeleton = JSON.parse(readFileSync(outAbs, 'utf8')) as AnyRecord[];
  const facts = JSON.parse(readFileSync(factsPath, 'utf8')) as Facts[];
  const byIndex = new Map(facts.map((f) => [f.i, f]));

  const out: AnyRecord[] = []; const skipped: { index: number; id: string; reason: string }[] = []; const allProblems: string[] = []; const allWarnings: string[] = []; const allRelabels: AnyRecord[] = [];
  const total: Record<string, number> = { money: 0, price: 0, tools: 0, channels: 0, team: 0, since: 0, links: 0, selfHeadline: 0 };
  skeleton.forEach((rec, k) => {
    const index = a + k; const id = String(rec.id);
    const hasText = existsSync(resolve(TEXT_ROOT, `${id}.txt`));
    const f = byIndex.get(index);
    if (!hasText) { skipped.push({ index, id, reason: '保存済み原文が見つからない（payloadKey なし・evidence/ にも post-id 一致なし）' }); if (f && !f.skip) allProblems.push(`[${index}] facts given for a record without raw text`); return; }
    if (!f) { allProblems.push(`[${index}] ${String(rec.name)}: facts missing`); return; }
    if (f.skip) { skipped.push({ index, id, reason: f.skip }); return; }
    const res = apply(rec, f, index, pool);
    for (const p of res.problems) allProblems.push(`[${index}] ${String(rec.name)}: ${p}`);
    for (const w of res.warnings) allWarnings.push(`[${index}] ${String(rec.name)}: ${w}`);
    for (const r of res.relabels) allRelabels.push({ index, id, name: String(rec.name), ...r });
    out.push(res.rec);
    total.money += res.counts.money; total.price += res.counts.price; total.tools += res.counts.tools; total.channels += res.counts.channels;
    total.team += res.counts.team; total.since += res.counts.since; total.links += res.counts.links; total.selfHeadline += res.counts.headlineByWho;
  });
  for (const f of facts) if (f.i < a || f.i > b) allProblems.push(`facts index ${f.i} outside batch range ${a}-${b}`);
  if (allProblems.length) {
    console.error(`✗ ${allProblems.length} problem(s) in batch ${batch}:\n${allProblems.map((p) => `  - ${p}`).join('\n')}`);
    process.exit(3);
  }
  if (allWarnings.length) console.warn(`warnings (${allWarnings.length}):\n${allWarnings.map((w) => `  - ${w}`).join('\n')}`);
  writeFileSync(outAbs, JSON.stringify(out, null, 2), 'utf8');

  // 検証（validate-candidates）
  let validateOut = ''; let validateOk = true;
  try { validateOut = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/reaudit/validate-candidates.ts', outRel], { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }); }
  catch (err) { validateOk = false; validateOut = String((err as { stdout?: string }).stdout ?? '') + String((err as { stderr?: string }).stderr ?? ''); }
  const summary = /(\d+)\/(\d+) PASS/.exec(validateOut)?.[0] ?? 'no summary';
  const failLines = validateOut.split('\n').filter((l) => l.startsWith('✗') || l.startsWith('  - '));
  console.log(`batch ${batch} (index ${a}-${b}): candidates=${out.length} skipped=${skipped.length} validate=${summary}`);
  if (failLines.length) console.log(failLines.join('\n'));
  if (!validateOk) process.exit(4);

  // 進捗 / 報告表
  mkdirSync(resolve(ROOT, 'reports'), { recursive: true });
  const progress = existsSync(PROGRESS) ? (JSON.parse(readFileSync(PROGRESS, 'utf8')) as AnyRecord) : {};
  const files = (Array.isArray(progress.files) ? (progress.files as AnyRecord[]) : []).filter((x) => x.batch !== batch);
  files.push({ batch, range: `${a}-${b}`, file: outRel, factsFile: `reports/reaudit-ebiz-facts/batch-${pad(batch)}.facts.json`, records: skeleton.length, candidates: out.length, skippedNoRaw: skipped, validate: summary, reclassifiedOfficial: { downgraded: allRelabels.filter((r) => r.action === 'downgraded').length, dropped: allRelabels.filter((r) => r.action === 'dropped').length, details: allRelabels },
    extracted: { moneyItems: total.money, withMoney: out.filter((r) => Array.isArray(r.reportedMetrics) && (r.reportedMetrics as unknown[]).length > 0).length, withPrice: total.price, withTools: total.tools, withChannels: total.channels, withTeam: total.team, withStart: total.since, withFounderOrOfficialLinks: total.links, selfReportedHeadline: total.selfHeadline },
    generatedAt: new Date().toISOString() });
  files.sort((x, y) => Number(x.batch) - Number(y.batch));
  const doneRanges = files.map((x) => String(x.range).split('-').map(Number));
  let lastIndex = -1; for (const [s, e] of doneRanges) { if (s === lastIndex + 1) lastIndex = e; }
  const next = {
    lane: 'B', family: 'ebizfacts', updatedAt: new Date().toISOString(), total: pool.length, batchSize: size, lastIndex,
    nextIndex: lastIndex + 1 < pool.length ? lastIndex + 1 : null,
    note: 'lastIndex は 0 から連続して処理済みの最大 index。原文なしの記録は candidates に含めず files[].skippedNoRaw に記録。',
    resume: {
      steps: [
        '1) node scripts/with-r2-keychain-secrets.mjs node --import tsx scripts/reaudit/extract-ebiz-raw.ts --range <from>-<to>   （原文が未取得のときだけ。取得済みならキャッシュから再生成される）',
        '2) node scripts/reaudit/view-ebiz-text.mjs <from> <to>   （12〜13件ずつ読む）',
        '3) reports/reaudit-ebiz-facts/batch-NNN.facts.json を書く（形式は apply-ebiz-facts.ts の先頭コメント）。NNN は 1 始まりで index/25+1',
        '4) node --import tsx scripts/reaudit/apply-ebiz-facts.ts --batch N   （雛形生成→事実の埋め込み→validate-candidates→進捗と報告表を更新）',
      ],
      pitfalls: [
        'tag / what / who / pain に金額（$・円・ドル・数字+ユーロ等）を入れない。what は「<name>は…」で始めず「は、「」を含めない。',
        'links は本文の LINKS に実在する URL だけ。LinkedIn と有料本文の媒体（WSJ/FT 等）は出典にしない。本人以外の投稿は cited、公式は official、本人の投稿は founder。',
        '金額は原文の表記・期間のまま。記事側の計算・推計・換算は who=art/3rd で「記事の計算」と明記し、自分で月次換算や推計を足さない。プロフィール欄と本文が食い違う場合は本文を優先して sup に食い違いを書く。',
        '本人が述べた数字か不明なら art（記事記載）、第三者の推計・掲載値なら 3rd（第三者の報告）。',
      ],
    },
    files,
  };
  writeFileSync(PROGRESS, JSON.stringify(next, null, 2), 'utf8');
  writeReport(next as unknown as { files: AnyRecord[]; lastIndex: number; total: number; nextIndex: number | null });
  console.log(`progress: lastIndex=${lastIndex} next=${lastIndex + 1 < pool.length ? lastIndex + 1 : 'done'}  → ${outRel}`);
}

function writeReport(p: { files: AnyRecord[]; lastIndex: number; total: number; nextIndex: number | null }): void {
  const num = (x: unknown): number => (typeof x === 'number' ? x : 0);
  const ex = (f: AnyRecord): AnyRecord => (f.extracted as AnyRecord) ?? {};
  const rows = p.files.map((f) => `| ${pad(num(f.batch))} | ${String(f.range)} | ${num(f.records)} | ${num(f.candidates)} | ${num(ex(f).withMoney)} | ${num(ex(f).moneyItems)} | ${num(ex(f).withPrice)} | ${num(ex(f).withTools)} | ${num(ex(f).withChannels)} | ${num(ex(f).withTeam)} | ${num(ex(f).withStart)} | ${num(ex(f).withFounderOrOfficialLinks)} | ${String(f.validate)} | ${String(f.file).replace('data/incoming/', '')} |`);
  const sum = (key: string): number => p.files.reduce((s, f) => s + num(ex(f)[key]), 0);
  const skipped = p.files.flatMap((f) => (Array.isArray(f.skippedNoRaw) ? (f.skippedNoRaw as AnyRecord[]) : []));
  const overridesPath = resolve(TEXT_ROOT, '_payload-key-overrides.json');
  const overrideCount = existsSync(overridesPath) ? Object.keys(JSON.parse(readFileSync(overridesPath, 'utf8')) as object).length : 0;
  const md = [
    '# eBiz Facts 原文再抽出（レーンB）— 2026-09-29',
    '',
    `- 対象: ebizfacts ${p.total}件。処理済み: index 0〜${p.lastIndex}（${p.nextIndex === null ? '全件完了' : `次は index ${p.nextIndex} から`}）。`,
    `- 原文の取得（foundation-raw、GetObject のみ）: payloadKey あり 745件は全件取得成功（失敗 0、SHA-256 は記録値と一致）。payloadKey なし 16件のうち ${overrideCount}件は evidence/ の未参照 HTML を記事 post-id で特定して取得（SHA は記録値と不一致=記録側が別表現のハッシュ）、残り ${16 - overrideCount}件は原文なし。`,
    '- 出力: data/incoming/reaudit-ebiz-batch-NNN-20260929.json（gitignore 済み）。抽出の元テキスト: data/r2-local/ebiz-text/（私的・gitignore 済み）。',
    '',
    '## バッチ別（抽出できた項目の件数）',
    '',
    '| batch | index | 記録 | 候補 | 金額あり | 金額件数 | 価格 | ツール | 集客 | チーム | 開始時期 | 一次発信/公式URL | validate | ファイル |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows,
    `| 計 |  | ${p.files.reduce((s, f) => s + num(f.records), 0)} | ${p.files.reduce((s, f) => s + num(f.candidates), 0)} | ${sum('withMoney')} | ${sum('moneyItems')} | ${sum('withPrice')} | ${sum('withTools')} | ${sum('withChannels')} | ${sum('withTeam')} | ${sum('withStart')} | ${sum('withFounderOrOfficialLinks')} |  |  |`,
    '',
    '## 原文取得の失敗・原文なし',
    '',
    '| index | id | 理由 |',
    '|---|---|---|',
    ...(skipped.length ? skipped.map((s) => `| ${num(s.index)} | ${String(s.id)} | ${String(s.reason)} |`) : ['| - | - | 該当なし（このレンジでは 0 件） |']),
    '',
    '## 「公式サイト」出典の再判定（rights tier の是正）',
    '',
    '- 雛形が引き継ぐ catalog の既存 reaudit.sources は、記録の url を「公式サイト（TIER1_OFFICIAL）」として登録している。ebizfacts 記録の url は記事本文の最初のリンクなので、第三者の記事・SNS・記事自身のことがある。',
    `- 本担当が判定できたもの: ${p.files.reduce((s, f) => s + num(((f.reclassifiedOfficial as AnyRecord | undefined) ?? {}).downgraded), 0)} 件を TIER2_FACTS_ONLY（GitHub 等は TIER1_PLATFORM）へ下げ、${p.files.reduce((s, f) => s + num(((f.reclassifiedOfficial as AnyRecord | undefined) ?? {}).dropped), 0)} 件を出典から外した（Tier3 媒体または記事自身）。証拠カード「出典: 公式サイト」も同じ判定で題名を直した。`,
    '- 記録本体の url / officialUrl フィールドと、既存の物語カード（戦略・死角）は変更していない。officialUrl を空にするかは主担当の判断。詳細は reports/reaudit-ebiz-progress.json の files[].reclassifiedOfficial.details。',
    '',
    '| batch | 下げた | 外した |',
    '|---|---|---|',
    ...p.files.map((f) => { const r = (f.reclassifiedOfficial as AnyRecord | undefined) ?? {}; return `| ${pad(num(f.batch))} | ${num(r.downgraded)} | ${num(r.dropped)} |`; }),
    '',
    '## 抽出ルール',
    '',
    '- 各記録は保存済み記事の本文を読み、事業内容・価格・金額・ツール・集客・一次発信URLを自分の言葉で要約（原文は転載しない）。',
    '- pnl の数値は 0、全項目 unconfirmed のまま。金額は revenueLabel と reportedMetrics にだけ置き、期間・単位は記事のとおり（月次換算・推計なし）。',
    '- 金額の出所は本人発言・引用のとき「本人申告」、記事が自分の言葉で書いた数字は「記事記載」、他者の推計・報道は「第三者の報告」と区別。',
    '- 記事が引用する創業者の一次発信・第三者ページは TIER2_FACTS_ONLY、公式サイトは TIER1_OFFICIAL。LinkedIn は Tier 3 のため出典に入れない。',
  ].join('\n');
  writeFileSync(REPORT, md + '\n', 'utf8');
}

main();
