#!/usr/bin/env node

import fs from 'node:fs/promises';

const INPUT = process.env.MM_INPUT_FILE ?? 'data/incoming/batch_ebizfacts_profiles_case_playbooks_1000_20260916.json';
const OUTPUT = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_ebizfacts_profiles_final100_20260916.json';

const boundSources = new Set(['profile-card', 'title']);
const kindWeight = {
  MONTHLY_PROFIT: 120,
  ANNUAL_PROFIT: 110,
  MONTHLY_REVENUE: 100,
  ANNUAL_REVENUE: 95,
  TOTAL_OR_BEST_PERIOD: 65,
  REPORTED_MONEY_SIGNAL: 25,
};

function primaryBoundMetric(entity) {
  return (entity.reportedMetrics ?? [])
    .filter((metric) => boundSources.has(metric.source))
    .sort((a, b) => (kindWeight[b.unit] ?? 0) - (kindWeight[a.unit] ?? 0) || Number(b.amount ?? 0) - Number(a.amount ?? 0))[0] ?? null;
}

function score(entity) {
  const metric = primaryBoundMetric(entity);
  if (!metric) return -Infinity;
  const text = `${entity.name} ${entity.targetPainWallet ?? ''} ${entity.essence?.whatItDoes ?? ''}`;
  const caution = /\b(?:idea|potential|could|probably|estimated|likely|maybe|consider|suggest|example)\b/i.test(text) ? -20 : 0;
  const official = (entity.evidenceCards ?? []).some((card) => card.id.endsWith('-official-site')) ? 18 : 0;
  const scale = entity.scale === 'SOLO' ? 8 : 5;
  const modifiedYear = Number(String(entity.sourceMetadata?.modifiedAt ?? '').slice(0, 4));
  const recency = modifiedYear === 2026 ? 8 : modifiedYear === 2025 ? 6 : modifiedYear === 2024 ? 4 : 0;
  const evidence = Math.min(10, (entity.evidenceCards ?? []).length) + Math.min(8, (entity.observationsStream ?? []).length * 2);
  return (kindWeight[metric.unit] ?? 0) + official + scale + recency + evidence + Math.log10(Math.max(1, Number(metric.jpyAmount ?? 0))) + caution;
}

const entities = JSON.parse(await fs.readFile(INPUT, 'utf8'));
if (!Array.isArray(entities) || entities.length !== 1000) throw new Error(`Expected 1000 entities, got ${entities?.length}`);
const candidates = entities
  .filter((entity) => ['SOLO', 'SMALL_TEAM'].includes(entity.scale) && primaryBoundMetric(entity))
  .map((entity) => ({ entity, score: score(entity) }))
  .sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name));
if (candidates.length < 100) throw new Error(`Only ${candidates.length} qualified final candidates`);
const selected = candidates.slice(0, 100).map(({ entity }) => entity);
await fs.writeFile(OUTPUT, `${JSON.stringify(selected, null, 2)}\n`, 'utf8');
const kinds = {};
const scales = {};
for (const entity of selected) {
  const metric = primaryBoundMetric(entity);
  kinds[metric.unit] = (kinds[metric.unit] ?? 0) + 1;
  scales[entity.scale] = (scales[entity.scale] ?? 0) + 1;
}
console.log(JSON.stringify({ input: INPUT, output: OUTPUT, candidates: candidates.length, selected: selected.length, kinds, scales }, null, 2));
