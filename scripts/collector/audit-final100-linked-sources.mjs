import fs from 'node:fs';
import crypto from 'node:crypto';

const batchPath = process.env.MM_BATCH_FILE ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json';
const capturePath = process.env.MM_CAPTURE_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/final100_linked_source_audit_20260916.json';
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const captures = new Map(JSON.parse(fs.readFileSync(capturePath, 'utf8')).results.map((item) => [item.entityId, item]));

const excludedHost = /(?:ebizfacts\.com|amazon\.(?:com|co\.uk)|facebook\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|youtube\.com|youtu\.be|pinterest\.com|linkedin\.com|google\.com|shopify\.com|gumroad\.com|stripe\.com|apple\.com|apps\.apple\.com)/i;
const usefulHost = /(?:cnbc\.com|entrepreneur\.com|reddit\.com|indiehackers\.com|ycombinator\.com|founderreports\.com|starterstory\.com|microns\.io|acquire\.com|producthunt\.com|substack\.com|flippa\.com|sidehustlenation\.com|forbes\.com|businessinsider\.com|medium\.com|web\.archive\.org|hackernews\.com|news\.ycombinator\.com|thehustle\.co|inc\.com|fastcompany\.com|businessinsider\.com)/i;
const primaryLikeHost = /(?:cnbc\.com|entrepreneur\.com|founderreports\.com|starterstory\.com|indiehackers\.com|news\.ycombinator\.com|sidehustlenation\.com|flippa\.com|microns\.io|acquire\.com|producthunt\.com)/i;
const decode = (value) => String(value ?? '').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#x27;|&#39;|&apos;/gi, "'").replace(/&quot;/gi, '"').replace(/&#8217;|&#x2019;/gi, "'").replace(/&#8211;|&#x2013;/gi, '-').replace(/&#8220;|&#x201c;/gi, '"').replace(/&#8221;|&#x201d;/gi, '"');
const sourceText = (body) => {
  const html = String(body ?? '');
  const main = html.match(/<(?:article|main)\b[\s\S]*?<\/(?:article|main)>/i)?.[0] ?? html;
  return decode(main.split(/read\s+this\s+next|related\s*:|<footer\b/i, 1)[0]).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<br\s*\/?>|<\/(?:p|div|li|h[1-6]|blockquote|tr)>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};
const yearPattern = /\b20(?:24|25|26)\b/g;
const moneyPattern = /(?:[$€£¥]\s?\d|\b\d[\d,.]*(?:\.\d+)?\s?(?:k|m|million|thousand|per month|monthly|per year|annual)\b)/i;
const profitPattern = /\b(?:profit|profits|net income|net profit|gross profit|operating profit|take.?home|earnings|margin)\b/i;
const revenuePattern = /\b(?:revenue|sales|turnover|earned|earning|income|mrr|arr)\b/i;

function metricVariants(metric) {
  const original = String(metric.original ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const amount = Number(metric.amount);
  const symbol = metric.currency === 'USD' ? '\\$' : metric.currency === 'GBP' ? '£' : metric.currency === 'EUR' ? '€' : metric.currency === 'JPY' ? '[¥￥]' : '';
  const values = new Set([original]);
  if (Number.isFinite(amount) && symbol) {
    values.add(`${symbol}${Number.isInteger(amount) ? amount.toLocaleString('en-US') : amount}`);
    if (amount >= 1000 && amount < 1_000_000) values.add(`${symbol}${(amount / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })}k`);
    if (amount >= 1_000_000) values.add(`${symbol}${(amount / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })}m`);
  }
  return [...values].map((value) => value.replace(/\\\$/g, '$')).filter((value) => value.length > 1);
}

const candidates = [];
for (const entity of batch) {
  const capture = captures.get(entity.id);
  if (!capture?.localPath || !fs.existsSync(capture.localPath)) continue;
  const html = fs.readFileSync(capture.localPath, 'utf8');
  const urls = [...html.matchAll(/href=["'](https?:\/\/[^"']+)["']/gi)].map((match) => decode(match[1]));
  for (const url of [...new Set(urls)]) {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
      if (excludedHost.test(host) || !usefulHost.test(host) || /\/go\/|utm_|mailto:|javascript:/i.test(url)) continue;
      candidates.push({ entityId: entity.id, name: entity.name, url, host, primaryLike: primaryLikeHost.test(host) });
    } catch {}
  }
}

const results = [];
let cursor = 0;
async function inspect(candidate) {
  const record = { ...candidate, status: 'FAILED', httpStatus: null, finalUrl: null, contentType: null, bytes: 0, contentSha256: null, directWindowSupport: false, profitWindowSupport: false, entityMetricMatch: false, matchedProfitMetrics: [], sourceStrength: candidate.primaryLike ? 'PRIMARY_LIKE_DOMAIN' : 'SECONDARY_DOMAIN', rightsStatus: 'metadata_only', context: null, error: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(candidate.url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'Make-Money-final100-linked-source-audit/2026-09-16', accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.1' } });
    record.httpStatus = response.status;
    record.finalUrl = response.url;
    record.contentType = response.headers.get('content-type');
    const body = Buffer.from(await response.arrayBuffer());
    record.bytes = body.length;
    record.contentSha256 = crypto.createHash('sha256').update(body).digest('hex');
    if (!response.ok) { record.error = `HTTP ${response.status}`; return record; }
    const text = sourceText(body.toString('utf8')).toLowerCase();
    const entity = batch.find((item) => item.id === candidate.entityId);
    const profitMetrics = (entity?.reportedMetrics ?? []).filter((metric) => /PROFIT/.test(String(metric.unit)));
    record.matchedProfitMetrics = profitMetrics.filter((metric) => metricVariants(metric).some((variant) => text.includes(variant.toLowerCase()))).map((metric) => ({ original: metric.original, amount: metric.amount, currency: metric.currency, unit: metric.unit }));
    record.entityMetricMatch = record.matchedProfitMetrics.length > 0;
    for (const match of text.matchAll(yearPattern)) {
      const position = match.index ?? 0;
      const context = text.slice(Math.max(0, position - 240), Math.min(text.length, position + match[0].length + 240));
      if (moneyPattern.test(context) && (profitPattern.test(context) || revenuePattern.test(context))) {
        record.directWindowSupport = true;
        record.profitWindowSupport = profitPattern.test(context);
        record.context = context;
        break;
      }
    }
    record.status = 'FETCHED_METADATA_ONLY';
  } catch (error) { record.error = error instanceof Error ? error.message : 'fetch failed'; }
  finally { clearTimeout(timer); }
  return record;
}
async function worker() { while (true) { const index = cursor++; if (index >= candidates.length) return; results[index] = await inspect(candidates[index]); } }
await Promise.all(Array.from({ length: 8 }, worker));
const report = {
  schemaVersion: 'final100-linked-source-audit.v1',
  input: batchPath,
  captureAudit: capturePath,
  requested: 'final100 outbound useful-source links; metadata-only fetch; no raw promotion',
  rightsNote: '外部ページはメタデータ監査のみ。権利確認なしにraw証拠・財務値へ昇格していない。',
  entityCount: batch.length,
  candidateCount: candidates.length,
  uniqueEntityCount: new Set(candidates.map((item) => item.entityId)).size,
  fetched: results.filter((item) => item.status === 'FETCHED_METADATA_ONLY').length,
  directWindowSupport: results.filter((item) => item.directWindowSupport).length,
  profitWindowSupport: results.filter((item) => item.profitWindowSupport).length,
  entityMetricMatch: results.filter((item) => item.entityMetricMatch).length,
  primaryLikeFetched: results.filter((item) => item.status === 'FETCHED_METADATA_ONLY' && item.primaryLike).length,
  results,
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, entityCount: report.entityCount, candidateCount: report.candidateCount, uniqueEntityCount: report.uniqueEntityCount, fetched: report.fetched, directWindowSupport: report.directWindowSupport, profitWindowSupport: report.profitWindowSupport, entityMetricMatch: report.entityMetricMatch, primaryLikeFetched: report.primaryLikeFetched }, null, 2));
