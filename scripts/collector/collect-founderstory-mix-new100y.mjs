#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { gunzipSync } from "node:zlib";
import { checkDuplicate, claimTarget } from "../claim.mjs";

const ROOT = process.cwd();
const SNAPSHOT = "2026-09-16";
const AGENT_ID = "codex-20260916-founderstory-new100y";
const BATCH_ID = "batch-founderstory-mix-new100y-20260916";
const OUTPUT_FILE = path.join(ROOT, "data/incoming/external_collectors/batch_founderstory_mix_new100y_20260916.json");
const AUDIT_FILE = path.join(ROOT, "data/incoming/audit_logs/batch_founderstory_mix_new100y_audit_20260916.json");
const STARTER_SITEMAP = "https://www.starterstory.com/sitemap.xml";
const FOUNDER_SITEMAP = "https://founderreports.com/interview-sitemap.xml";
const HTTP_HEADERS = { "user-agent": "Make-Money-source-audit/1.0" };

const FORBIDDEN = /(サバンナ\s*OS|savan+ah\s*os|カンニングペーパー|不公正な|100倍|逆数|自演|fake\s+review|ransomware|porn|adult|gambl|casino|betting|crypto|bitcoin|nft|deepfake|buy\s+(?:old\s+)?account|account\s+for\s+sale|followers|likes|instagram\s+service|tiktok\s+views|youtube\s+views|link\s+building|backlink|seo\s+agency|marketing\s+agency|web\s+development\s+company|venture[- ]funded|assets?\s+under\s+management|managed\s+\$[\d,.]+[mb]?)/i;
const IH_REJECT = /(iptv|paypal\s*account|buy\s*(old\s*)?(account|gmail)|account(s)?\s*(market|for\s*sale)|ransomware|crypto|bitcoin|binance|daily\s*profit|investment\s*earn|casino|gambl|escort|porn|xxx|adult|sportsbook|betting|guest\s*post|followers|likes|instagram\s*service|facebook\.com|tiktok\s*views|youtube\s*views|nft\s*mint|forex\s*signal|deepfake|link\s*building|backlink|seo\s*agency|press\s*agency|marketing\s*agency|web\s*development\s*company|smm|airbnb\s*clone\s*script|psychedelic|shroom|\.gumroad\.com|apk|modded|watermark\s*remov|prompt\s+template|content\s+calendar|personal\s+finance|financial\s+independence|coaching\s+for\s+founders|online\s+courses|cold\s+calling|appointment\s+setting)/i;
const FOUNDER_REJECT = /(venture[- ]funded|assets?\s+under\s+management|manages?\s+\$[\d,.]+[mb]?|valuation|pre[- ]revenue|no\s+revenue|zero\s+revenue|before\s+revenue|projected\s+\$|expected\s+\$|aims?\s+to\s+make|goal\s+of\s+\$|target\s+of\s+\$|hopes?\s+to\s+reach|would\s+be\s+\$|could\s+make\s+\$)/i;
const MONEY_TOKEN = /(?:[$€£]\s*\d[\d,.]*(?:\s*[-–]\s*\d[\d,.]*)?\s*(?:k|m|b|million|billion)?|\d[\d,.]*\s*(?:k|m|b|million|billion)\s*(?:usd|eur|gbp)?|(?:six|seven|eight|multi)[ -]?figure)/gi;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tidy(value, max = 800) {
  const text = decodeEntities(String(value ?? "").replace(/\s+/g, " ").trim());
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripHtml(value) {
  return tidy(String(value ?? "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " "));
}

function attr(tag, name) {
  return String(tag).match(new RegExp("\\b" + name + "\\s*=\\s*[\"']([^\"']*)[\"']", "i"))?.[1] ?? "";
}

function metaValue(html, key) {
  for (const tag of String(html).match(/<meta\b[^>]*>/gi) ?? []) {
    const property = attr(tag, "property") || attr(tag, "name");
    if (property.toLowerCase() === key.toLowerCase()) return decodeEntities(attr(tag, "content"));
  }
  return "";
}

function canonicalUrl(html, fallback) {
  const link = String(html).match(/<link\b[^>]*rel=["']canonical["'][^>]*>/i);
  return attr(link?.[0] ?? "", "href") || fallback;
}

function digest(value) {
  return crypto.createHash("sha256").update(String(value), "utf8").digest("hex");
}

function shortDigest(value) {
  return digest(value).slice(0, 12);
}

function slug(value) {
  const ascii = String(value ?? "").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 42);
  return ascii || "case";
}

function normalize(value) {
  return String(value ?? "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
}

function domainOf(value) {
  try {
    return new URL(String(value)).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function validUrl(value) {
  try {
    const url = new URL(String(value));
    return /^https?:$/.test(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function normalizeUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(raw)) return "https://" + raw;
  return "";
}

function parseMoneyToken(original) {
  const raw = String(original ?? "").trim();
  if (!raw || /figure/i.test(raw)) return { original: raw };
  const match = raw.match(/([$€£])?\s*(\d[\d,.]*)(?:\s*[-–]\s*(\d[\d,.]*))?\s*(k|m|b|million|billion)?/i);
  if (!match) return { original: raw };
  const first = Number(String(match[2]).replace(/,/g, ""));
  const second = match[3] ? Number(String(match[3]).replace(/,/g, "")) : first;
  if (!Number.isFinite(first)) return { original: raw };
  const unit = String(match[4] ?? "").toLowerCase();
  const multiplier = unit === "k" ? 1e3 : unit === "m" || unit === "million" ? 1e6 : unit === "b" || unit === "billion" ? 1e9 : 1;
  const currency = match[1] === "$" ? "USD" : match[1] === "€" ? "EUR" : match[1] === "£" ? "GBP" : "";
  return { original: raw, amount: Math.max(first, second) * multiplier, ...(currency ? { currency } : {}) };
}

function metricUnit(token, context) {
  const text = String(context ?? "").toLowerCase();
  if (/operating\s+cost|costs?|expenses?|spend|overhead/.test(text)) return "OPERATING_COST";
  if (/profit|margin|net\s+income/.test(text)) return "PROFIT_SIGNAL";
  if (/\bmrr\b|monthly\s+recurring|revenue\/mo|per\s+month|\/month|monthly\s+revenue/.test(text)) return "MONTHLY_REVENUE";
  if (/\barr\b|annual\s+recurring|annual\s+revenue|yearly\s+revenue|per\s+year|\/year/.test(text)) return "ANNUAL_REVENUE";
  if (/revenue|sales|turnover|income/.test(text)) return "REVENUE_SIGNAL";
  return "REPORTED_MONEY_SIGNAL";
}

function extractMetrics(text, source, contextLabel) {
  const result = [];
  for (const match of String(text ?? "").matchAll(MONEY_TOKEN)) {
    const original = tidy(match[0], 80);
    const parsed = parseMoneyToken(original);
    const around = String(text).slice(Math.max(0, match.index - 100), Math.min(String(text).length, match.index + original.length + 100));
    const item = {
      original,
      ...(parsed.currency ? { currency: parsed.currency } : {}),
      ...(Number.isFinite(parsed.amount) ? { amount: parsed.amount } : {}),
      unit: metricUnit(original, around),
      source,
      context: contextLabel,
    };
    const key = JSON.stringify(item);
    if (!result.some((existing) => JSON.stringify(existing) === key)) result.push(item);
    if (result.length >= 10) break;
  }
  return result;
}

async function fetchText(url, options = {}) {
  const attempts = options.attempts ?? 4;
  const timeoutMs = options.timeoutMs ?? 30000;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
        headers: { ...HTTP_HEADERS, ...(options.headers ?? {}) },
      });
      const bytes = Buffer.from(await response.arrayBuffer());
      const body = bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes).toString("utf8") : bytes.toString("utf8");
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return { status: response.status, url: response.url, body };
      }
      lastError = new Error("HTTP " + response.status + " for " + url);
    } catch (error) {
      lastError = error;
    }
    await sleep(350 * (attempt + 1));
  }
  throw lastError ?? new Error("Fetch failed: " + url);
}

async function mapConcurrent(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      try {
        results[index] = await fn(items[index], index);
      } catch (error) {
        results[index] = { error: error instanceof Error ? error.message : String(error) };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, () => worker()));
  return results;
}

function locsFromXml(xml) {
  return Array.from(String(xml).matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)).map((m) => decodeEntities(m[1]));
}

function classBlock(html, className, max = 8000) {
  const pattern = new RegExp("<div[^>]+class=[\"'][^\"']*\\b" + className + "\\b[^\"']*[\"'][^>]*>([\\s\\S]{0," + max + "})</div>", "i");
  return String(html).match(pattern)?.[1] ?? "";
}

function divClassText(html, className) {
  const pattern = new RegExp("<div[^>]+class=[\"'][^\"']*\\b" + className + "\\b[^\"']*[\"'][^>]*>([\\s\\S]{0,1800}?)</div>", "i");
  return stripHtml(String(html).match(pattern)?.[1] ?? "");
}

function firstHref(value) {
  return normalizeUrl(String(value ?? "").match(/href=["']([^"']+)["']/i)?.[1] ?? "");
}

function extractStarterStory(url, body, status = 200) {
  const title = tidy(metaValue(body, "og:title") || body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url, 260);
  const description = tidy(metaValue(body, "description") || metaValue(body, "og:description"), 720);
  const publishedAt = metaValue(body, "article:published_time");
  const modifiedAt = metaValue(body, "article:modified_time") || metaValue(body, "og:updated_time");
  const business = classBlock(body, "meta-business-details", 12000);
  const businessName = tidy(divClassText(business, "name"), 220);
  const officialUrl = firstHref(classBlock(business, "website", 2200));
  const location = tidy(divClassText(business, "location"), 180);
  const started = tidy(divClassText(business, "started"), 120);
  const founder = tidy(divClassText(classBlock(body, "meta-about-starter-details", 3500), "name"), 180) || tidy(metaValue(body, "article:author"), 180);
  const moneyBlock = body.match(/<div[^>]+class=["'][^"']*\bdetail\s+money\b[^"']*["'][^>]*>([\s\S]{0,900}?)<\/div>\s*<\/div>/i)?.[1] ?? "";
  const revenueOriginal = tidy(moneyBlock.match(/<div[^>]+class=["'][^"']*\bdata\b[^"']*["'][^>]*>([^<]+)</i)?.[1] ?? "", 80);
  const revenue = parseMoneyToken(revenueOriginal);
  const foundersRaw = tidy(divClassText(classBlock(body, "detail founders", 900), "data"), 40);
  const employeesRaw = tidy(divClassText(classBlock(body, "detail employees", 900), "data"), 40);
  const teamCount = Number((employeesRaw || foundersRaw).match(/\d+/)?.[0] ?? 0);
  const year = Number((started || publishedAt).match(/\b(19|20)\d{2}\b/)?.[0] ?? 0);
  const sourceText = [title, description, businessName, founder, location, started, revenueOriginal].filter(Boolean).join(" ");
  const qualified = status === 200 && businessName.length >= 3 && validUrl(officialUrl) && Number(revenue.amount) >= 1000
    && !FORBIDDEN.test(sourceText);
  return {
    provider: "Starter Story",
    sourceClass: "INDEPENDENT_SECONDARY",
    sourceType: "business_story",
    sourceUrl: canonicalUrl(body, url),
    sourceBody: body,
    httpStatus: status,
    title,
    description,
    publishedAt,
    modifiedAt,
    businessName,
    founder,
    officialUrl,
    location,
    started,
    year,
    teamCount,
    teamRaw: employeesRaw || foundersRaw,
    revenueOriginal,
    revenueAmount: Number.isFinite(revenue.amount) ? revenue.amount : 0,
    revenueCurrency: revenue.currency || "USD",
    financialExcerpt: revenueOriginal ? revenueOriginal + " revenue/mo" : title,
    summary: tidy(description || title, 520),
    qualified,
  };
}

function fieldFromOverview(window, labelPattern) {
  const match = String(window).match(new RegExp("<strong>\\s*" + labelPattern + "\\s*:\\s*</strong>\\s*([\\s\\S]{0,900}?)(?=<br\\s*/?>|</p>)", "i"));
  if (!match) return "";
  let value = match[1];
  value = value.replace(new RegExp("^\\s*<strong>\\s*" + labelPattern + "\\s*:\\s*</strong>\\s*", "i"), "");
  return tidy(stripHtml(value), 420);
}

function extractFounderReport(url, body, status = 200) {
  const title = tidy(metaValue(body, "og:title") || body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url, 260);
  const description = tidy(metaValue(body, "description") || metaValue(body, "og:description"), 720);
  const publishedAt = metaValue(body, "article:published_time");
  const modifiedAt = metaValue(body, "article:modified_time") || metaValue(body, "og:updated_time");
  const overviewIndex = body.search(/<strong>\s*Business Name\s*:/i);
  const overview = overviewIndex >= 0 ? body.slice(overviewIndex, overviewIndex + 10000) : body;
  const businessName = fieldFromOverview(overview, "Business Name") || tidy(title.split(":")[0], 220);
  const officialUrl = normalizeUrl(fieldFromOverview(overview, "Website URL"));
  const founder = fieldFromOverview(overview, "Founders?") || tidy(metaValue(body, "article:author"), 180);
  const location = fieldFromOverview(overview, "Business Location");
  const started = fieldFromOverview(overview, "Year Started");
  const teamRaw = fieldFromOverview(overview, "Number of Employees/Contractors/Freelancers");
  const teamCount = Number(teamRaw.match(/\d+/)?.[0] ?? 0);
  const year = Number(started.match(/\b(19|20)\d{2}\b/)?.[0] ?? publishedAt.match(/\b(19|20)\d{2}\b/)?.[0] ?? 0);
  const revenueText = stripHtml(body.match(/<h2[^>]*>\s*How much revenue and profit does the business generate\?\s*<\/h2>\s*<p[^>]*>([\s\S]{0,5000}?)<\/p>/i)?.[1] ?? "");
  const excerpt = tidy(revenueText || title + " " + description, 900);
  const combined = [title, description, revenueText].join(" ");
  const metrics = extractMetrics(combined, "founder_reports_interview", revenueText ? "revenue_and_profit_question" : "title_or_description");
  const actualLike = /\b(?:revenue|profit|mrr|arr|sales|turnover|income)\b/i.test(combined)
    && (Boolean(revenueText) || /\b(?:generated|generate|made|makes|earned|earns|reported|currently|is at|was|last year|per month|per year|profitable)\b/i.test(combined));
  const fundingOnly = /(venture[- ]funded|raised\s+\$|funding|assets?\s+under\s+management|manages?\s+\$[\d,.]+[mb]?|valuation)/i.test(combined)
    && !/\b(?:revenue|profit|mrr|arr|sales|turnover)\b/i.test(combined);
  const projectedOnly = FOUNDER_REJECT.test(combined) && !/\b(?:generated|generate|made|makes|earned|earns|reported|currently|is at|was|last year|per month|per year|profitable)\b/i.test(revenueText || title);
  const qualified = status === 200 && businessName.length >= 3 && validUrl(officialUrl) && metrics.length > 0 && actualLike && !fundingOnly && !projectedOnly
    && !FORBIDDEN.test([businessName, title, description, revenueText].join(" "));
  const largest = metrics.map((m) => Number(m.amount) || 0).sort((a, b) => b - a)[0] || 0;
  return {
    provider: "Founder Reports",
    sourceClass: "INDEPENDENT_SECONDARY",
    sourceType: "founder_interview",
    sourceUrl: canonicalUrl(body, url),
    sourceBody: body,
    httpStatus: status,
    title,
    description,
    publishedAt,
    modifiedAt,
    businessName,
    founder,
    officialUrl,
    location,
    started,
    year,
    teamCount,
    teamRaw,
    revenueOriginal: excerpt,
    revenueAmount: largest,
    revenueCurrency: metrics.find((m) => m.currency)?.currency || "USD",
    financialExcerpt: excerpt,
    reportedMetrics: metrics,
    summary: tidy(description || revenueText || title, 520),
    qualified,
  };
}

function sectorFor(candidate) {
  const text = [candidate.businessName, candidate.title, candidate.description, candidate.summary].join(" ").toLowerCase();
  if (/\b(ai|artificial intelligence|machine learning|automation|llm|generative)\b/.test(text)) return "AI_AUTOMATION";
  if (/\b(payment|payments|bank|banking|finance|financial|accounting|invoice|billing|investment|trading)\b/.test(text)) return "FINTECH_INFRA";
  if (/\b(shoe|golf|jewelry|jewellery|chocolate|seafood|bed|mattress|clothing|apparel|food|drink|beverage|hardware|manufactur|retail|ecommerce|e-commerce|product brand)\b/.test(text)) return "PHYSICAL_ASSET";
  if (/\b(blog|magazine|media|newsletter|youtube|podcast|content|creator)\b/.test(text)) return "CONTENT_MEDIA";
  if (/\b(law|lawyer|doctor|medical|clinic|dental|escape room|event|cleaning|home service|restaurant|agency|consulting|freelance|photobooth)\b/.test(text)) return "LOCAL_SERVICES";
  if (/\b(saas|software|app|platform|tool|online|digital|api|plugin|marketplace)\b/.test(text)) return "NICHE_SAAS";
  return "NICHE_SAAS";
}

function scaleFor(candidate) {
  const n = Number(candidate.teamCount) || 0;
  if (candidate.teamRaw && n <= 1) return "SOLO";
  if (n > 1 && n <= 10) return "SMALL_TEAM";
  if (n > 10 && n <= 50) return "SCALEUP";
  if (n > 50) return "ENTERPRISE";
  return "UNKNOWN";
}

function countryFor(candidate) {
  const text = [candidate.location, candidate.description].join(" ").toLowerCase();
  if (/\b(japan|japanese)\b/.test(text)) return "JP";
  if (/\b(hong kong)\b/.test(text)) return "HK";
  if (/\b(australia|australian)\b/.test(text)) return "AU";
  if (/\b(canada|canadian)\b/.test(text)) return "CA";
  if (/\b(singapore)\b/.test(text)) return "SG";
  if (/\b(united kingdom|uk|england|scotland|wales)\b/.test(text)) return "GB";
  if (/\b(united states|usa|u\.s\.a\.|colorado|california|new york|texas)\b/.test(text)) return "US";
  return "GLOBAL";
}

function parseJsonFile(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function jsonFilesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...jsonFilesUnder(full));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(full);
  }
  return files;
}

function collectEntityish(value, sink) {
  if (Array.isArray(value)) {
    for (const item of value) collectEntityish(item, sink);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (typeof value.name === "string") sink.push(value);
  if (Array.isArray(value.entities)) collectEntityish(value.entities, sink);
  if (Array.isArray(value.items)) collectEntityish(value.items, sink);
}

function loadKnownTargets() {
  const names = new Set();
  const domains = new Set();
  const tickers = new Set();
  const files = [
    path.join(ROOT, "data/entities-index.json"),
    path.join(ROOT, "data/collected-registry.json"),
    ...jsonFilesUnder(path.join(ROOT, "data/incoming")),
  ];
  const entities = [];
  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    collectEntityish(parseJsonFile(file), entities);
  }
  for (const entity of entities) {
    const name = normalize(entity.name);
    const domain = domainOf(entity.url || entity.officialUrl || entity.websiteUrl);
    if (name) names.add(name);
    if (domain) domains.add(domain);
    if (entity.ticker) tickers.add(String(entity.ticker).toUpperCase());
  }
  if (fs.existsSync(path.join(ROOT, "data/CLAIMED_TARGETS.txt"))) {
    for (const line of fs.readFileSync(path.join(ROOT, "data/CLAIMED_TARGETS.txt"), "utf8").split(/\r?\n/)) {
      const name = normalize(line.split("[CLAIMED")[0].trim().split(" — ")[0]);
      if (name) names.add(name);
    }
  }
  return { names, domains, tickers, entityCount: entities.length, scannedJsonFiles: files.length };
}

async function fetchStarterCandidates() {
  const sitemap = await fetchText(STARTER_SITEMAP, { timeoutMs: 30000 });
  const urls = locsFromXml(sitemap.body).filter((url) => /^https:\/\/www\.starterstory\.com\/stories\/[^/]+\/?$/i.test(url));
  const pages = await mapConcurrent(urls, 24, async (url) => {
    const result = await fetchText(url, { timeoutMs: 30000 });
    return extractStarterStory(url, result.body, result.status);
  });
  return { urls: urls.length, pages, candidates: pages.filter((page) => page && page.qualified) };
}

async function fetchFounderCandidates() {
  const sitemap = await fetchText(FOUNDER_SITEMAP, { timeoutMs: 30000 });
  const urls = locsFromXml(sitemap.body).filter((url) => /^https:\/\/founderreports\.com\/interview\/[^/]+\/?$/i.test(url));
  const pages = await mapConcurrent(urls, 8, async (url) => {
    const result = await fetchText(url, { timeoutMs: 30000 });
    return extractFounderReport(url, result.body, result.status);
  });
  return { urls: urls.length, pages, candidates: pages.filter((page) => page && page.qualified) };
}

async function fetchIndieHackersCandidates() {
  const source = fs.readFileSync(path.join(ROOT, "scripts/collector/collect-indiehackers-1000.mjs"), "utf8");
  const app = source.match(/const APP\s*=\s*['"]([^'"]+)['"]/)?.[1];
  const key = source.match(/const KEY\s*=\s*['"]([^'"]+)['"]/)?.[1];
  if (!app || !key) return { urls: 0, pages: [], candidates: [], unavailable: "Algolia configuration unavailable" };
  const endpoint = "https://" + app + "-dsn.algolia.net/1/indexes/products/query";
  const terms = ["a", "e", "i", "o", "u", "s", "t", "r", "n", "c", "m", "p", "l", "d", "g", "h", "b", "f", "w", "y"];
  const pool = new Map();
  for (const query of terms) {
    const params = new URLSearchParams({ hitsPerPage: "1000", page: "0", query, numericFilters: "revenue>=500,revenue<=100000" });
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "X-Algolia-Application-Id": app, "X-Algolia-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ params: params.toString() }),
    });
    if (!response.ok) throw new Error("Algolia " + response.status + " for " + query);
    for (const hit of (await response.json()).hits ?? []) pool.set(hit.productId ?? hit.objectID, hit);
  }
  const pages = [];
  for (const hit of pool.values()) {
    const name = tidy(hit.name, 220);
    const officialUrl = normalizeUrl(hit.websiteUrl || hit.url);
    const tags = Array.isArray(hit._tags) ? hit._tags.filter((tag) => typeof tag === "string") : [];
    const year = Number(String(hit.startDateStr ?? "").slice(0, 4));
    const revenueAmount = Number(hit.revenue) || 0;
    const title = tidy(hit.tagline || hit.description || name, 500);
    const description = tidy(hit.description || hit.tagline || name, 720);
    const teamTag = tags.some((tag) => ["founders-solo", "employees-0", "employees-under-10", "employees-10-plus"].includes(tag));
    const sourceUrl = "https://www.indiehackers.com/product/" + encodeURIComponent(hit.productId ?? hit.objectID ?? name);
    const sourceText = [name, title, description, officialUrl].join(" ");
    const qualified = name.length >= 3 && validUrl(officialUrl) && year >= 2024 && year <= 2026 && revenueAmount >= 500
      && teamTag && !IH_REJECT.test(sourceText);
    if (!qualified) continue;
    pages.push({
      provider: "Indie Hackers",
      sourceClass: "COMMUNITY",
      sourceType: "directory_record",
      sourceUrl,
      sourceBody: JSON.stringify(hit),
      httpStatus: 200,
      title,
      description,
      publishedAt: "",
      modifiedAt: "",
      businessName: name,
      founder: "UNKNOWN (公開レコードに実名記載なし)",
      officialUrl,
      location: "",
      started: hit.startDateStr || "",
      year,
      teamCount: 0,
      teamRaw: "",
      revenueOriginal: "US$" + Number(revenueAmount).toLocaleString("en-US") + "/month",
      revenueAmount,
      revenueCurrency: "USD",
      financialExcerpt: "US$" + Number(revenueAmount).toLocaleString("en-US") + "/month",
      reportedMetrics: [{ original: "US$" + Number(revenueAmount).toLocaleString("en-US") + "/month", currency: "USD", amount: revenueAmount, unit: "MONTHLY_REVENUE", source: "indie_hackers_directory", context: "directory revenue field" }],
      summary: description,
      tags,
      qualified: true,
    });
  }
  return { urls: pool.size, pages, candidates: pages };
}

function sortCandidates(candidates) {
  return [...candidates].sort((a, b) => {
    const revenue = (Number(b.revenueAmount) || 0) - (Number(a.revenueAmount) || 0);
    if (revenue) return revenue;
    return String(a.businessName).localeCompare(String(b.businessName));
  });
}

function chooseCandidatePools(known) {
  const starter = sortCandidates(known.starter.candidates.filter((c) => !known.names.has(normalize(c.businessName)) && !known.domains.has(domainOf(c.officialUrl))));
  const founder = sortCandidates(known.founder.candidates.filter((c) => !known.names.has(normalize(c.businessName)) && !known.domains.has(domainOf(c.officialUrl))));
  const indie = sortCandidates(known.indie.candidates.filter((c) => !known.names.has(normalize(c.businessName)) && !known.domains.has(domainOf(c.officialUrl))));
  return { starter, founder, indie };
}

function selectAndClaim(pools, known, dryRun) {
  const selected = [];
  const selectedNames = new Set();
  const selectedDomains = new Set();
  const selectedTickers = new Set(known.tickers);
  const rejected = { duplicate: 0, claim: 0 };
  const take = (pool, wanted) => {
    for (const candidate of pool) {
      if (selected.length >= 100 || selected.filter((item) => item.provider === candidate.provider).length >= wanted) break;
      const nameKey = normalize(candidate.businessName);
      const domainKey = domainOf(candidate.officialUrl);
      const ticker = (candidate.provider === "Starter Story" ? "SS" : candidate.provider === "Founder Reports" ? "FR" : "IH") + shortDigest(candidate.sourceUrl + "|" + candidate.businessName).slice(0, 8).toUpperCase();
      if (!nameKey || selectedNames.has(nameKey) || (domainKey && selectedDomains.has(domainKey)) || selectedTickers.has(ticker)) {
        rejected.duplicate += 1;
        continue;
      }
      const duplicate = checkDuplicate(candidate.businessName);
      if (duplicate.exists) {
        rejected.duplicate += 1;
        continue;
      }
      if (!dryRun) claimTarget(candidate.businessName, AGENT_ID, false);
      selected.push(candidate);
      selectedNames.add(nameKey);
      if (domainKey) selectedDomains.add(domainKey);
      selectedTickers.add(ticker);
    }
  };
  take(pools.starter, 43);
  take(pools.founder, 47);
  take(pools.indie, 100);
  if (selected.length < 100) {
    take(pools.starter.slice(43), 100);
    take(pools.founder.slice(47), 100);
    take(pools.indie.slice(100), 100);
  }
  if (selected.length < 100) throw new Error("Only selected " + selected.length + "/100 candidates after duplicate and claim checks.");
  return { selected, rejected };
}

async function auditOfficial(candidate) {
  if (!validUrl(candidate.officialUrl)) return { status: null, finalUrl: candidate.officialUrl, title: "", checkedAt: SNAPSHOT };
  try {
    const result = await fetchText(candidate.officialUrl, { attempts: 2, timeoutMs: 15000 });
    return {
      status: result.status,
      finalUrl: result.url,
      title: tidy(result.body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "", 180),
      checkedAt: SNAPSHOT,
    };
  } catch (error) {
    return { status: null, finalUrl: candidate.officialUrl, title: "", error: error instanceof Error ? error.message : String(error), checkedAt: SNAPSHOT };
  }
}

async function uploadRaw(candidate, r2) {
  const body = String(candidate.sourceBody ?? "");
  if (!body) throw new Error("Empty source body for " + candidate.businessName);
  const hash = digest(body);
  const key = "blobs/sha256/" + hash;
  const result = await r2.putR2ObjectCreateOnly({
    bucket: r2.getFoundationBucket("raw"),
    key,
    body,
    contentType: candidate.sourceType === "directory_record" ? "application/json; charset=utf-8" : "text/html; charset=utf-8",
    metadata: {
      provider: candidate.provider,
      source_url: candidate.sourceUrl,
      source_type: candidate.sourceType,
      "foundation-sha256": hash,
    },
  });
  return {
    bucket: result.bucket,
    payloadKey: result.key,
    bytes: result.bytes,
    sha256: result.sha256,
    status: result.status,
    readbackVerified: Boolean(result.readback?.bytes_match && result.readback?.sha256_match),
  };
}

function unknownTool() {
  return {
    name: "UNKNOWN (source text did not identify tools)",
    category: "UNCONFIRMED",
    monthlyCost: 0,
    isCostUnconfirmed: true,
    purpose: "The captured source does not identify the operational tools; no tool is inferred.",
    replacementDifficulty: "MEDIUM",
  };
}

function sourceMetric(candidate) {
  if (candidate.provider === "Starter Story") {
    return {
      original: candidate.revenueOriginal,
      currency: candidate.revenueCurrency,
      amount: candidate.revenueAmount,
      unit: "MONTHLY_REVENUE",
      source: "starter_story_story_page",
      context: "revenue/mo display",
    };
  }
  if (Array.isArray(candidate.reportedMetrics) && candidate.reportedMetrics.length) return candidate.reportedMetrics[0];
  return {
    original: candidate.revenueOriginal,
    currency: candidate.revenueCurrency,
    amount: candidate.revenueAmount,
    unit: "MONTHLY_REVENUE",
    source: candidate.provider.toLowerCase().replace(/\s+/g, "_"),
    context: "reported source signal",
  };
}

function revenueLabel(candidate) {
  const metric = sourceMetric(candidate);
  const prefix = metric.currency ? metric.currency + " " : "";
  const amount = Number.isFinite(metric.amount) && metric.amount > 0 ? prefix + Number(metric.amount).toLocaleString("en-US") : metric.original;
  if (candidate.provider === "Starter Story") return amount + "/month (revenue/mo display; independently unverified)";
  return tidy(candidate.revenueOriginal || amount, 260) + " (source-reported; independently unverified)";
}

function buildEntity(candidate, officialAudit, rawStorage) {
  const sourceHash = shortDigest(candidate.sourceUrl + "|" + candidate.businessName + "|" + candidate.revenueOriginal);
  const id = "ent_" + slug(candidate.businessName) + "_" + sourceHash;
  const prefix = candidate.provider === "Starter Story" ? "SS" : candidate.provider === "Founder Reports" ? "FR" : "IH";
  const ticker = prefix + sourceHash.slice(0, 8).toUpperCase();
  const sector = sectorFor(candidate);
  const scale = scaleFor(candidate);
  const report = revenueLabel(candidate);
  const description = tidy(candidate.description || candidate.summary || candidate.title, 680);
  const sourceExcerpt = tidy(candidate.financialExcerpt || candidate.title, 900);
  const pain = "公開説明が示す「" + tidy(description, 320) + "」に対する支払課題。具体的な顧客の意思決定理由は原文の範囲を超えて断定しない。";
  const mechanism = candidate.provider === "Founder Reports"
    ? "本人インタビューの収益質問と事業概要を同一ページで照合し、報告された提供形態と金額シグナルを分離保存する。"
    : candidate.provider === "Starter Story"
      ? "公開ストーリーの事業説明、創業者情報、revenue/mo表示を同じ原本から抽出し、売上表示を利益から分離する。"
      : "公開ディレクトリの説明と収益フィールドを取得し、公式URLの到達性と報告値を別々に監査する。";
  const officialReachable = officialAudit.status === 200;
  const sourceClass = candidate.sourceClass;
  const unknowns = [
    "公開された金額は報告値であり、財務諸表・決済口座・税務資料の独立監査は行っていない。",
    "原価、広告費、外注費、税、営業利益、純利益、手残りはP&Lへ推定投入していない。",
    "価格、継続率、解約率、顧客数、技術スタック、紹介報酬、契約条件は原本で確認できる範囲に限った。",
    "公式URLのHTTP到達性は事業の利益や継続性を証明しない。",
  ];
  const p = {
    monthlyRevenue: 0,
    cogs: 0,
    grossProfit: 0,
    grossMargin: 0,
    operatingExpenses: { serverAndApi: 0, advertising: 0, subcontracting: 0, toolsAndSaaS: 0, other: 0 },
    operatingProfit: 0,
    operatingMargin: 0,
    estimatedAnnualNetProfit: 0,
    financialStatus: "REPORTED",
    dataSnapshotPeriod: SNAPSHOT + " " + candidate.provider + " source capture",
    sourceDoc: candidate.sourceUrl,
    sourceClass,
    evidenceLocator: { type: "html", textHash: rawStorage.sha256 },
    estimationLogic: "金額は報告シグナルとしてreportedMetricsへ保存し、期間・原価・利益定義が揃わないためP&Lの数値は0かつ未確認フラグを維持した。",
    revenueLabel: report,
    confidenceScore: 0,
    isRevenueUnconfirmed: true,
    isOperatingProfitUnconfirmed: true,
    isMarginUnconfirmed: true,
    isGrossProfitUnconfirmed: true,
    isGrossMarginUnconfirmed: true,
    isCogsUnconfirmed: true,
    isCostsUnconfirmed: true,
    isNetProfitUnconfirmed: true,
  };
  const sourceMetrics = [...(candidate.reportedMetrics ?? []), sourceMetric(candidate)];
  if (candidate.teamRaw) sourceMetrics.push({ original: candidate.teamRaw, amount: candidate.teamCount, unit: "TEAM_SIZE", source: candidate.provider.toLowerCase().replace(/\s+/g, "_"), context: "reported overview team field" });
  const metrics = sourceMetrics.filter((metric, i, all) => metric && all.findIndex((other) => JSON.stringify(other) === JSON.stringify(metric)) === i).slice(0, 12);
  const evidenceBase = { sourceClass, sourceUrl: candidate.sourceUrl, evidenceLocator: { type: "html", textHash: rawStorage.sha256 } };
  const cards = [
    {
      id: id + "_finance",
      type: "SMOKING_GUN",
      title: "報告された売上・収益シグナル",
      badge: "SOURCE_REPORTED",
      evidenceStatus: "REPORTED",
      punchline: report + "。利益・手残りは独立確認していない。",
      details: [sourceExcerpt, "原本上の金額をreportedMetricsへ転記し、P&Lとは分離した。", ...unknowns.slice(0, 2)],
      metrics: [{ label: "原文金額", value: tidy(candidate.revenueOriginal, 260), isHighlight: true }, { label: "財務状態", value: "REPORTED / P&L未確定" }],
      ...evidenceBase,
    },
    {
      id: id + "_mechanism",
      type: "LOOT_BLUEPRINT",
      title: "提供形態と支払導線の観測",
      badge: "BUSINESS_MECHANISM",
      evidenceStatus: "REPORTED",
      punchline: mechanism,
      details: [tidy(candidate.title, 300), description, candidate.founder ? "創業者・回答者: " + candidate.founder : "創業者情報は原本で確認できない。"],
      metrics: [{ label: "情報源", value: candidate.provider }, { label: "観測日", value: SNAPSHOT }],
      ...evidenceBase,
    },
    {
      id: id + "_raw",
      type: "UNKNOWN_AUDIT",
      title: "原本保存と到達性の監査票",
      badge: "RAW_RECEIPT",
      evidenceStatus: rawStorage.readbackVerified ? "VERIFIED" : "UNKNOWN",
      punchline: "取得原本をSHA-256キーで保存し、読み戻し結果を監査票へ記録した。これは財務内容の真実性を保証しない。",
      details: ["raw hash: " + rawStorage.sha256, "R2: " + rawStorage.bucket + "/" + rawStorage.payloadKey, "bytes: " + rawStorage.bytes + "; readback: " + String(rawStorage.readbackVerified), "公式URL HTTP: " + String(officialAudit.status ?? "UNAVAILABLE")],
      metrics: [{ label: "原本SHA-256", value: rawStorage.sha256.slice(0, 16) + "…", isHighlight: true }, { label: "公式URL", value: officialReachable ? "HTTP 200" : "到達性未確定" }],
      sourceClass: "PRIMARY",
      sourceUrl: candidate.officialUrl || candidate.sourceUrl,
      evidenceLocator: { type: "html", textHash: rawStorage.sha256 },
    },
  ];
  const timeline = [];
  if (candidate.year) timeline.push({ eventType: "BUSINESS_STARTED_REPORTED", occurredAt: String(candidate.year), description: "原本の事業開始年欄に記載された値。" });
  if (candidate.publishedAt) timeline.push({ eventType: "SOURCE_PUBLISHED", occurredAt: candidate.publishedAt, description: candidate.provider + " source publication date." });
  timeline.push({ eventType: "SOURCE_CAPTURED", occurredAt: SNAPSHOT, description: "原本取得・SHA-256計算・R2読み戻しを実施。" });
  const sourceName = candidate.provider === "Founder Reports" ? "Founder Reports本人インタビュー" : candidate.provider === "Starter Story" ? "Starter Story公開ストーリー" : "Indie Hackers公開ディレクトリ";
  const tags = [
    sourceName,
    "SOURCE_REPORTED_REVENUE",
    "FINANCIAL_PROFIT_UNKNOWN",
    "RAW_CAPTURED_R2",
    candidate.teamCount ? "TEAM_SIZE_REPORTED" : "TEAM_SIZE_UNCONFIRMED",
    officialReachable ? "OFFICIAL_URL_REACHABLE" : "OFFICIAL_URL_AUDIT_PARTIAL",
  ];
  if (candidate.provider === "Starter Story") tags.push("REVENUE_PER_MONTH_DISPLAY");
  if (candidate.provider === "Founder Reports") tags.push("FOUNDER_INTERVIEW_REPORTED");
  if (candidate.provider === "Indie Hackers") tags.push("DIRECTORY_REPORTED_REVENUE");
  const entity = {
    id,
    ticker,
    name: tidy(candidate.businessName, 220),
    legalEntity: "UNKNOWN (公開ソースで法人名を独立確認していない)",
    tagline: "「" + tidy(description, 170) + "」に対し、" + report + "を公開報告。利益と手残りは未確認。",
    sector,
    scale,
    founder: tidy(candidate.founder || "UNKNOWN", 220),
    country: countryFor(candidate),
    url: candidate.officialUrl || candidate.sourceUrl,
    verifiedBadge: false,
    growthRateYoY: 0,
    isGrowthUnconfirmed: true,
    architecturePattern: "公開ソースでは実装方式を独立確認していない。",
    pipelineStack: "公開ソースでは技術スタックを独立確認していない。",
    targetPainWallet: pain,
    tags: Array.from(new Set(tags)),
    pnl: p,
    operations: {
      teamSize: candidate.teamCount || 0,
      initialTeamSize: 0,
      currentTeamSize: candidate.teamCount || 0,
      weeklyHours: 0,
      initialCapitalRequired: 0,
      automationLevel: 0,
      primaryChannels: [sourceName, "公式URL到達性監査"],
      toolStack: [unknownTool()],
      isTeamSizeUnconfirmed: true,
      isWeeklyHoursUnconfirmed: true,
      isCapitalUnconfirmed: true,
      isAutomationUnconfirmed: true,
    },
    strategy: {
      blindspot: "【観測された隙間】" + mechanism + "競合比較と大手の参入判断は原本に記載された範囲を超えて断定しない。",
      moatType: "UNKNOWN",
      moatDescription: "【防御要因】継続率、独自データ、供給制約、ブランド優位、規模効果のどれが利益を守るかは原本だけでは確定できない。",
      incumbentDilemma: "【大手との関係】大手のカニバリゼーションや規約上の参入制約は独立資料で照合していない。",
      secretInsight: "【金額の境界】" + report + "は支払実績を示す報告シグナルだが、原価を引いた創業者の手残りではない。",
      initialTraction: [candidate.publishedAt ? "公開日: " + candidate.publishedAt : "公開日は原本の記載範囲で保存。", candidate.founder ? "回答者・創業者欄: " + candidate.founder : "回答者・創業者欄は未確認。", "最初の顧客獲得経路は原本に記載された範囲を超えて断定しない。"],
      actionPlaybook: ["原本の提供説明を顧客課題・価格・契約条件へ分解し、報告値と実測値を別帳簿で照合する。", "原価、広告、外注、決済、税、創業者報酬を取得するまで手残り率を算出しない。", "公式URLの提供実体とsource pageの事業名を同一IDで保全し、差異があれば追加調査へ戻す。"],
      coldOutreachTemplate: "公開インタビューにある提供内容について、売上と原価を分けて確認できる資料があるか尋ねる。",
    },
    essence: {
      whatItDoes: description,
      targetCustomer: candidate.location ? "原本の所在地・事業説明に現れる顧客層（詳細は独立確認前）: " + candidate.location : "顧客属性の詳細は公開ソースの記載範囲を超えて断定しない。",
      painRelief: "公開説明が示す課題に対する提供内容: " + tidy(description, 520),
    },
    opportunityJudgment: {
      verdict: "ENTRY_CANDIDATE",
      verdictLabel: "報告値を保持して追加照合",
      oneLineReason: "公開ソースに具体的な金額シグナルと事業説明があるが、利益・継続性・再現性は独立照合前である。",
      demandDelta: "公開説明上の支払い需要シグナルあり（独立照合待ち）",
      competitionDelta: "競合比較は原本の記載範囲を超えて断定しない",
      entryRequirements: { capital: "原価・販売条件の実測が必要", technicalDifficulty: "UNKNOWN", platformRisk: "MEDIUM" },
    },
    evidenceCards: cards,
    temporal: {
      foundedYear: candidate.year || 0,
      initialTractionPeriod: candidate.started ? "原本記載の開始時期: " + candidate.started : "初動時期と獲得経路は原本で独立確認していない。",
      dataSnapshotPeriod: SNAPSHOT + "取得。公開日=" + (candidate.publishedAt || "不明") + "; 更新日=" + (candidate.modifiedAt || "不明"),
      viabilityStatus: "UNKNOWN",
      viabilityLabel: "現在の再現性は追加照合待ち",
      eraContext: "公開インタビュー・公開ストーリー・公開ディレクトリが事業説明と報告値を掲載する環境。",
      currentViabilityAnalysis: "報告値は観測できるが、現在の稼働、利益定義、顧客継続、規制境界、原価配管は独立資料で確認する必要がある。",
    },
    observations: [
      sourceName + "の原本を" + SNAPSHOT + "に取得した。",
      "事業名: " + candidate.businessName + "。公開金額: " + tidy(candidate.revenueOriginal, 320),
      "事業説明: " + description,
      "原本SHA-256: " + rawStorage.sha256,
      ...unknowns,
    ],
    observationsStream: [
      { id: id + "_reported", category: "MARKET_DISTORTION", categoryLabel: "報告値", originType: "reported", verificationStatus: "SUPPORTED", text: sourceName + "に「" + tidy(candidate.revenueOriginal, 320) + "」の金額シグナルが記載されている。", sourceUrl: candidate.sourceUrl, observedAt: SNAPSHOT, sourceClass, evidenceLocator: { type: "html", textHash: rawStorage.sha256 } },
      { id: id + "_mechanism", category: "SAVANNAH_PAIN", categoryLabel: "支払課題", originType: "reported", verificationStatus: "UNVERIFIED", text: "公開説明が示す支払課題: " + tidy(description, 500), sourceUrl: candidate.sourceUrl, observedAt: SNAPSHOT, sourceClass, evidenceLocator: { type: "html", textHash: rawStorage.sha256 } },
      { id: id + "_limit", category: "RESEARCH_LIMIT", categoryLabel: "未照合範囲", originType: "observed", verificationStatus: "UNVERIFIED", text: "利益・原価・継続性・手残りは独立資料で照合していない。", sourceUrl: candidate.sourceUrl, observedAt: SNAPSHOT, sourceClass, evidenceLocator: { type: "html", textHash: rawStorage.sha256 } },
    ],
    lootBlueprint: {
      targetPrey: pain,
      structuralFlaw: "公開説明が示す課題に対して対価が発生している事実を記録する。ただし、競合の弱点や支払者の心理は原本だけでは確定しない。",
      stealthEntry: mechanism,
      tollGateSetup: "金額表示・提供条件・原価・継続条件を分離記録し、報告売上を利益や自由資金へ読み替えない。",
      reproducibilityScore: 0,
      moatDurabilityScore: 0,
      capitalEfficiencyScore: 0,
      executionChecklist: [
        "公開ソースの金額、期間、売上・利益区分を原文どおり保存する。",
        "顧客獲得、供給、人件費、広告、決済、返品またはサポートの配管を独立資料で照合する。",
        "公式URLの提供実体を確認し、確認できない項目は推測せず未確認として残す。",
      ],
    },
    timelineEvents: timeline,
    coverageAudit: [
      { dimension: "reported_revenue", status: "found", note: tidy(candidate.revenueOriginal, 320), attempts: [candidate.sourceUrl] },
      { dimension: "profit_and_costs", status: "attempted_unavailable", note: "P&Lへ確定投入できる原価・経費・利益の一次根拠なし。", attempts: [candidate.sourceUrl] },
      { dimension: "official_presence", status: officialReachable ? "found" : "attempted_unavailable", note: "HTTP " + String(officialAudit.status ?? "UNAVAILABLE") + "; " + tidy(officialAudit.title || "", 180), attempts: [candidate.officialUrl || candidate.sourceUrl] },
      { dimension: "founder_and_legal_entity", status: candidate.founder ? "found" : "attempted_unavailable", note: candidate.founder || "創業者・法人名は未確認。", attempts: [candidate.sourceUrl] },
      { dimension: "pricing_and_retention", status: "attempted_unavailable", note: "料金・継続率・解約条件は独立確認していない。", attempts: [candidate.sourceUrl, candidate.officialUrl] },
      { dimension: "technology_and_tools", status: "attempted_unavailable", note: "技術スタックと実在ツールは原本の記載範囲を超えて推測していない。", attempts: [candidate.sourceUrl, candidate.officialUrl] },
    ],
    unknownsNotes: unknowns,
    reportedMetrics: metrics,
    sourceMetadata: {
      provider: candidate.provider,
      sourceType: candidate.sourceType,
      sourceUrl: candidate.sourceUrl,
      officialUrl: candidate.officialUrl,
      publishedAt: candidate.publishedAt || null,
      modifiedAt: candidate.modifiedAt || null,
      observedAt: SNAPSHOT,
      rawContentSha256: rawStorage.sha256,
      rawStorage,
      officialAudit,
      disclosure: "公開ソースの金額は研究・推定・自己申告またはディレクトリ表示を含み、独立検証済み財務諸表ではない。",
    },
    claimBindings: [],
    publishability: "PARTIAL",
    screening: {
      qualificationStatus: "SOURCE_REPORTED_MONEY_CASE_REQUIRES_PRIMARY_FINANCIAL_RECONCILIATION",
      sourceProvider: candidate.provider,
      reportedMoneySignal: candidate.revenueOriginal,
      independentFinancialVerification: false,
      backgroundAndScaleCaveat: "公開ソースの事業説明と金額シグナルを保存した候補。利益・自立性は未確定。",
    },
    batchId: BATCH_ID,
  };
  return entity;
}

async function validateEntities(entities) {
  const schema = await import("../../src/shared/financial-entity-schema.ts");
  const enrich = await import("../pipeline/auto-enrich-entity.ts");
  for (const entity of entities) {
    schema.parseFinancialEntity(entity);
    const enriched = enrich.autoEnrichEntityBeforeIngest(entity);
    if (!enriched.operations?.toolStack?.length || !Array.isArray(enriched.evidenceCards) || enriched.evidenceCards.length < 3) {
      throw new Error("Density validation failed for " + entity.name);
    }
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && fs.existsSync(OUTPUT_FILE)) throw new Error("Output already exists: " + OUTPUT_FILE);
  const known = loadKnownTargets();
  const [starter, founder, indie] = await Promise.all([
    fetchStarterCandidates(),
    fetchFounderCandidates(),
    fetchIndieHackersCandidates(),
  ]);
  const pools = chooseCandidatePools({ starter, founder, indie, names: known.names, domains: known.domains });
  const available = { starter: pools.starter.length, founder: pools.founder.length, indie: pools.indie.length };
  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, known, sourcePages: { starter: starter.urls, founder: founder.urls, indie: indie.urls }, candidates: { starter: starter.candidates.length, founder: founder.candidates.length, indie: indie.candidates.length }, available, samples: { starter: pools.starter.slice(0, 8).map((c) => ({ name: c.businessName, revenue: c.revenueOriginal, url: c.officialUrl })), founder: pools.founder.slice(0, 12).map((c) => ({ name: c.businessName, revenue: c.revenueOriginal, url: c.officialUrl })), indie: pools.indie.slice(0, 8).map((c) => ({ name: c.businessName, revenue: c.revenueOriginal, url: c.officialUrl })) } }, null, 2));
    return;
  }
  const claimResult = selectAndClaim(pools, known, false);
  const selected = claimResult.selected;
  const officialAudits = await mapConcurrent(selected, 8, (candidate) => auditOfficial(candidate));
  const r2 = await import("../../src/lib/storage/r2.ts");
  const rawStorages = await mapConcurrent(selected, 4, (candidate) => uploadRaw(candidate, r2));
  const failedStorage = rawStorages.find((receipt) => receipt?.error || !receipt?.readbackVerified);
  if (failedStorage) throw new Error("Raw R2 capture failed: " + JSON.stringify(failedStorage));
  const entities = selected.map((candidate, index) => buildEntity(candidate, officialAudits[index], rawStorages[index]));
  if (new Set(entities.map((e) => e.id)).size !== 100 || new Set(entities.map((e) => e.name)).size !== 100 || new Set(entities.map((e) => e.ticker)).size !== 100) {
    throw new Error("Generated batch has duplicate id, name, or ticker.");
  }
  await validateEntities(entities);
  const audit = {
    batchId: BATCH_ID,
    agentId: AGENT_ID,
    capturedAt: new Date().toISOString(),
    count: entities.length,
    sourceCounts: selected.reduce((acc, item) => { acc[item.provider] = (acc[item.provider] || 0) + 1; return acc; }, {}),
    selection: { available, rejected: claimResult.rejected },
    candidates: selected.map((candidate, index) => ({
      name: candidate.businessName,
      provider: candidate.provider,
      sourceUrl: candidate.sourceUrl,
      officialUrl: candidate.officialUrl,
      sourceStatus: candidate.httpStatus,
      officialAudit: officialAudits[index],
      rawStorage: rawStorages[index],
      claimed: true,
      claimedBy: AGENT_ID,
      revenueSignal: candidate.revenueOriginal,
    })),
    guarantees: {
      centralIndexEdited: false,
      edinetAreaTouched: false,
      pAndLReportedValuesPromoted: false,
      rawCreateOnlyReadback: rawStorages.every((receipt) => receipt.readbackVerified),
      unknownFinancialFlags: entities.every((entity) => entity.pnl.isRevenueUnconfirmed && entity.pnl.isOperatingProfitUnconfirmed && entity.pnl.isMarginUnconfirmed && entity.pnl.isGrossProfitUnconfirmed && entity.pnl.isGrossMarginUnconfirmed && entity.pnl.isCogsUnconfirmed && entity.pnl.isCostsUnconfirmed && entity.pnl.isNetProfitUnconfirmed),
      toolStackPresent: entities.every((entity) => entity.operations.toolStack.length > 0),
      evidenceCardsAtLeastThree: entities.every((entity) => entity.evidenceCards.length >= 3),
    },
  };
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(entities, null, 2) + "\n", "utf8");
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(audit, null, 2) + "\n", "utf8");
  console.log(JSON.stringify({ batchId: BATCH_ID, count: entities.length, sourceCounts: audit.sourceCounts, output: OUTPUT_FILE, audit: AUDIT_FILE, rawReadbackVerified: audit.guarantees.rawCreateOnlyReadback }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
