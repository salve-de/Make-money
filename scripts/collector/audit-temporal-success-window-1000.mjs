import fs from 'node:fs';
import { findExplicitProfitEvidence, strip } from './profit-evidence-rules.mjs';

const batchPath = process.env.MM_BATCH_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const capturePath = process.env.MM_CAPTURE_AUDIT_FILE ?? 'data/incoming/raw_snapshots_new1000_20260916.audit.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/temporal_success_window_audit_new1000_20260916.json';
const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
const captureAudit = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
const captures = new Map((captureAudit.results ?? []).map((item) => [item.entityId, item]));

const yearPattern = /\b20(?:24|25|26)\b/g;
const yearCheckPattern = /\b20(?:24|25|26)\b/;
const moneyPattern = /(?:[$€£¥]\s?\d|\b\d[\d,.]*(?:\.\d+)?\s?(?:k|m|million|thousand|per month|monthly|per year|annual)\b)/i;
const revenuePattern = /\b(?:revenue|sales|earned|earning|income|mrr|arr)\b/i;
const profitPattern = /\b(?:profit|profits|net income|net profit|gross profit|operating profit|take.?home|earnings|margin)\b/i;

function contextsFor(text) {
  const contexts = [];
  for (const match of text.matchAll(yearPattern)) {
    const position = match.index ?? 0;
    const context = text.slice(Math.max(0, position - 180), Math.min(text.length, position + match[0].length + 180));
    if (moneyPattern.test(context) && (revenuePattern.test(context) || profitPattern.test(context))) contexts.push({ year: match[0], context });
  }
  return contexts;
}

const rows = [];
for (const entity of batch) {
  const capture = captures.get(entity.id);
  let text = '';
  if (capture?.localPath && fs.existsSync(capture.localPath)) text = strip(fs.readFileSync(capture.localPath, 'utf8')).toLowerCase();
  const contexts = contextsFor(text);
  const explicitProfitContexts = (entity.reportedMetrics ?? [])
    .map((metric) => findExplicitProfitEvidence(text, metric))
    .filter(Boolean);
  const performanceYears = [...new Set(contexts.map((item) => item.year))];
  rows.push({
    id: entity.id,
    name: entity.name,
    rawCaptured: Boolean(text),
    sourceSnapshotTimestamp: entity.sourceMetadata?.modifiedAt || entity.sourceMetadata?.publishedAt || null,
    performanceWindowMention: contexts.length > 0,
    profitWindowMention: explicitProfitContexts.some((item) => yearCheckPattern.test(item.context)),
    revenueWindowMention: contexts.some((item) => revenuePattern.test(item.context)),
    performanceYears,
    contexts: contexts.slice(0, 3),
  });
}

const report = {
  schemaVersion: 'temporal-success-window-audit.v1',
  input: batchPath,
  captureAudit: capturePath,
  requestedWindow: ['2024', '2025', '2026'],
  interpretation: 'ページ取得日・更新日は事業実績の期間とはみなさず、記事本体内で年・金額・売上/利益語が近接する場合だけを本文期間シグナルとして数える。これは独立監査ではない。',
  count: rows.length,
  rawCaptured: rows.filter((row) => row.rawCaptured).length,
  performanceWindowMention: rows.filter((row) => row.performanceWindowMention).length,
  profitWindowMention: rows.filter((row) => row.profitWindowMention).length,
  revenueWindowMention: rows.filter((row) => row.revenueWindowMention).length,
  rows,
};
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: report.count, rawCaptured: report.rawCaptured, performanceWindowMention: report.performanceWindowMention, profitWindowMention: report.profitWindowMention, revenueWindowMention: report.revenueWindowMention }, null, 2));
