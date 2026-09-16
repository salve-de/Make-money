import fs from 'node:fs';
import crypto from 'node:crypto';

const batchPath = process.env.MM_BATCH_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const temporalPath = process.env.MM_TEMPORAL_AUDIT_FILE ?? 'data/incoming/temporal_success_window_audit_new1000_20260916.json';
const capturePath = process.env.MM_CAPTURE_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/primary_linked_window_source_audit_20260916.json';
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const temporal = JSON.parse(fs.readFileSync(temporalPath, 'utf8'));
const captures = new Map(JSON.parse(fs.readFileSync(capturePath, 'utf8')).results.map((item) => [item.entityId, item]));
const entities = new Map(batch.map((entity) => [entity.id, entity]));
const targetIds = new Set(temporal.rows.filter((row) => row.profitWindowMention).map((row) => row.id));
const excludedHosts = /(?:ebizfacts\.com|facebook\.com|instagram\.com|tiktok\.com|twitter\.com|x\.com|youtube\.com|pinterest\.com|linkedin\.com|google\.com)/i;
const usefulHosts = /(?:cnbc\.com|entrepreneur\.com|reddit\.com|ycombinator\.com|founderreports\.com|brutallyhonestmicrostock\.com|superframeworks\.com|nocodeexits\.substack\.com|gaps\.com|pokerdb\.thehendonmob\.com|esportsearnings\.com|starterstory\.com|microns\.io|acquire\.com|producthunt\.com)/i;
const sourceText = (body) => body.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#x27;|&#39;/gi, "'").replace(/&quot;/gi, '"').replace(/&#8217;|&#x2019;/gi, "'").replace(/&#8211;|&#x2013;/gi, '-').replace(/\s+/g, ' ').trim();
const yearPattern = /\b20(?:24|25|26)\b/g;
const moneyPattern = /(?:[$€£¥]\s?\d|\b\d[\d,.]*(?:\.\d+)?\s?(?:k|m|million|thousand|per month|monthly|per year|annual)\b)/i;
const profitPattern = /\b(?:profit|profits|net income|net profit|gross profit|operating profit|take.?home|earnings|margin)\b/i;
const revenuePattern = /\b(?:revenue|sales|earned|earning|income|mrr|arr)\b/i;
const candidates = [];
for (const id of targetIds) {
  const entity = entities.get(id);
  const capture = captures.get(id);
  if (!entity || !capture?.localPath || !fs.existsSync(capture.localPath)) continue;
  const html = fs.readFileSync(capture.localPath, 'utf8');
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((match) => match[1]).filter((href) => /^https?:/i.test(href));
  const unique = [...new Set(links)].filter((href) => {
    try { const host = new URL(href).hostname; return !excludedHosts.test(host) && usefulHosts.test(host); } catch { return false; }
  }).slice(0, 6);
  for (const url of unique) candidates.push({ entityId: id, name: entity.name, url });
}

const results = [];
let cursor = 0;
async function inspect(candidate) {
  const record = { ...candidate, status: 'FAILED', httpStatus: null, finalUrl: null, contentType: null, bytes: 0, contentSha256: null, sourceStrength: 'candidate_only', rightsStatus: 'metadata_only', directWindowSupport: false, profitWindowSupport: false, context: null, error: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(candidate.url, { redirect: 'follow', signal: controller.signal, headers: { 'user-agent': 'Make-Money-primary-source-audit/2026-09-16', accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.1' } });
    record.httpStatus = response.status;
    record.finalUrl = response.url;
    record.contentType = response.headers.get('content-type');
    const body = Buffer.from(await response.arrayBuffer());
    record.bytes = body.length;
    record.contentSha256 = crypto.createHash('sha256').update(body).digest('hex');
    if (!response.ok) { record.error = `HTTP ${response.status}`; return record; }
    const text = sourceText(body.toString('utf8'));
    for (const match of text.matchAll(yearPattern)) {
      const position = match.index ?? 0;
      const context = text.slice(Math.max(0, position - 220), Math.min(text.length, position + match[0].length + 220));
      if (moneyPattern.test(context) && (profitPattern.test(context) || revenuePattern.test(context))) {
        record.directWindowSupport = true;
        record.profitWindowSupport = profitPattern.test(context);
        record.sourceStrength = 'linked_external_source_observed';
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
await Promise.all(Array.from({ length: 4 }, worker));
const report = {
  schemaVersion: 'primary-linked-window-source-audit.v1',
  input: batchPath,
  temporalAudit: temporalPath,
  requested: '2024-2026 period-profit candidates only',
  rightsNote: '本文はメタデータ監査のみ。権利確認なしに一次候補本文をraw証拠へ昇格していない。',
  candidateCount: candidates.length,
  fetched: results.filter((item) => item.status === 'FETCHED_METADATA_ONLY').length,
  directWindowSupport: results.filter((item) => item.directWindowSupport).length,
  profitWindowSupport: results.filter((item) => item.profitWindowSupport).length,
  results,
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, targetEntities: targetIds.size, candidateCount: report.candidateCount, fetched: report.fetched, directWindowSupport: report.directWindowSupport, profitWindowSupport: report.profitWindowSupport }, null, 2));
