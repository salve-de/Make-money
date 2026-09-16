import fs from 'node:fs';
import crypto from 'node:crypto';

const sourcePath = process.env.MM_SOURCE_FILE ?? 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const auditPath = process.env.MM_AUDIT_FILE ?? 'data/incoming/profit_evidence_quality_audit_new1000_20260916.json';
const outputPath = process.env.MM_OUTPUT_FILE ?? 'data/incoming/batch_final100_high_confidence_profit_subset_of_new1000_20260916.json';
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const byId = new Map(source.map((entity) => [entity.id, entity]));
const excluded = /never earned a cent|doing absolutely nothing|sexting|naughty ai|fake news|mlm|catfishing|clever way to travel cheap|easiest way to make quick|revenue on amazon = how much profit/i;
const candidates = audit.rows.filter((row) => row.highConfidenceProfitEvidence && byId.has(row.id) && !excluded.test(`${row.name} ${byId.get(row.id).tagline ?? ''}`)).map((row) => ({ entity: byId.get(row.id), row }));
if (candidates.length < 100) throw new Error(`Expected at least 100 high-confidence candidates, got ${candidates.length}`);
const score = ({ entity, row }) => [entity.scale === 'SOLO' || entity.scale === 'SMALL_TEAM' ? 1 : 0, entity.evidenceCards?.some((card) => card.title?.includes('公式サイト')) ? 1 : 0, row.profitEvidence.length, typeof entity.pnl?.monthlyRevenue === 'number' ? Math.min(entity.pnl.monthlyRevenue, 1_000_000_000) : 0];
candidates.sort((left, right) => { const a = score(left); const b = score(right); for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return b[i] - a[i]; return left.entity.name.localeCompare(right.entity.name); });
const selected = candidates.slice(0, 100).map(({ entity }) => entity);
if (new Set(selected.map((entity) => entity.id)).size !== 100) throw new Error('Duplicate selected IDs');
fs.writeFileSync(outputPath, `${JSON.stringify(selected, null, 2)}\n`, 'utf8');
const receipt = {
  receiptVersion: 'make-money-collection-receipt.v1',
  batchId: 'batch-final100-high-confidence-profit-subset-of-new1000-20260916',
  snapshot: '2026-09-16',
  selection: { input: sourcePath, evidenceAudit: auditPath, selectionRule: 'raw本文の金額近傍に利益語があり、一般ナビ語を除外した高信頼利益証拠から、規模・公式カード・利益証拠数・報告収益を優先。', highConfidenceCandidateCount: candidates.length },
  artifact: { path: outputPath, sha256: crypto.createHash('sha256').update(fs.readFileSync(outputPath)).digest('hex'), bytes: fs.statSync(outputPath).size, count: selected.length },
  quality: { highConfidenceProfitEvidence: selected.filter((entity) => audit.rows.find((row) => row.id === entity.id)?.highConfidenceProfitEvidence).length, rawStorageReadbackBound: selected.filter((entity) => entity.sourceMetadata?.rawStorage?.readbackVerified === true).length, allRevenueValuesUnconfirmed: selected.every((entity) => entity.pnl?.isRevenueUnconfirmed === true), allMarginValuesUnconfirmed: selected.every((entity) => entity.pnl?.isMarginUnconfirmed === true) },
  boundaries: { financialValuesIndependentlyAudited: false, centralCatalogEdited: false, edinetFinancialsEdited: false },
};
fs.writeFileSync(`${outputPath}.receipt.json`, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, count: selected.length, candidateCount: candidates.length, scale: selected.reduce((out, entity) => { out[entity.scale] = (out[entity.scale] ?? 0) + 1; return out; }, {}), highConfidenceProfitEvidence: receipt.quality.highConfidenceProfitEvidence, rawReadback: receipt.quality.rawStorageReadbackBound, receiptPath: `${outputPath}.receipt.json` }, null, 2));
