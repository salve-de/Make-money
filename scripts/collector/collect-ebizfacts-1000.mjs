#!/usr/bin/env node

import fs from 'node:fs';
import crypto from 'node:crypto';
import { checkDuplicate, claimTarget } from '../claim.mjs';

const SNAPSHOT = '2026-09-16';
const AGENT = 'codex-20260916-ebizfacts1000';
const API = 'https://ebizfacts.com/wp-json/wp/v2/posts';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_ebizfacts_profiles_1000_20260916.json';
const AUDIT = process.env.MM_AUDIT_FILE ?? 'data/incoming/batch_ebizfacts_profiles_audit_1000_20260916.json';
const BATCH_ID = process.env.MM_BATCH_ID ?? 'batch-ebizfacts-profiles-1000-20260916';
const PAGE_SIZE = 100;
const DETAIL_CONCURRENCY = 24;
const DETAIL_TIMEOUT_MS = 10_000;

const sanitizeUnicode = (value) => {
  const text = String(value ?? '');
  let output = '';
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        output += text[index] + text[index + 1];
        index += 1;
      } else {
        output += '\ufffd';
      }
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      output += '\ufffd';
    } else {
      output += text[index];
    }
  }
  return output;
};
const truncateUnicode = (value, max) => Array.from(sanitizeUnicode(value)).slice(0, max).join('');
const clean = (value, max = 900) => truncateUnicode(String(value ?? '').replace(/\s+/g, ' ').trim(), max);
const htmlDecode = (value) => String(value ?? '')
  .replace(/&#8217;|&#x2019;/gi, "'")
  .replace(/&#8216;|&#x2018;/gi, "'")
  .replace(/&#8211;|&#x2013;/gi, '–')
  .replace(/&#8212;|&#x2014;/gi, '—')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
const stripHtml = (value) => truncateUnicode(htmlDecode(String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|blockquote|tr)>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/[ \t]+/g, ' ')
  .replace(/[ \t]*\n[ \t]*/g, '\n')
  .replace(/\n{2,}/g, '\n')
  .trim()), 5000);
const sha256 = (value) => crypto.createHash('sha256').update(String(value ?? '')).digest('hex');
const norm = (value) => String(value ?? '').normalize('NFKC').toLowerCase()
  .replace(/<[^>]+>/g, '')
  .replace(/[^\p{L}\p{N}]+/gu, '');
const sourceUrl = (post) => post.link || `https://ebizfacts.com/?p=${post.id}`;

// Word multipliers may be separated by whitespace, but K/M/B suffixes must
// touch the numeric value. Otherwise "$15,000 monthly" becomes "$15,000m".
const MONEY_RE = /([$€£¥])\s*([0-9][0-9,]*(?:\.[0-9]+)?)\+?(?:(?:\s*(million|thousand)\b)|([KMB])\b)?/gi;
const MONEY_SINGLE_RE = /([$€£¥])\s*([0-9][0-9,]*(?:\.[0-9]+)?)\+?(?:(?:\s*(million|thousand)\b)|([KMB])\b)?/i;
const PROFILE_METRIC_RE = /<span[^>]*class=["'][^"']*\bnum\b[^"']*["'][^>]*>([\s\S]*?)<\/span>[\s\S]{0,700}?<span[^>]*class=["'][^"']*\blabel\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;

function sentenceContext(text, index, length) {
  const boundary = /[.!?…\n]/;
  let start = Math.max(0, index);
  while (start > 0 && !boundary.test(text[start - 1])) start -= 1;
  let end = Math.min(text.length, index + length);
  while (end < text.length && !boundary.test(text[end])) end += 1;
  return clean(text.slice(start, end), 700);
}

const excludedSlug = /(review|scam|lottery|betting|gambl|trader|trading)/i;
const excludedContent = /(gambl|casino|betting|sportsbook|psychedelic|shroom|porn|escort|adult|toto22|crypto\s*casino|iptv)/i;
const monetaryTitle = /\$|€|£|¥|\b(?:mrr|arr|revenue|profit|month|monthly|income|sales|earned|made|year)\b/i;

const rateFor = (currency) => ({ '$': 150, '€': null, '£': 190, '¥': 1 }[currency] ?? null);
const symbolName = (currency) => ({ '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY' }[currency] ?? 'UNKNOWN');

function parseMoney(value) {
  // Do not use the global regexp here: String#match with /g drops capture
  // groups and would make match[2] undefined for otherwise valid amounts.
  const match = String(value ?? '').match(MONEY_SINGLE_RE);
  if (!match) return null;
  const currency = match[1];
  let amount = Number(match[2].replace(/,/g, ''));
  const suffix = String(match[3] ?? match[4] ?? '').toLowerCase();
  if (suffix === 'k' || suffix === 'thousand') amount *= 1_000;
  if (suffix === 'm' || suffix === 'million') amount *= 1_000_000;
  if (suffix === 'b') amount *= 1_000_000_000;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const rate = rateFor(currency);
  return { currency, currencyName: symbolName(currency), amount, rate, jpyAmount: rate == null ? null : Math.round(amount * rate) };
}

function classifyMetric(raw, context, source, score = 0) {
  const contextText = clean(context, 700);
  const text = contextText.toLowerCase().includes(String(raw ?? '').toLowerCase())
    ? contextText
    : clean(`${raw} ${contextText}`, 700);
  const lower = text.toLowerCase();
  const money = parseMoney(raw);
  if (!money) return null;
  const rawLower = String(raw ?? '').toLowerCase();
  const rawIndex = lower.indexOf(rawLower);
  const before = rawIndex >= 0 ? lower.slice(Math.max(0, rawIndex - 56), rawIndex) : '';
  const after = rawIndex >= 0 ? lower.slice(rawIndex + rawLower.length, rawIndex + rawLower.length + 84) : lower;
  const profitBefore = /(?:profit(?:s|ability)?|profiting|net\s+income|take[- ]?home|in\s+the\s+bank|in\s+my\s+pocket|pocket)\s*(?:of|was|is|=|:)?\s*$/i.test(before);
  const profitAfter = /^\s*(?:(?:estimated|approx(?:imately)?|about|around|roughly|~|over|under|just\s+over|nearly)\s+)?(?:(?:monthly|annual|first\s+month|third\s+month)\s+)?(?:net\s+)?profit(?:s|ability)?\b|^\s*profiting\b|^\s*(?:in\s+the\s+bank|in\s+my\s+pocket|pocket)\b/i.test(after);
  const revenueBefore = /(?:revenue|sales|turnover|income|earning|earned|made|making|doing|pull(?:ing)?\s+in|generated|gross(?:ing)?)\s*(?:of|was|is|=|:)?\s*$/i.test(before);
  const revenueAfter = /^\s*(?:(?:estimated|approx(?:imately)?|about|around|roughly|~|over|under|just\s+over|nearly)\s+)?(?:(?:monthly|annual|first\s+month|third\s+month|recurring|ad|affiliate|subscription|gross)\s+)*(?:recurring\s+)?(?:revenue|sales|turnover|income)\b|^\s*(?:mrr|arr)\b/i.test(after);
  const profit = profitBefore || profitAfter;
  const revenue = revenueBefore || revenueAfter;
  const monthlyPattern = /\bmonthly\b|\bper\s+month\b|\/\s*month\b|\ba\s+month\b|\beach\s+month\b|\b(?:this|last|that|first|third|next)\s+month\b|\bmonth\s+(?:one|\d+)\b/i;
  const annualPattern = /\bannual(?:ly)?\b|\bper\s+year\b|\/\s*year\b|\ba\s+year\b|\bthis\s+year\b|\byear\s+\d{4}\b/i;
  // Only bind a period when it follows this amount. A preceding phrase such
  // as "sends twice per month, and earned $100K" can describe a different
  // fact and must not turn the accumulated $100K into monthly revenue.
  const periodAfter = after.slice(0, 42);
  const monthly = monthlyPattern.test(periodAfter);
  const annual = annualPattern.test(periodAfter);
  const hasRange = /[–-]\s*(?:[$€£¥])?\s*\d/i.test(after)
    || /(?:[$€£¥])?\s*\d[\d,.]*\s*[KMB]?\s*[–-]\s*$/i.test(before);
  const total = /\btotal\b|\blifetime\b|\bbest\s+month\b|\bin\s+one\s+month\b/i.test(`${before} ${after}`);
  const priceOnly = /\bprice\b|\bcosts?\b|\bsave\b|\bworth\b|\bvaluation\b|\bdiscount\b|\bcharges?\b|\bfees?\b|\bsetup\b|\bretainer\b|\bpackage\b|\bone[- ]time\b|\blicen[cs]e\b|\bper\s+(?:unit|book|cake|square\s+foot|site|customer)\b|\bbudget\b|\bspend(?:ing)?\b|\badvertising\b|\bads\b|\bat\s+[$€£¥]/i.test(`${before} ${after}`) && !profit && !revenue;
  let kind = 'REPORTED_MONEY_SIGNAL';
  if (profit && monthly && !total && !hasRange) kind = 'MONTHLY_PROFIT';
  else if (revenue && monthly && !total && !hasRange && !priceOnly) kind = 'MONTHLY_REVENUE';
  else if (profit && annual && !hasRange) kind = 'ANNUAL_PROFIT';
  else if (revenue && annual && !hasRange && !priceOnly) kind = 'ANNUAL_REVENUE';
  else if (total) kind = 'TOTAL_OR_BEST_PERIOD';
  return {
    ...money,
    raw: clean(raw, 120),
    context: clean(context, 420),
    source,
    kind,
    isProfit: profit,
    isRevenue: revenue,
    isMonthly: monthly,
    isAnnual: annual,
    score: score + (source === 'profile-card' ? 100 : source === 'title' ? 70 : 10)
      + (profit ? 60 : 0) + (revenue ? 40 : 0) + (monthly ? 30 : 0) + (annual ? 10 : 0) - (priceOnly ? 40 : 0),
  };
}

function extractProfileCard(html) {
  const profileName = clean(htmlDecode(html.match(/class=["'][^"']*\bname\b[^"']*["'][\s\S]{0,260}?<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? ''), 180);
  const profileDescription = clean(htmlDecode(html.match(/class=["'][^"']*\bdescription\b[^"']*["'][^>]*>([\s\S]*?)<\/li>/i)?.[1] ?? ''), 220);
  const metrics = [];
  for (const match of html.matchAll(PROFILE_METRIC_RE)) {
    const raw = clean(htmlDecode(match[1]), 120);
    const label = clean(htmlDecode(match[2]), 260);
    const metric = classifyMetric(raw, label, 'profile-card');
    if (metric) metrics.push({ ...metric, label });
    if (metrics.length >= 8) break;
  }
  return { profileName, profileDescription, metrics };
}

function extractMetrics(title, text, cardMetrics) {
  const metrics = [...cardMetrics];
  for (const match of title.matchAll(MONEY_RE)) {
    const raw = match[0];
    const context = sentenceContext(title, match.index ?? 0, raw.length);
    const metric = classifyMetric(raw, context, 'title');
    if (metric) metrics.push(metric);
  }
  for (const match of text.matchAll(MONEY_RE)) {
    if (metrics.length >= 80) break;
    const raw = match[0];
    const context = sentenceContext(text, match.index ?? 0, raw.length);
    const metric = classifyMetric(raw, context, 'article');
    if (metric) metrics.push(metric);
  }
  const deduped = new Map();
  for (const metric of metrics) {
    const key = `${metric.currency}:${metric.amount}:${metric.kind}:${metric.isProfit}:${metric.isRevenue}`;
    const current = deduped.get(key);
    if (!current || metric.score > current.score) deduped.set(key, metric);
  }
  return [...deduped.values()].sort((a, b) => b.score - a.score);
}

function extractSummary(post, text, title) {
  const excerpt = stripHtml(post.excerpt?.rendered ?? '');
  if (excerpt && excerpt.length > 30) return clean(excerpt, 520);
  const paragraphs = text.split(/\n+/).map((v) => clean(v, 520)).filter((v) => v.length >= 40);
  const withoutChrome = paragraphs.filter((v) => !/subscribe|newsletter|privacy|cookie|written by|updated:/i.test(v));
  return clean(withoutChrome.find((v) => v.toLowerCase() !== title.toLowerCase()) ?? text, 520);
}

function extractExternalUrl(html) {
  const forbidden = new Set([
    'ebizfacts.com', 'amazon.com', 'amazon.co.uk', 'walmart.com', 'target.com', 'youtube.com', 'youtu.be',
    'instagram.com', 'x.com', 'twitter.com', 'facebook.com', 'linkedin.com', 'tiktok.com', 'pinterest.com',
    'apple.com', 'apps.apple.com', 'play.google.com', 'google.com', 'stripe.com', 'shopify.com', 'gumroad.com',
  ]);
  for (const match of html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)) {
    try {
      const url = new URL(htmlDecode(match[1]));
      const host = url.hostname.toLowerCase().replace(/^www\./, '');
      if (forbidden.has(host) || host.endsWith('.ebizfacts.com') || host.startsWith('wp-')) continue;
      if (/\/go\/|utm_|mailto:|javascript:/i.test(url.href)) continue;
      return url.href;
    } catch {}
  }
  return '';
}

function inferCountry(text) {
  if (/United States|USA|U\.S\.|Arkansas|New York|California|Texas|Florida|Colorado|Ohio|Utah|Washington/i.test(text)) return 'US';
  if (/United Kingdom|UK|England|London|Scotland|Wales/i.test(text)) return 'GB';
  if (/Canada|Toronto|Vancouver|Ontario/i.test(text)) return 'CA';
  if (/Australia|Sydney|Melbourne/i.test(text)) return 'AU';
  if (/Ireland|Dublin/i.test(text)) return 'IE';
  if (/India|Bangalore|Bengaluru|Mumbai|Delhi/i.test(text)) return 'IN';
  return 'GLOBAL';
}

function inferSector(text) {
  if (/garage floor|3d print|printed|magnets|physical product|resell|reselling|walmart|amazon reseller|coating|manufactur|rubber button/i.test(text)) return 'PHYSICAL_ASSET';
  if (/cleaning|floor coating|local service|photograph|wedding|real estate service|virtual assistant|freelanc/i.test(text)) return 'LOCAL_SERVICES';
  if (/amazon influencer|youtube|blog|newsletter|substack|content|tweets|instagram page|video review|travel blog/i.test(text)) return 'CONTENT_MEDIA';
  if (/stock|payment|finance|compliance|accounting|tax/i.test(text)) return 'FINTECH_INFRA';
  if (/\bAI\b|artificial intelligence|machine learning|image app|chatbot|automation/i.test(text)) return 'AI_AUTOMATION';
  return 'NICHE_SAAS';
}

function inferScale(text) {
  if (/solo|one-person|one person|just me|single founder|two dads|spare time|part[- ]time|15 hours a week|kids are at school/i.test(text)) return 'SOLO';
  if (/co[- ]?founder|cofounder|small team|team of|employees|staff/i.test(text)) return 'SMALL_TEAM';
  return 'UNKNOWN';
}

function inferTools(text) {
  const candidates = [
    ['Amazon Seller app', /Amazon Seller app/i, 'marketplace'],
    ['Amazon', /\bAmazon\b/i, 'marketplace'],
    ['Walmart', /\bWalmart\b/i, 'supplier'],
    ['Target', /\bTarget\b/i, 'supplier'],
    ['Shopify', /\bShopify\b/i, 'commerce'],
    ['Substack', /\bSubstack\b/i, 'publishing'],
    ['WordPress', /\bWordPress\b/i, 'publishing'],
    ['YouTube', /\bYouTube\b/i, 'distribution'],
    ['Instagram', /\bInstagram\b/i, 'distribution'],
    ['TikTok', /\bTikTok\b/i, 'distribution'],
    ['Airbnb', /\bAirbnb\b/i, 'marketplace'],
    ['Stripe', /\bStripe\b/i, 'payments'],
    ['Canva', /\bCanva\b/i, 'creative'],
    ['ChatGPT', /\bChatGPT\b/i, 'AI'],
  ];
  const seen = new Set();
  const out = [];
  for (const [name, pattern, category] of candidates) {
    if (!pattern.test(text) || seen.has(name)) continue;
    seen.add(name);
    out.push({ name, category, monthlyCost: 0, isCostUnconfirmed: true, purpose: '記事本文で言及された集客・供給・制作・決済経路' });
  }
  return out;
}

function metricLabel(metric) {
  if (!metric) return '金額シグナルは詳細本文で未確認';
  const amount = `${metric.currency}${metric.amount.toLocaleString('en-US')}`;
  return `${amount} ${metric.kind.toLowerCase().replaceAll('_', ' ')}`;
}

function makeEntity(post, detail) {
  const articleUrl = sourceUrl(post);
  const title = clean(htmlDecode(post.title?.rendered ?? post.slug ?? `eBiz Facts profile ${post.id}`), 240);
  const html = detail?.content?.rendered ?? '';
  const text = stripHtml(html);
  const card = extractProfileCard(html);
  const summary = extractSummary(detail ?? post, text, title);
  const metrics = extractMetrics(title, text, card.metrics);
  const primary = metrics[0] ?? null;
  // Profile-card and title metrics are bound to this profile. Article-body
  // amounts are retained below, but can describe a related example, price,
  // expense, or an older source; do not promote them into the entity P&L.
  const boundMetric = (metric) => metric && (metric.source === 'profile-card' || metric.source === 'title');
  const monthlyRevenueMetric = metrics.find((m) => boundMetric(m) && m.kind === 'MONTHLY_REVENUE' && m.jpyAmount != null) ?? null;
  const monthlyProfitMetric = metrics.find((m) => boundMetric(m) && m.kind === 'MONTHLY_PROFIT') ?? null;
  const externalUrl = extractExternalUrl(html);
  const bodyHash = sha256(html || title);
  const h = sha256(`${post.id}|${articleUrl}`);
  const metricText = metricLabel(primary);
  const sourceNote = `eBiz Facts profile, ${SNAPSHOT}: ${articleUrl}`;
  const observedDate = String(post.modified || post.date || SNAPSHOT).slice(0, 10);
  const reportedMetrics = metrics.slice(0, 8).map((m) => ({
    original: m.raw,
    currency: m.currencyName,
    amount: m.amount,
    jpyAmount: m.jpyAmount,
    unit: m.kind,
    source: m.source,
    context: m.context,
  }));

  const pnl = {
    monthlyRevenue: monthlyRevenueMetric?.jpyAmount ?? 0,
    cogs: 0,
    grossProfit: 0,
    grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0,
    operatingMargin: 0,
    estimatedAnnualNetProfit: 0,
    financialStatus: primary ? 'REPORTED' : 'UNAVAILABLE',
    dataSnapshotPeriod: `${SNAPSHOT} eBiz Facts公開プロフィール（更新日 ${observedDate}）`,
    sourceDoc: articleUrl,
    sourceClass: 'INDEPENDENT_SECONDARY',
    evidenceLocator: { type: 'html', textHash: bodyHash },
    estimationLogic: monthlyRevenueMetric
      ? `${monthlyRevenueMetric.currencyName}報告月商 ${monthlyRevenueMetric.amount.toLocaleString('en-US')} に ${monthlyRevenueMetric.rate}円を掛けて円換算。利益・原価・経費は未確認。`
      : '記事に記載された金額シグナルを原文のまま保存。月商として扱える根拠がないためP&Lの推定はしない。',
    revenueLabel: primary ? `記事記載: ${metricText}（第三者プロフィールの報告値。利益の独立確認なし）` : '金額シグナル未確認',
    isRevenueUnconfirmed: true,
    isOperatingProfitUnconfirmed: true,
    isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true,
    isGrossMarginUnconfirmed: true,
    isCogsUnconfirmed: true,
    isCostsUnconfirmed: true,
    isNetProfitUnconfirmed: true,
  };
  if (monthlyProfitMetric) {
    pnl.reportedProfitSignal = {
      amount: monthlyProfitMetric.amount,
      currency: monthlyProfitMetric.currencyName,
      jpyAmount: monthlyProfitMetric.jpyAmount,
      period: 'month',
      label: monthlyProfitMetric.raw,
      source: articleUrl,
      verification: 'REPORTED_SECONDARY_NOT_INDEPENDENTLY_AUDITED',
    };
  }
  if (reportedMetrics.some((m) => m.unit === 'ANNUAL_REVENUE')) pnl.reportedAnnualRevenueSignal = reportedMetrics.find((m) => m.unit === 'ANNUAL_REVENUE');

  const details = [
    `記事タイトル: ${title}`,
    card.profileName ? `プロフィール名: ${card.profileName}` : 'プロフィール名: 未確認',
    card.profileDescription ? `プロフィール説明: ${card.profileDescription}` : 'プロフィール説明: 未確認',
    primary ? `金額記載: ${primary.raw} / ${primary.kind} / ${primary.source}` : '金額記載: 詳細本文では未確認',
    `記事更新日: ${observedDate}`,
    'このカードは第三者プロフィールに掲載された報告値であり、財務諸表・決済口座・利益を独立監査した証拠ではない。',
  ];
  const evidenceCards = [
    {
      id: `${h.slice(0, 12)}-loot`,
      type: 'LOOT_BLUEPRINT',
      title: `プロフィールが記録する収益源: ${card.profileDescription || title}`,
      badge: '第三者プロフィール報告',
      evidenceStatus: 'REPORTED',
      punchline: primary ? `${metricText}を生む運用方法を記事本文から抽出する。原価と利益の独立確認は未実施。` : '記事本文に記載された事業手段を一次情報で再確認する。',
      details: [summary, ...details.slice(2)],
      codeSnippet: 'N/A — 実装コードはプロフィール記事に記載なし。',
      sourceNote,
      sourceUrl: articleUrl,
      sourceClass: 'INDEPENDENT_SECONDARY',
      evidenceLocator: { type: 'html', textHash: bodyHash },
      metrics: primary ? [{ label: '記事記載金額', value: metricText, isHighlight: true }, { label: '利益・原価', value: '独立確認なし' }] : [{ label: '金額', value: '未確認' }],
    },
    {
      id: `${h.slice(12, 24)}-crime`,
      type: 'THE_CRIME',
      title: '報告値と実際の手残りを分離',
      badge: '財務境界',
      evidenceStatus: primary ? 'REPORTED' : 'UNKNOWN',
      punchline: primary ? `記事は${metricText}を記載しているが、原価・広告費・税・手残りは記載値だけでは確定できない。` : '金額の意味・期間・原価は記事本文から確定できない。',
      details,
      sourceNote,
      sourceUrl: articleUrl,
      sourceClass: 'INDEPENDENT_SECONDARY',
      evidenceLocator: { type: 'html', textHash: bodyHash },
      metrics: primary ? [{ label: '原文の金額', value: primary.raw }, { label: '手残り', value: '未確認' }] : [{ label: '金額', value: '未確認' }],
    },
    {
      id: `${h.slice(24, 36)}-genesis`,
      type: text.length > 60 ? 'DIRTY_GENESIS' : 'UNKNOWN_AUDIT',
      title: text.length > 60 ? '本文に記載された初動・運用手段' : '記事本文の不足範囲',
      badge: text.length > 60 ? '本文観測' : '未確認',
      evidenceStatus: text.length > 60 ? 'REPORTED' : 'UNKNOWN',
      punchline: text.length > 60 ? clean(summary, 300) : '記事本文を取得できず、初動手段は未確認。',
      details: text.length > 60 ? [`本文要約: ${summary}`, 'この要約は記事の記載内容であり、再現性・現在の稼働は別途確認が必要。'] : ['取得失敗を事業停止とは断定しない。'],
      sourceNote,
      sourceUrl: articleUrl,
      sourceClass: 'INDEPENDENT_SECONDARY',
      evidenceLocator: { type: 'html', textHash: bodyHash },
    },
  ];

  const strategy = {
    blindspot: `【観測された隙間】${summary}`,
    moatType: 'UNKNOWN',
    moatDescription: '【防御要因】プロフィール記事だけでは、独自データ・継続率・供給制約などの堀を検証できない。',
    incumbentDilemma: '【大手との関係】大手のカニバリゼーションや規約上の死角は記事本文だけでは未確認。',
    secretInsight: `【金額の境界】${metricText}は第三者記事の報告値であり、営業利益・手残りとは分離して扱う。`,
    initialTraction: [`eBiz Facts記事更新日: ${observedDate}`, `記事要約: ${summary}`, '初期顧客獲得数・経路は未確認'],
    actionPlaybook: [
      `記事本文の収益源「${clean(card.profileDescription || summary, 180)}」を公式サイト・本人発信で照合する。`,
      primary ? `記事記載の${metricText}について、期間・売上/利益区分・原価を分解する。` : '金額の期間と売上/利益区分を一次情報で確認する。',
      '確認できない財務項目は推定値に置き換えず、未確認のまま保存する。',
    ],
    coldOutreachTemplate: '記事に記載された収益源について、売上と原価を分けて確認できる公開資料があるか尋ねる。',
  };

  const observations = [
    `eBiz Factsプロフィール記事: ${title}`,
    `記事更新日: ${observedDate}`,
    `記事要約: ${summary}`,
    primary ? `記事記載金額: ${metricText}（第三者報告値）` : '記事記載金額: 未確認',
    externalUrl ? `外部リンク候補: ${externalUrl}` : '公式サイト候補: 未確認（プロフィール記事をsource URLとして保持）',
    '利益、原価、広告費、税、実際の手残りは独立確認していない。',
  ];
  const observationsStream = [
    { id: `${h.slice(36, 48)}-article`, category: 'MARKET_DISTORTION', originType: 'reported', verificationStatus: 'SUPPORTED', text: `eBiz Factsがプロフィール記事「${title}」を公開している。`, sourceUrl: articleUrl, observedAt: observedDate, sourceClass: 'INDEPENDENT_SECONDARY', evidenceLocator: { type: 'html', textHash: bodyHash } },
    { id: `${h.slice(48, 60)}-finance-limit`, category: 'RESEARCH_LIMIT', originType: 'observed', verificationStatus: 'UNVERIFIED', text: primary ? `記事記載の${metricText}は第三者報告値で、利益・原価・手残りの独立確認は未実施。` : '記事本文から財務期間・金額区分を確定できない。', sourceUrl: articleUrl, observedAt: observedDate, sourceClass: 'INDEPENDENT_SECONDARY', evidenceLocator: { type: 'html', textHash: bodyHash } },
  ];

  const officialOrSourceUrl = externalUrl || articleUrl;
  const unknowns = [
    '第三者プロフィールの報告値であり、本人の決済口座・財務諸表による独立確認は未実施。',
    '原価、広告費、外注費、税、営業利益、純利益、継続性は未確認。',
    externalUrl ? `外部リンクは公式サイトであることを未確認: ${externalUrl}` : '公式サイト・法人名は未確認。source URLはeBiz Facts記事。',
  ];

  return {
    id: `ent_ebizfacts_${post.slug.replace(/[^a-z0-9]+/gi, '').slice(0, 44) || 'profile'}_${h.slice(0, 12)}`,
    ticker: `EB${h.slice(0, 8).toUpperCase()}`,
    name: title,
    legalEntity: 'UNKNOWN (eBiz Facts公開プロフィールのみ)',
    tagline: primary ? `「${clean(summary, 120)}」に対し、記事は${metricText}を報告。利益・手残りは未確認。` : `「${clean(summary, 150)}」を扱う事例。金額区分と利益は未確認。`,
    sector: inferSector(`${title} ${card.profileDescription} ${summary} ${text.slice(0, 1500)}`),
    scale: inferScale(`${title} ${card.profileDescription} ${summary} ${text.slice(0, 1800)}`),
    founder: card.profileName || 'UNKNOWN (プロフィールカードで未確認)',
    country: inferCountry(`${summary} ${text.slice(0, 2500)}`),
    url: officialOrSourceUrl,
    verifiedBadge: false,
    growthRateYoY: 0,
    isGrowthUnconfirmed: true,
    architecturePattern: 'UNKNOWN (プロフィール記事から実装方式は未確認)',
    pipelineStack: 'UNKNOWN (プロフィール記事から技術構成は未確認)',
    targetPainWallet: clean(summary || card.profileDescription || title, 420),
    tags: [
      'EBIZFACTS_PROFILE',
      'INDEPENDENT_SECONDARY_REPORT',
      primary?.isProfit ? 'REPORTED_PROFIT_SIGNAL' : primary?.isRevenue ? 'REPORTED_REVENUE_SIGNAL' : 'REPORTED_MONEY_SIGNAL',
      inferScale(`${title} ${card.profileDescription} ${summary}`) === 'SOLO' ? 'SOLO_OR_SOLO_LIKELY' : 'TEAM_SIZE_UNCONFIRMED',
    ],
    pnl,
    evidenceCards,
    operations: {
      teamSize: inferScale(`${title} ${card.profileDescription} ${summary}`) === 'SOLO' ? 1 : 0,
      initialTeamSize: 0,
      currentTeamSize: 0,
      weeklyHours: 0,
      initialCapitalRequired: 0,
      automationLevel: 0,
      primaryChannels: [...new Set(['eBiz Facts profile', ...(externalUrl ? ['external link'] : []), ...inferTools(`${summary} ${text}`).map((tool) => tool.name)])].slice(0, 6),
      toolStack: inferTools(`${summary} ${text}`),
      isTeamSizeUnconfirmed: true,
      isWeeklyHoursUnconfirmed: true,
      isCapitalUnconfirmed: true,
      isAutomationUnconfirmed: true,
    },
    strategy,
    temporal: {
      foundedYear: 0,
      initialTractionPeriod: `プロフィール記事の更新日 ${observedDate}。創業年・初動獲得経路は未確認。`,
      dataSnapshotPeriod: `${SNAPSHOT} eBiz Facts公開プロフィール取得`,
      viabilityStatus: 'UNKNOWN',
      viabilityLabel: '現在の稼働・継続性は未確認',
      eraContext: `eBiz Factsが${observedDate}に更新した公開プロフィール。記事掲載は事業の現在稼働や利益を保証しない。`,
      currentViabilityAnalysis: '記事の報告値と現行の公式情報・利益は別物であり、一次情報での照合が必要。',
    },
    observations,
    observationsStream,
    essence: { whatItDoes: clean(card.profileDescription || title, 280), targetCustomer: clean(summary || 'プロフィール記事から顧客像は未確認。', 280), painRelief: clean(summary || title, 420) },
    lootBlueprint: {
      blueprintId: `ent_ebizfacts_${h.slice(0, 12)}-loot`,
      targetPrey: clean(summary || card.profileDescription || title, 420),
      structuralFlaw: `記事本文が示す未処理課題: ${clean(summary || '未確認', 420)}`,
      stealthEntry: `記事に記載された運用手段: ${clean(text.slice(0, 420) || '未確認', 420)}`,
      tollGateSetup: primary ? `記事が報告する金額区分: ${metricText}。料金・継続率・原価は未確認。` : '料金・継続率・原価・金額区分は未確認。',
      reproducibilityScore: 0,
      moatDurabilityScore: 0,
      capitalEfficiencyScore: 0,
      executionChecklist: [
        `記事の収益源「${clean(card.profileDescription || summary || title, 160)}」を一次情報で照合する。`,
        primary ? `記事記載の${metricText}を売上・利益・期間に分解する。` : '金額の期間と売上/利益区分を一次情報で確認する。',
        '確認できない原価・利益はゼロ実績にせず未確認として扱う。',
      ],
    },
    publishability: 'PARTIAL',
    claimBindings: [],
    unknownsNotes: unknowns,
    screening: { winner: null, initialTeamPass: inferScale(`${title} ${card.profileDescription} ${summary}`) === 'SOLO' ? true : null, capitalStatus: 'unknown', qualificationStatus: 'CAPTURE_REQUIRES_PRIMARY_FINANCIAL_RECONCILIATION', backgroundAndScaleCaveat: 'eBiz Factsの第三者プロフィールを根拠にした候補。利益・自立性は一次確認前。' },
    caseType: 'EBIZFACTS_PROFILE_CASE',
    profileSubject: card.profileName || null,
    profileBusinessLabel: card.profileDescription || null,
    reportedMetrics,
    officialUrl: externalUrl || null,
    sourceMetadata: { provider: 'eBiz Facts', postId: post.id, slug: post.slug, publishedAt: post.date ?? null, modifiedAt: post.modified ?? null, rawContentSha256: bodyHash },
    batchId: BATCH_ID,
  };
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? DETAIL_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'Make-Money eBiz Facts collector/1.0', accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchMetadata() {
  const posts = [];
  for (let page = 1; page <= 20; page += 1) {
    const params = new URLSearchParams({ categories: '812', per_page: String(PAGE_SIZE), page: String(page), _fields: 'id,slug,date,modified,title,excerpt,link,categories,tags' });
    const rows = await fetchJson(`${API}?${params.toString()}`, { timeout: 20_000 });
    posts.push(...rows);
    console.error(`profile-index ${posts.length}`);
    if (rows.length < PAGE_SIZE) break;
  }
  return posts;
}

async function mapWorkers(items, count, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: count }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      out[index] = await fn(items[index], index);
      if ((index + 1) % 100 === 0 || index + 1 === items.length) console.error(`profile-detail ${index + 1}/${items.length}`);
    }
  }));
  return out;
}

function candidatePosts(posts) {
  return posts.filter((post) => {
    const year = Number(String(post.modified || post.date || '').slice(0, 4));
    const title = clean(htmlDecode(post.title?.rendered ?? ''), 300);
    return year >= 2024 && year <= 2026 && title.length >= 12 && !excludedSlug.test(post.slug || '') && !excludedContent.test(`${title} ${post.slug || ''}`) && monetaryTitle.test(`${title} ${post.slug || ''}`);
  });
}

function claimQuietly(name) {
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};
  try { claimTarget(name, AGENT, false); } finally { console.log = originalLog; console.error = originalError; }
}

const posts = await fetchMetadata();
const allCandidates = candidatePosts(posts);
const existingIndex = JSON.parse(fs.readFileSync('data/entities-index.json', 'utf8'));
const existingNorm = new Set(existingIndex.map((entity) => norm(entity.name)));
const resume = process.argv.includes('--resume');
const replacementMode = process.env.MM_REPLACEMENT_MODE === '1';
const targetCount = Number(process.env.MM_TARGET_COUNT ?? 1000);
const claimedByThisAgent = new Set(fs.readFileSync('data/CLAIMED_TARGETS.txt', 'utf8').split(/\r?\n/)
  .filter((line) => line.includes(`[CLAIMED:${AGENT} @`))
  .map((line) => line.split(' [CLAIMED:')[0].trim()));
const selected = [];
const selectedNorm = new Set();
for (const post of allCandidates) {
  if (selected.length >= targetCount) break;
  const title = clean(htmlDecode(post.title?.rendered ?? post.slug ?? ''), 300);
  const key = norm(title);
  if (!key || selectedNorm.has(key) || existingNorm.has(key)) continue;
  const duplicate = checkDuplicate(title);
  if (replacementMode) {
    if (claimedByThisAgent.has(title)) continue;
    if (duplicate.exists) continue;
    claimQuietly(title);
  } else if (resume) {
    if (!claimedByThisAgent.has(title)) continue;
  } else {
    if (duplicate.exists) continue;
    // Reserve immediately before any per-profile detail request. This keeps
    // the claim lock adjacent to the research boundary and lets a concurrent
    // collector win safely if the state changed between candidates.
    claimQuietly(title);
  }
  selected.push({ ...post, claimName: title });
  selectedNorm.add(key);
}
if (selected.length !== targetCount) throw new Error(`${replacementMode ? 'Replacement selected' : resume ? 'Resume found' : 'Selected'} only ${selected.length}/${targetCount} eBiz Facts candidates`);

const details = await mapWorkers(selected, DETAIL_CONCURRENCY, async (post) => {
  try {
    const params = new URLSearchParams({ _fields: 'id,slug,date,modified,title,excerpt,content,link,author' });
    const detail = await fetchJson(`${API}/${post.id}?${params.toString()}`);
    return { post, detail, fetchStatus: 'OK', fetchError: null };
  } catch (error) {
    return { post, detail: null, fetchStatus: 'FAILED', fetchError: clean(error?.message ?? error, 240) };
  }
});

const entities = details.map(({ post, detail }) => makeEntity(post, detail));
const audit = details.map(({ post, detail, fetchStatus, fetchError }, index) => {
  const html = detail?.content?.rendered ?? '';
  const card = extractProfileCard(html);
  const text = stripHtml(html);
  const metrics = extractMetrics(clean(htmlDecode(post.title?.rendered ?? post.slug), 300), text, card.metrics);
  return { index, id: entities[index].id, name: entities[index].name, articleUrl: sourceUrl(post), postId: post.id, slug: post.slug, publishedAt: post.date ?? null, modifiedAt: post.modified ?? null, fetchStatus, fetchError, bodySha256: sha256(html || post.title?.rendered || ''), profileName: card.profileName || null, profileDescription: card.profileDescription || null, metricCount: metrics.length, primaryMetric: metrics[0] ? { raw: metrics[0].raw, kind: metrics[0].kind, source: metrics[0].source, currency: metrics[0].currencyName, amount: metrics[0].amount, jpyAmount: metrics[0].jpyAmount } : null };
});

fs.writeFileSync(OUTPUT, `${JSON.stringify(entities, null, 2)}\n`, 'utf8');
fs.writeFileSync(AUDIT, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ output: OUTPUT, audit: AUDIT, sourcePosts: posts.length, candidatePosts: allCandidates.length, selected: entities.length, detailsOk: audit.filter((row) => row.fetchStatus === 'OK').length, detailsFailed: audit.filter((row) => row.fetchStatus !== 'OK').length, withMetric: audit.filter((row) => row.metricCount > 0).length }, null, 2));
