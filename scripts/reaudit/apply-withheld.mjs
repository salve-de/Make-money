#!/usr/bin/env node
/**
 * 公開停止台帳の適用（apply-withheld v1）— 2026-09-29
 * data/reaudit/withheld-records.json に載った記録の publishability を台帳の値（表示しない値）に固定し、
 * reaudit.withheld に理由・根拠・判断者を写し、タグ「掲載停止」「不審」を付ける。記録は削除しない。
 * 再取り込みで表示に戻らないよう、ingest の後に毎回実行する（冪等）。
 * 使い方: node scripts/reaudit/apply-withheld.mjs [--dry-run]
 */
import { readFileSync, renameSync, writeFileSync } from 'node:fs';

const INDEX = 'data/entities-index.json';
const dryRun = process.argv.includes('--dry-run');
const ledger = JSON.parse(readFileSync('data/reaudit/withheld-records.json', 'utf8'));
const entities = JSON.parse(readFileSync(INDEX, 'utf8'));
const byId = new Map(entities.map((e) => [e.id, e]));
let changed = 0;
const missing = [];
for (const item of ledger) {
  const entity = byId.get(item.id);
  if (!entity) { missing.push(item.id); continue; }
  const before = JSON.stringify(entity);
  entity.publishability = item.publishability;
  entity.reaudit = { ...(entity.reaudit ?? {}), withheld: { reasonCode: item.reasonCode, reason: item.reason, evidence: item.evidence, decidedBy: item.decidedBy, decidedAt: item.decidedAt } };
  const tags = new Set(entity.tags ?? []);
  tags.add('掲載停止');
  if (item.reasonCode.startsWith('SUSPECTED')) tags.add('不審');
  entity.tags = [...tags];
  if (JSON.stringify(entity) !== before) changed += 1;
}
console.log(JSON.stringify({ ledger: ledger.length, changed, missing, dryRun }));
if (!dryRun && changed > 0) {
  const tmp = `${INDEX}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(entities, null, 2));
  renameSync(tmp, INDEX);
}
if (missing.length) process.exit(1);
