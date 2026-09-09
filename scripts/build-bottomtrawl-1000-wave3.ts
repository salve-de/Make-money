import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

type Obj = Record<string, any>;
type Page = {
  url: string;
  status: number;
  title: string | null;
  description: string | null;
  canonical: string | null;
  publishedAt: string | null;
  html: string;
  text: string;
  headings: string[];
  paragraphs: string[];
};

const runId = 'run_make_money_1000_bottomtrawl_20260909_04';
const retrievedAt = new Date().toISOString();
const inputPath = resolve(process.argv[2] || 'data/collection/run_make_money_1000_bottomtrawl_20260909_01.request.json');
const outputPath = resolve(process.argv[3] || `data/collection/${runId}.request.json`);
const foundationRepo = process.env.FOUNDATION_REPO || resolve('..', 'codex-foundation-latest-20260909');
const MAX_EXTERNAL_LINKS_PER_CASE = 2;

const dimensions = [
  'identity', 'founders', 'location', 'status', 'team_history', 'timeline', 'revenue', 'peak_revenue',
  'mrr_arr', 'gmv', 'gross_profit', 'operating_profit', 'net_profit', 'costs', 'cost_breakdown', 'margin',
  'owner_take_home', 'pricing', 'pricing_history', 'refunds', 'retention_churn', 'funding', 'exit_value',
  'payer_receiver_purpose', 'customers', 'customer_pain', 'substitutes', 'first_customers', 'initial_channel',
  'breakout', 'current_channels', 'founder_background', 'prior_failures', 'workload', 'support_burden',
  'outsourcing', 'automation', 'capital_required', 'technology', 'competitors', 'dependencies', 'regulation',
  'why_now', 'provenance_rights', 'conflicts', 'additional_observations',
];

const dimensionTerms: Record<string, RegExp> = {
  identity: /company|startup|business|product|service|website|domain|brand|platform/i,
  founders: /founder|co-founder|cofounder|entrepreneur|creator|operator|bootstrapp|solo founder/i,
  location: /based in|located|country|city|remote|danish|american|canadian|europe|asia|london|new york|berlin/i,
  status: /active|still running|shutdown|shut down|closed|ceased|acquired|sold|failed|failure|pivot|alive/i,
  team_history: /team|employee|employees|hire|hiring|co-founder|cofounder|staff|contractor/i,
  timeline: /founded|started|launched|launch|first sale|first customer|month|year|milestone|later|eventually/i,
  revenue: /revenue|income|sales|earned|made \$|made €|made £|monthly recurring|mrr|arr/i,
  peak_revenue: /peak|highest|at its best|grew to|reached|hit \$|hit €|hit £/i,
  mrr_arr: /mrr|arr|monthly recurring|annual recurring|per month|per year/i,
  gmv: /gmv|gross merchandise|transaction volume|processed \$|processed €|processed £/i,
  gross_profit: /gross profit|gross margin|gross profit margin/i,
  operating_profit: /operating profit|ebit|operating income/i,
  net_profit: /net profit|net income|take home profit|profitable|profit/i,
  costs: /cost|costs|expense|expenses|spend|spent|budget|burn|overhead|fee/i,
  cost_breakdown: /hosting|server|api|software|tool|payroll|salary|wage|contractor|agency|advertis|marketing|tax|refund|refunds/i,
  margin: /margin|gross margin|net margin|profit margin|markup/i,
  owner_take_home: /take.?home|personal income|owner income|paid myself|salary|dividend|distributed/i,
  pricing: /price|pricing|plan|subscription|monthly|annual|lifetime|one.?time|free trial|discount/i,
  pricing_history: /raised the price|lowered the price|price change|pricing changed|old price|new price|original price/i,
  refunds: /refund|chargeback|money back|cancelled|canceled/i,
  retention_churn: /retention|churn|cancel|cancellation|renew|renewal|repeat|returning|subscriber/i,
  funding: /funding|funded|raised|investment|investor|seed|venture|bootstrapped|self.?funded/i,
  exit_value: /acqui|acquisition|sold for|sale price|exit|valuation|bought for/i,
  payer_receiver_purpose: /customer|buyer|payer|paying|client|merchant|businesses pay|subscription/i,
  customers: /customer|client|user|subscriber|member|buyer|audience|community/i,
  customer_pain: /problem|pain|painful|frustrat|annoy|need|urgent|risk|waste|expensive|slow|manual|compliance/i,
  substitutes: /alternative|competitor|competitors|instead of|replace|substitute|spreadsheet|do nothing|workaround/i,
  first_customers: /first customer|first user|first client|early adopter|first 10|first 100|initial customer/i,
  initial_channel: /outreach|cold email|community|reddit|product hunt|launch|seo|search|marketplace|referral|partner|affiliate|ads/i,
  breakout: /grew|growth|viral|breakout|spike|explod|momentum|featured|trending|hit/i,
  current_channels: /channel|distribution|traffic|seo|search|social|newsletter|affiliate|partner|referral|marketplace/i,
  founder_background: /previous|background|career|worked at|experience|built before|former|degree|engineer|designer/i,
  prior_failures: /failed|failure|shutdown|shut down|closed|pivot|abandoned|unsuccessful|could not reach|never reached/i,
  workload: /hours|hour per|workload|busy|manual|daily|weekly|full.?time|part.?time|nights|weekends/i,
  support_burden: /support|customer service|ticket|complaint|help desk|onboarding|refund|bug report/i,
  outsourcing: /outsource|freelanc|contractor|agency|virtual assistant| VA |offshore|delegat/i,
  automation: /automat|zapier|make\.com|script|bot|workflow|no.?code|ai|artificial intelligence/i,
  capital_required: /capital|investment|budget|upfront|initial cost|startup cost|cash|runway|bootstrapp/i,
  technology: /built with|stack|software|api|hosting|server|database|stripe|shopify|wordpress|github|no.?code|ai/i,
  competitors: /competitor|alternative|market leader|incumbent|compete|versus|vs\.?/i,
  dependencies: /dependent|dependence|platform|api|app store|marketplace|google|facebook|stripe|shopify|amazon|hosted/i,
  regulation: /regulat|compliance|license|legal|law|privacy|gdpr|tax|health|finance|permission/i,
  why_now: /trend|timing|why now|pandemic|covid|remote work|new technology| regulation|market change|demand grew/i,
  provenance_rights: /source|interview|reported|according|said|published|archive|disclosed/i,
  conflicts: /however|but|contradict|different|disagree|unclear|uncertain|claim|alleged/i,
  additional_observations: /./i,
};

function hash(seed: string, length = 24): string {
  return createHash('sha256').update(`${runId}|${seed}`).digest('hex').slice(0, length);
}

function decode(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x2F;|&#47;/gi, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function plain(value: string): string {
  return decode(
    value
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  ).replace(/\s+/g, ' ').trim();
}

function tag(html: string, re: RegExp): string | null {
  const match = re.exec(html);
  return match?.[1] ? decode(match[1]) : null;
}

function meta(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return tag(html, new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'))
    || tag(html, new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["'][^>]*>`, 'i'));
}

function dateValue(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function publishedAt(html: string): string | null {
  const time = tag(html, /<time\b[^>]+(?:datetime|dateTime)=["']([^"']+)["'][^>]*>/i);
  if (time && dateValue(time)) return dateValue(time);
  for (const key of ['article:published_time', 'datePublished', 'publishdate', 'date']) {
    const candidate = meta(html, key);
    if (candidate && dateValue(candidate)) return dateValue(candidate);
  }
  const jsonDate = /["']datePublished["']\s*:\s*["']([^"']+)["']/i.exec(html)?.[1] || null;
  if (jsonDate && dateValue(jsonDate)) return dateValue(jsonDate);
  const text = plain(html);
  const monthDate = text.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\b/i)?.[0];
  return dateValue(monthDate || null);
}

function paragraphs(html: string): string[] {
  return [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((match) => plain(match[1]))
    .filter((value) => value.length >= 25 && value.length <= 1200);
}

function headings(html: string): string[] {
  return [...html.matchAll(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/gi)]
    .map((match) => plain(match[1]))
    .filter((value) => value.length >= 3 && value.length <= 300);
}

function pageText(html: string): string {
  const article = /<article[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1] || html;
  return plain(article).slice(0, 100000);
}

function parsePage(url: string, status: number, html: string): Page {
  const body = html.slice(0, 2_500_000);
  return {
    url,
    status,
    title: tag(body, /<title[^>]*>([\s\S]*?)<\/title>/i) || meta(body, 'og:title'),
    description: meta(body, 'description') || meta(body, 'og:description'),
    canonical: tag(body, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i),
    publishedAt: status === 200 ? publishedAt(body) : null,
    html: body,
    text: status === 200 ? pageText(body) : '',
    headings: status === 200 ? headings(body) : [],
    paragraphs: status === 200 ? paragraphs(body) : [],
  };
}

async function fetchPage(url: string): Promise<Page> {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': 'Make-Money-cross-project-enrichment/2026.09 (+metadata-only)' },
      signal: AbortSignal.timeout(20000),
    });
    return parsePage(url, response.status, await response.text());
  } catch {
    return parsePage(url, 0, '');
  }
}

async function concurrent<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const result = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      result[index] = await fn(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(1, items.length)) }, () => worker()));
  return result;
}

function normalizeUrl(raw: string, base: string): string | null {
  try {
    const url = new URL(decode(raw), base);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^ref$|^source$|^campaign$|^fbclid$|^gclid$/i.test(key)) url.searchParams.delete(key);
    return url.toString();
  } catch {
    return null;
  }
}

const blockedHosts = /failory\.com|doubleclick|googletagmanager|google-analytics|googlesyndication|hotjar|segment\.io|sentry\.io|cloudflareinsights|facebook\.net|connect\.facebook|twitter\.com\/intent|linkedin\.com\/share|pinterest\.com\/pin/i;
const knownSurface = /producthunt|github\.com|gitlab\.com|apps\.apple\.com|play\.google\.com|indiehackers|reddit\.com|news\.ycombinator|hacker-news|medium\.com|substack|crunchbase|techcrunch|forbes|wired|theverge|g2\.com|capterra|trustpilot|appsumo|shopify|stripe|wordpress|webflow|youtube|podcasts|spotify/i;

function externalLinks(page: Page): string[] {
  if (!page.html || page.status !== 200) return [];
  const scored: Array<{ url: string; score: number; host: string }> = [];
  const seenHosts = new Set<string>();
  for (const match of page.html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const url = normalizeUrl(match[1], page.url);
    if (!url) continue;
    let parsed: URL;
    try { parsed = new URL(url); } catch { continue; }
    if (blockedHosts.test(parsed.hostname + parsed.pathname)) continue;
    let pageHost = '';
    try { pageHost = new URL(page.url).hostname; } catch { /* ignore */ }
    if (parsed.hostname === pageHost || parsed.hostname.endsWith('.failory.com')) continue;
    if (parsed.pathname.match(/\.(png|jpg|jpeg|gif|svg|css|js|pdf|zip)$/i)) continue;
    if (seenHosts.has(parsed.hostname)) continue;
    seenHosts.add(parsed.hostname);
    const anchor = plain(match[2]);
    let score = knownSurface.test(parsed.hostname + parsed.pathname) ? 4 : 1;
    if (/official|website|visit|built|founder|company|product|app|demo|source|read more|learn more/i.test(anchor)) score += 3;
    if (/facebook|instagram|tiktok|x\.com|linkedin/i.test(parsed.hostname)) score -= 1;
    scored.push({ url, score, host: parsed.hostname });
  }
  return scored.sort((a, b) => b.score - a.score || a.host.localeCompare(b.host)).slice(0, MAX_EXTERNAL_LINKS_PER_CASE).map((item) => item.url);
}

function sourceMeta(url: string, page: Page): { provider: string; type: string; strength: string } {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase(); } catch { /* ignore */ }
  if (/failory\.com/.test(host)) return { provider: 'Failory', type: 'secondary_case_page', strength: 'C' };
  if (/producthunt|apps\.apple|play\.google|g2\.com|capterra|trustpilot|appsumo/.test(host)) return { provider: host, type: 'market_surface', strength: 'C' };
  if (/reddit|hacker-news|ycombinator|indiehackers/.test(host)) return { provider: host, type: 'customer_community', strength: 'C' };
  if (/web\.archive\.org|archive\.org/.test(host)) return { provider: host, type: 'public_archive', strength: 'B' };
  if (/techcrunch|forbes|wired|theverge|medium|substack/.test(host)) return { provider: host, type: 'reputable_secondary', strength: 'B' };
  if (/github|gitlab|shopify|stripe|wordpress|webflow/.test(host)) return { provider: host, type: 'public_technology_or_platform', strength: 'B' };
  return { provider: host || 'external_public_source', type: 'linked_public_source', strength: 'C' };
}

function snippets(page: Page): string[] {
  if (page.status !== 200) return [];
  const all = [...page.headings, ...page.paragraphs];
  const relevant = all.filter((value) => Object.values(dimensionTerms).some((re) => re.test(value)));
  const fallback = all.filter((value) => value.length >= 30);
  return [...new Set((relevant.length ? relevant : fallback).map((value) => value.replace(/\s+/g, ' ').trim()))]
    .filter((value) => value.length >= 25)
    .slice(0, 10)
    .map((value) => value.slice(0, 600));
}

function contexts(page: Page): string[] {
  return [...new Set([page.title, page.description, ...page.headings, ...page.paragraphs].filter((x): x is string => Boolean(x)))];
}

function money(text: string): Array<{ raw: string; amount: number; currency: string; context: string }> {
  const out: Array<{ raw: string; amount: number; currency: string; context: string }> = [];
  for (const match of text.matchAll(/(?:[$€£¥]\s*\d[\d,]*(?:\.\d+)?\s*[kKmMbB]?|\b(?:USD|EUR|GBP|JPY)\s*\d[\d,]*(?:\.\d+)?\s*[kKmMbB]?)/g)) {
    const raw = match[0];
    const currency = raw.includes('$') || /\bUSD\b/i.test(raw) ? 'USD' : raw.includes('€') || /\bEUR\b/i.test(raw) ? 'EUR' : raw.includes('£') || /\bGBP\b/i.test(raw) ? 'GBP' : 'JPY';
    const cleaned = raw.replace(/[$€£¥,\s]/g, '').replace(/USD|EUR|GBP|JPY/gi, '');
    const suffix = /[kmb]$/i.test(cleaned) ? cleaned.slice(-1).toLowerCase() : '';
    const base = Number.parseFloat(suffix ? cleaned.slice(0, -1) : cleaned);
    if (!Number.isFinite(base)) continue;
    const amount = base * (suffix === 'k' ? 1000 : suffix === 'm' ? 1_000_000 : suffix === 'b' ? 1_000_000_000 : 1);
    const index = match.index || 0;
    const context = text.slice(Math.max(0, index - 220), Math.min(text.length, index + raw.length + 220)).replace(/\s+/g, ' ').trim();
    if (Object.values(dimensionTerms).some((re) => re.test(context))) out.push({ raw, amount, currency, context });
    if (out.length >= 8) break;
  }
  return out;
}

function counts(text: string): Array<{ raw: string; amount: number; unit: string; context: string }> {
  const out: Array<{ raw: string; amount: number; unit: string; context: string }> = [];
  for (const match of text.matchAll(/\b(\d[\d,]*(?:\.\d+)?)\s*(users?|customers?|clients?|subscribers?|members?|downloads?|orders?|transactions?)\b/gi)) {
    const amount = Number(match[1].replace(/,/g, ''));
    if (!Number.isFinite(amount)) continue;
    const index = match.index || 0;
    out.push({ raw: match[0], amount, unit: match[2].toLowerCase(), context: text.slice(Math.max(0, index - 220), Math.min(text.length, index + match[0].length + 220)).replace(/\s+/g, ' ').trim() });
    if (out.length >= 5) break;
  }
  return out;
}

function percentages(text: string): Array<{ raw: string; amount: number; context: string }> {
  const out: Array<{ raw: string; amount: number; context: string }> = [];
  for (const match of text.matchAll(/\b(\d{1,3}(?:\.\d+)?)\s*%/g)) {
    const amount = Number(match[1]);
    const index = match.index || 0;
    const context = text.slice(Math.max(0, index - 220), Math.min(text.length, index + match[0].length + 220)).replace(/\s+/g, ' ').trim();
    if (/margin|churn|retention|conversion|commission|fee|profit|growth|refund|tax/i.test(context)) out.push({ raw: match[0], amount, context });
    if (out.length >= 5) break;
  }
  return out;
}

function metricType(context: string): string {
  if (/gross profit|gross margin/i.test(context)) return 'gross_profit';
  if (/operating profit|ebit|operating income/i.test(context)) return 'operating_profit';
  if (/net profit|net income|profitable|profit/i.test(context)) return 'net_profit';
  if (/mrr|monthly recurring/i.test(context)) return 'mrr';
  if (/arr|annual recurring/i.test(context)) return 'arr';
  if (/gmv|gross merchandise|transaction volume|processed/i.test(context)) return 'gmv';
  if (/cost|expense|spend|burn|overhead|fee/i.test(context)) return 'cost';
  if (/fund|raised|investment|seed|venture/i.test(context)) return 'funding';
  if (/price|pricing|subscription fee|monthly fee|per month|per year|lifetime/i.test(context)) return 'price';
  if (/revenue|sales|earned|income|made/i.test(context)) return 'revenue';
  return 'reported_amount';
}

function addSourceAndEvidence(
  url: string,
  page: Page,
  sources: Obj[],
  evidence: Obj[],
  sourceByUrl: Map<string, Obj>,
  evidenceByUrl: Map<string, Obj>,
): { source: Obj; evidence: Obj; sourceIndex: number; evidenceIndex: number } {
  const canonical = normalizeUrl(page.canonical || url, url) || url;
  const sourceKey = canonical.replace(/#.*$/, '');
  let source = sourceByUrl.get(sourceKey);
  if (!source) {
    const info = sourceMeta(canonical, page);
    source = {
      source_id: `src.${info.type.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}.wave3.${hash(`source:${sourceKey}`, 20)}`,
      provider_name: info.provider,
      source_type: info.type,
      canonical_url: canonical,
      source_strength: info.strength,
      rights_status: 'metadata_only',
      rights_policy_id: null,
      access_notes: 'Wave 3 fetched public metadata and short extracted facts only; raw body was not copied. Independent verification may still be required.',
    };
    sourceByUrl.set(sourceKey, source);
    sources.push(source);
  }
  let ev = evidenceByUrl.get(sourceKey);
  if (!ev) {
    const facts = snippets(page);
    ev = {
      evidence_id: `ev_${hash(`evidence:${sourceKey}`)}`,
      source_id: source.source_id,
      source_url: canonical,
      source_title: page.title || canonical,
      source_type: source.source_type,
      publisher_or_speaker: source.provider_name || null,
      published_at: page.publishedAt,
      retrieved_at: retrievedAt,
      source_strength: source.source_strength,
      rights_status: 'metadata_only',
      rights_policy_id: null,
      raw_storage: { status: 'metadata_only', bucket: null, key: null, content_sha256: null, content_type: null, bytes: null },
      summary: page.status === 200
        ? 'Wave 3 fetched a public page and retained metadata plus short extracted fact snippets; raw body was not copied.'
        : `Wave 3 attempted a public page fetch but received HTTP ${String(page.status || 'unavailable')}; no unsupported fact is claimed.`,
      extracted_facts: facts,
    };
    evidenceByUrl.set(sourceKey, ev);
    evidence.push(ev);
  }
  return { source, evidence: ev, sourceIndex: sources.indexOf(source), evidenceIndex: evidence.indexOf(ev) };
}

function matchingDimensions(value: string): string[] {
  return dimensions.filter((dimension) => dimension !== 'additional_observations' && dimension !== 'conflicts' && dimensionTerms[dimension].test(value));
}

function statusForPage(page: Page): string {
  if (page.status === 200 && page.text.length > 0) return 'attempted';
  return 'unavailable';
}

async function main() {
  const request = JSON.parse(await readFile(inputPath, 'utf8')) as Obj;
  const base = request.bundle as Obj;
  const entities = (base.entities || []) as Obj[];
  if (entities.length !== 1000) throw new Error(`expected exactly 1000 entities, got ${entities.length}`);

  const targets = entities.map((entity) => ({ entity, url: String(entity.canonical_identifier || '') })).filter((target) => /^https?:\/\//.test(target.url));
  const casePages = await concurrent(targets, 12, async (target) => ({ target, page: await fetchPage(target.url) }));

  const externalByUrl = new Map<string, { url: string; entityIds: string[] }>();
  for (const item of casePages) {
    for (const url of externalLinks(item.page)) {
      const prior = externalByUrl.get(url) || { url, entityIds: [] };
      prior.entityIds.push(String(item.target.entity.entity_id));
      externalByUrl.set(url, prior);
    }
  }
  const externalTargets = [...externalByUrl.values()];
  const externalPages = await concurrent(externalTargets, 16, async (target) => ({ target, page: await fetchPage(target.url) }));
  const externalPageByUrl = new Map(externalPages.map((item) => [item.target.url, item.page]));

  const sources: Obj[] = [];
  const evidence: Obj[] = [];
  const claims: Obj[] = [];
  const metrics: Obj[] = [];
  const moneySignals: Obj[] = [];
  const events: Obj[] = [];
  const relationships: Obj[] = [];
  const observations: Obj[] = [];
  const derived: Obj[] = [];
  const sourceByUrl = new Map<string, Obj>();
  const evidenceByUrl = new Map<string, Obj>();
  const refs = new Map<string, string[]>();
  const mark = (dimension: string, ref: string) => {
    const list = refs.get(dimension) || [];
    if (!list.includes(ref)) list.push(ref);
    refs.set(dimension, list);
  };
  const metricKeys = new Set<string>();
  const eventKeys = new Set<string>();
  const relationshipKeys = new Set<string>();
  const claimKeys = new Set<string>();
  const linkedByEntity = new Map<string, string[]>();

  for (const item of casePages) {
    const entity = item.target.entity;
    const entityId = String(entity.entity_id);
    const name = String(entity.canonical_name);
    const selected = [{ page: item.page, url: item.target.url, lane: 'secondary_case_page' }];
    const links = externalLinks(item.page);
    for (const url of links) {
      const page = externalPageByUrl.get(url);
      if (page) selected.push({ page, url, lane: sourceMeta(url, page).type });
    }

    const entityEvidenceIds: string[] = [];
    const foundForEntity = new Map<string, string[]>();
    const addRef = (dimension: string, ref: string) => {
      const list = foundForEntity.get(dimension) || [];
      if (!list.includes(ref)) list.push(ref);
      foundForEntity.set(dimension, list);
    };
    const laneStatuses: Obj = {
      secondary_case_page: 'attempted',
      official_first_party: 'not_attempted',
      founder_operator: 'not_attempted',
      public_archive: 'not_attempted',
      reputable_secondary: 'not_attempted',
      market_surface: 'not_attempted',
      customer_community: 'not_attempted',
      public_signals: 'not_attempted',
      failure_outcomes: 'attempted',
      source_less_leads: 'not_applicable',
    };

    for (const selectedPage of selected) {
      const info = addSourceAndEvidence(selectedPage.url, selectedPage.page, sources, evidence, sourceByUrl, evidenceByUrl);
      const evidenceId = String(info.evidence.evidence_id);
      if (!entityEvidenceIds.includes(evidenceId)) entityEvidenceIds.push(evidenceId);
      addRef('identity', `evidence/${info.evidenceIndex}`);
      addRef('provenance_rights', `evidence/${info.evidenceIndex}`);
      if (selectedPage.lane !== 'secondary_case_page') laneStatuses[selectedPage.lane] = statusForPage(selectedPage.page) === 'attempted' ? 'attempted' : 'attempted_unavailable';
      if (selectedPage.page.status !== 200) continue;

      const selectedSnippets = snippets(selectedPage.page);
      for (const snippet of selectedSnippets.slice(0, 6)) {
        const matched = matchingDimensions(snippet);
        if (!matched.length) continue;
        const key = `${entityId}|${evidenceId}|${snippet}`;
        if (claimKeys.has(key)) continue;
        claimKeys.add(key);
        const claim = {
          claim_id: `cl_${hash(`claim:${key}`)}`,
          entity_ids: [entityId],
          statement: `Public ${String(selectedPage.lane)} text for ${name} reports or discusses: ${snippet}`,
          origin_type: 'reported',
          verification_status: 'SUPPORTED',
          confidence: selectedPage.lane === 'secondary_case_page' ? 0.66 : 0.70,
          evidence_ids: [evidenceId],
          occurred_at: null,
          valid_from: null,
          valid_to: null,
          supersedes: [],
          superseded_by: [],
        };
        const index = claims.push(claim) - 1;
        const ref = `claims/${index}`;
        for (const dimension of matched) { addRef(dimension, ref); mark(dimension, ref); }
      }

      for (const item of money(selectedPage.page.text)) {
        const type = metricType(item.context);
        const key = `${entityId}|${type}|${item.amount}|${item.currency}|${item.raw}`;
        if (metricKeys.has(key)) continue;
        metricKeys.add(key);
        const metric = {
          metric_id: `mt_${hash(`metric:${key}`)}`,
          entity_id: entityId,
          metric_type: type,
          value: item.amount,
          unit: 'currency',
          currency: item.currency,
          period_start: null,
          period_end: null,
          point_in_time: selectedPage.page.publishedAt,
          basis: item.context.slice(0, 500),
          scope: name,
          origin_type: 'reported',
          confidence: selectedPage.lane === 'secondary_case_page' ? 0.58 : 0.64,
          verification_status: 'SUPPORTED',
          evidence_ids: [evidenceId],
        };
        const index = metrics.push(metric) - 1;
        const ref = `metrics/${index}`;
        addRef('money_and_economics', ref); mark('money_and_economics', ref);
        if (['revenue', 'mrr', 'arr', 'gmv'].includes(type)) { addRef('revenue', ref); mark('revenue', ref); }
        if (['mrr', 'arr'].includes(type)) { addRef('mrr_arr', ref); mark('mrr_arr', ref); }
        if (type === 'gmv') { addRef('gmv', ref); mark('gmv', ref); }
        if (['gross_profit', 'operating_profit', 'net_profit'].includes(type)) { addRef(type, ref); mark(type, ref); }
        if (type === 'cost') { addRef('costs', ref); addRef('cost_breakdown', ref); mark('costs', ref); mark('cost_breakdown', ref); }
        if (type === 'funding') { addRef('funding', ref); mark('funding', ref); }
        if (type === 'price') { addRef('pricing', ref); mark('pricing', ref); }
      }

      for (const item of counts(selectedPage.page.text)) {
        const key = `${entityId}|${item.unit}|${item.amount}|${item.raw}`;
        if (metricKeys.has(key)) continue;
        metricKeys.add(key);
        const metric = {
          metric_id: `mt_${hash(`count:${key}`)}`,
          entity_id: entityId,
          metric_type: `${item.unit.replace(/s$/, '')}_count`,
          value: item.amount,
          unit: 'count',
          currency: null,
          period_start: null,
          period_end: null,
          point_in_time: selectedPage.page.publishedAt,
          basis: item.context.slice(0, 500),
          scope: name,
          origin_type: 'reported',
          confidence: 0.58,
          verification_status: 'SUPPORTED',
          evidence_ids: [evidenceId],
        };
        const index = metrics.push(metric) - 1;
        const ref = `metrics/${index}`;
        addRef('customers', ref); mark('customers', ref);
        addRef('money_and_economics', ref); mark('money_and_economics', ref);
      }

      for (const item of percentages(selectedPage.page.text)) {
        const type = /churn/i.test(item.context) ? 'churn_rate' : /retention/i.test(item.context) ? 'retention_rate' : /commission|fee/i.test(item.context) ? 'fee_rate' : /growth/i.test(item.context) ? 'growth_rate' : 'margin';
        const key = `${entityId}|${type}|${item.amount}`;
        if (metricKeys.has(key)) continue;
        metricKeys.add(key);
        const metric = {
          metric_id: `mt_${hash(`percentage:${key}`)}`,
          entity_id: entityId,
          metric_type: type,
          value: item.amount,
          unit: 'percent',
          currency: null,
          period_start: null,
          period_end: null,
          point_in_time: selectedPage.page.publishedAt,
          basis: item.context.slice(0, 500),
          scope: name,
          origin_type: 'reported',
          confidence: 0.52,
          verification_status: 'SUPPORTED',
          evidence_ids: [evidenceId],
        };
        const index = metrics.push(metric) - 1;
        const ref = `metrics/${index}`;
        addRef('margin', ref); mark('margin', ref);
        if (type === 'churn_rate' || type === 'retention_rate') { addRef('retention_churn', ref); mark('retention_churn', ref); }
        if (type === 'fee_rate') { addRef('cost_breakdown', ref); mark('cost_breakdown', ref); }
      }

      for (const item of money(selectedPage.page.text)) {
        const type = metricType(item.context);
        const key = `${entityId}|${type}|${item.amount}|${item.currency}|${item.raw}`;
        const signalId = `ms_${hash(`money:${key}`)}`;
        if (moneySignals.some((signal) => signal.money_signal_id === signalId)) continue;
        const signal = {
          money_signal_id: signalId,
          payer_entity_id: null,
          receiver_entity_id: entityId,
          purpose: `Public ${type} signal for ${name}; exact payer, receiver or cash timing may remain undisclosed.`,
          money_type: type,
          amount: item.amount,
          currency: item.currency,
          unit: 'currency',
          amount_label: item.raw,
          period_start: null,
          period_end: null,
          point_in_time: selectedPage.page.publishedAt,
          basis: item.context.slice(0, 500),
          scope: name,
          origin_type: 'reported',
          verification_status: 'SUPPORTED',
          confidence: 0.55,
          evidence_ids: [evidenceId],
        };
        const index = moneySignals.push(signal) - 1;
        const ref = `money_signals/${index}`;
        addRef('money_and_economics', ref); mark('money_and_economics', ref);
      }

      const eventText = selectedPage.page.text;
      const eventTypes: Array<[RegExp, string, string]> = [
        [/launch|launched|founded|started/i, 'launch_or_start_signal', 'Public text contains a launch, founding, or start signal; exact chronology may require a primary source.'],
        [/failed|failure|shutdown|shut down|closed|ceased|could not reach|never reached/i, 'failure_or_shutdown_signal', 'Public text contains a failure, closure, shutdown, or non-achievement signal.'],
        [/pivot|changed direction|new direction/i, 'pivot_signal', 'Public text contains a pivot or direction-change signal.'],
        [/acqui|sold for|bought by/i, 'acquisition_or_exit_signal', 'Public text contains an acquisition, sale, or exit signal.'],
      ];
      for (const [pattern, type, description] of eventTypes) {
        if (!pattern.test(eventText)) continue;
        const key = `${entityId}|${evidenceId}|${type}`;
        if (eventKeys.has(key)) continue;
        eventKeys.add(key);
        const event = {
          event_id: `evt_${hash(`event:${key}`)}`,
          entity_ids: [entityId],
          event_type: type,
          occurred_at: null,
          description: `${description} Subject: ${name}.`,
          verification_status: 'SUPPORTED',
          confidence: selectedPage.lane === 'secondary_case_page' ? 0.60 : 0.65,
          evidence_ids: [evidenceId],
        };
        const index = events.push(event) - 1;
        const ref = `events/${index}`;
        addRef('timeline', ref); addRef('status', ref); mark('timeline', ref); mark('status', ref);
        if (type === 'failure_or_shutdown_signal' || type === 'pivot_signal') { addRef('prior_failures', ref); mark('prior_failures', ref); }
        if (type === 'acquisition_or_exit_signal') { addRef('exit_value', ref); mark('exit_value', ref); }
      }

      const relationTargets = selectedPage.lane === 'secondary_case_page' ? externalLinks(selectedPage.page) : [];
      for (const linkedUrl of relationTargets) {
        const key = `${entityId}|${linkedUrl}`;
        if (relationshipKeys.has(key)) continue;
        relationshipKeys.add(key);
        const rel = {
          relationship_id: `rel_${hash(`link:${key}`)}`,
          subject_entity_id: entityId,
          predicate: 'public_case_page_links_to',
          object: linkedUrl,
          valid_from: null,
          valid_to: null,
          verification_status: 'SUPPORTED',
          confidence: 0.90,
          evidence_ids: [evidenceId],
        };
        const index = relationships.push(rel) - 1;
        const ref = `relationships/${index}`;
        addRef('distribution', ref); addRef('provenance_rights', ref); mark('distribution', ref); mark('provenance_rights', ref);
      }
    }

    const externalUrls = links.filter((url) => externalPageByUrl.get(url)?.status === 200);
    linkedByEntity.set(entityId, externalUrls);
    const dimensionStatuses: Obj = {};
    for (const dimension of dimensions) {
      if (dimension === 'additional_observations') continue;
      const refsForEntity = foundForEntity.get(dimension) || [];
      if (refsForEntity.length) dimensionStatuses[dimension] = { status: 'found', record_refs: refsForEntity };
      else if (selected.some((entry) => entry.page.status === 200)) dimensionStatuses[dimension] = { status: 'attempted_unavailable', attempts: [`Fetched ${selected.map((entry) => entry.url).join(', ')} and searched headings, paragraphs and linked public pages for ${dimension}; no supportable retained signal was found for this case.`] };
      else dimensionStatuses[dimension] = { status: 'unknown', attempts: [`Attempted ${selected.map((entry) => entry.url).join(', ')} but no page returned usable text for ${dimension}.`] };
    }
    const supportedEvidenceIds = entityEvidenceIds.filter((id) => evidence.find((ev) => ev.evidence_id === id)?.summary?.startsWith('Wave 3 fetched') || false);
    const laneAttempted = Object.entries(laneStatuses).filter(([, status]) => status === 'attempted').map(([lane]) => lane);
    const observation = {
      kind: 'cross_project_reusable_case_profile',
      origin_type: supportedEvidenceIds.length ? 'observed' : 'unknown',
      verification_status: supportedEvidenceIds.length ? 'SUPPORTED' : 'UNVERIFIED',
      observed_at: retrievedAt,
      collection_channel: 'web_bottom_trawl_cross_project_enrichment',
      observer: 'Codex',
      text: supportedEvidenceIds.length
        ? `Wave 3 created a reusable, source-linked research profile for ${name}. It is not a claim that every dimension is known: per-dimension states, source lanes and remaining unknowns are retained below for downstream projects.`
        : `Wave 3 attempted to create a reusable research profile for ${name}, but usable page text was not recovered; no unsupported business fact is claimed.`,
      evidence_ids: supportedEvidenceIds,
      entity_ids: [entityId],
      reusable_fact_types: ['identity', 'problem_and_product', 'customer_and_demand', 'pricing', 'money_and_economics', 'distribution', 'operations', 'technology', 'competition_and_market', 'timeline_and_outcomes', 'provenance_and_uncertainty'],
      potential_consumers: ['make-money', 'idea-spark', 'goldmine', 'investrader', 'future-products'],
      reuse_tags: ['business-model', 'customer-pain', 'pricing', 'money-flow', 'distribution', 'operations', 'technology', 'competition', 'failure-learning', 'timeline', 'provenance'],
      source_lane_statuses: laneStatuses,
      source_lanes_attempted: laneAttempted,
      linked_public_urls: externalUrls,
      dimension_statuses: dimensionStatuses,
      collection_tier: 'ENRICHED',
      raw_body_retained: false,
    };
    const observationIndex = observations.push(observation) - 1;
    const observationRef = `observations/${observationIndex}`;
    mark('additional_observations', observationRef);
    mark('provenance_rights', observationRef);
    for (const dimension of dimensions) {
      const status = dimensionStatuses[dimension]?.status;
      if (status === 'found') {
        for (const ref of dimensionStatuses[dimension].record_refs || []) mark(dimension, ref);
      }
    }
  }

  const coverage = dimensions.map((dimension) => {
    const recordRefs = [...new Set(refs.get(dimension) || [])];
    if (recordRefs.length) return { dimension, status: 'found', note: 'Wave 3 fetched public case pages and selected linked public surfaces; case-level partiality remains explicit in reusable profile observations.', record_refs: recordRefs.slice(0, 8) };
    const attempted = casePages.some((item) => item.page.status === 200);
    return attempted
      ? { dimension, status: 'attempted_unavailable', note: 'The wave fetched and searched the declared public surfaces but retained no supportable signal for this batch dimension.', attempts: ['Fetched public case pages, scanned headings/paragraphs, selected up to two linked public surfaces per case, and retained only source-linked metadata/snippets.'] }
      : { dimension, status: 'unknown', note: 'The declared public surfaces could not be recovered in this wave.', attempts: ['Attempted public case-page fetches and link discovery; no usable page text was recovered.'] };
  });

  const bundle: Obj = {
    schema_version: 'research-bundle.v1',
    run_id: runId,
    purpose: 'make_money',
    subject: {
      query: 'Additive cross-project reusable enrichment for 1000 business-case leads',
      candidate_name: null,
      candidate_domain: null,
      notes: 'Wave 3 is additive. It refetched the public case page, selected up to two linked public surfaces per case, retained generic source-linked facts and reusable coverage states, and never overwrites earlier bundles. The same Foundation records can feed Make-Money, Idea Spark, Goldmine, Investrader and future projects.',
    },
    agent: { name: 'Codex cross-project collection coordinator', model: null, version: '2026-09-09-wave3' },
    retrieved_at: retrievedAt,
    sources,
    evidence,
    entities: [],
    claims,
    metrics,
    money_signals: moneySignals,
    events,
    relationships,
    observations,
    derived,
    collection_coverage: coverage,
    quality: {
      unknowns: [
        'A page fetch or linked public page is not proof that a dimension is true; every case retains per-dimension found/attempted-unavailable/unknown state.',
        'External linked surfaces are selected by relevance and availability, not an exhaustive crawl of the whole web.',
        'Actual founder take-home, complete cost breakdown, churn, tax, refunds, source rights and conflicts remain unknown unless directly supported.',
      ],
      conflicts: [],
      warnings: [
        'Wave 3 is metadata-only; raw page bodies are not copied to R2.',
        'The bundle is reusable source material, not a product-specific UI export or a DEEP_RECONCILED claim.',
        'No new schema, bucket, prefix convention or R2 write method is introduced.',
      ],
      schema_validation: 'NOT_RUN',
    },
  };

  const schema = JSON.parse(await readFile(resolve(foundationRepo, 'schemas/foundation/research-bundle.v1.schema.json'), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  if (!validate(bundle)) throw new Error(`research-bundle.v1 validation failed: ${JSON.stringify(validate.errors)}`);
  bundle.quality.schema_validation = 'PASS';
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify({ write_authorized: true, bundle }, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({
    run_id: runId,
    output: outputPath,
    case_pages: casePages.length,
    case_pages_200: casePages.filter((item) => item.page.status === 200).length,
    external_links_selected: externalTargets.length,
    external_pages_200: externalPages.filter((item) => item.page.status === 200).length,
    sources: sources.length,
    evidence: evidence.length,
    claims: claims.length,
    metrics: metrics.length,
    money_signals: moneySignals.length,
    events: events.length,
    relationships: relationships.length,
    observations: observations.length,
    derived: derived.length,
    schema_validation: 'PASS',
    write_authorized: true,
  }));
}

main().catch((error) => { console.error(error instanceof Error ? error.stack || error.message : error); process.exitCode = 1; });
