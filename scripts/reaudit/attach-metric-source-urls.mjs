#!/usr/bin/env node
/**
 * reportedMetrics の出典URL補完（attach-metric-source-urls v1）— 2026-09-29
 * eBiz Facts 家系の数値（source: ebizfacts-article / article / profile-card / title）は、記録単位の
 * reaudit.sources に元記事URLがあるのに数値ごとには url が無かった。記事URLがちょうど1本の記録だけ、
 * その url / publisher / checkedAt と、context に書かれた掲載日（記事掲載YYYY-MM-DD）を数値へ写す。
 * 既に url / sourceUrl を持つ数値と、記事URLが0本または複数本の記録は触らない（冪等）。
 *
 * 使い方: node scripts/reaudit/attach-metric-source-urls.mjs [--dry-run]
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

const INDEX = 'data/entities-index.json';
const dryRun = process.argv.includes('--dry-run');
const EBIZ_METRIC_SOURCES = new Set(['ebizfacts-article', 'article', 'profile-card', 'title']);
const EBIZ_HOST = /^https?:\/\/(www\.)?ebizfacts\.com\//i;

const entities = JSON.parse(readFileSync(INDEX, 'utf8'));
let attached = 0;
let skippedRecords = 0;
for (const entity of entities) {
  const pending = (entity.reportedMetrics ?? []).filter((m) => m && !m.url && !m.sourceUrl && EBIZ_METRIC_SOURCES.has(m.source));
  if (pending.length === 0) continue;
  const articles = (entity.reaudit?.sources ?? []).filter((s) => EBIZ_HOST.test(String(s.url)));
  if (articles.length !== 1) { skippedRecords += 1; continue; }
  const [article] = articles;
  for (const metric of pending) {
    metric.url = article.url;
    metric.publisher = article.publisher ?? 'eBiz Facts';
    if (article.checkedAt) metric.checkedAt = article.checkedAt;
    const stated = /記事掲載(\d{4}-\d{2}-\d{2})/.exec(String(metric.context ?? ''));
    if (stated && !metric.statedAt) metric.statedAt = stated[1];
    attached += 1;
  }
}

console.log(JSON.stringify({ attached, skippedRecords, dryRun }));
if (!dryRun && attached > 0) {
  const tmp = `${INDEX}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(entities, null, 2));
  renameSync(tmp, INDEX);
}
