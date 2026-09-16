import fs from 'node:fs';

const inputPath = 'data/incoming/batch_new_1000_final_primary_mubs_20260916.json';
const capture = JSON.parse(fs.readFileSync('data/incoming/raw_snapshots_bdm_enrichment_20260916.audit.json', 'utf8')).results[0];
const batch = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const entity = batch.find((item) => item.id === capture.entityId);
if (!entity) throw new Error(`Entity not found: ${capture.entityId}`);
if (entity.scale !== 'UNKNOWN') throw new Error(`Expected UNKNOWN scale before enrichment, got ${entity.scale}`);

entity.scale = 'SMALL_TEAM';
entity.operations = {
  ...entity.operations,
  teamSize: 2,
  initialTeamSize: 1,
  currentTeamSize: 2,
  teamSizeReported: '2-3 freelancers plus founder',
  primaryChannels: [...new Set([...(entity.operations.primaryChannels ?? []), 'Founder Reports interview'])],
  isTeamSizeUnconfirmed: false,
};
entity.evidenceCards.push({
  id: `${entity.id}_founder_reports`,
  type: 'PROFIT_RECONCILIATION',
  title: '一次インタビューで2024年利益と少人数運営を照合',
  badge: 'REPORTED',
  evidenceStatus: 'REPORTED',
  punchline: 'Founder Reportsの本文は、2024年売上€126,000、80%超の利益率、利益€106,000、2-3人のフリーランサーを記載している。',
  details: ['本文は「主に本人が顧客対応し、2-3人のフリーランサー・契約者が補助する」運営を示す。', '利益・規模は一次当事者インタビューの報告であり、会計帳簿の独立監査ではない。'],
  codeSnippet: 'N/A — 原文に実装コードの記載なし。',
  sourceNote: `Founder Reports, retrieved 2026-09-16: ${capture.requestedUrl}`,
  sourceUrl: capture.requestedUrl,
  sourceClass: 'INDEPENDENT_SECONDARY',
  evidenceLocator: { type: 'html', textHash: capture.sha256 },
});
entity.observations = [...new Set([...(entity.observations ?? []), 'Founder Reports本文で2024年の売上€126,000、利益€106,000、80%超利益率、2-3人のフリーランサーを確認。'])];
entity.observationsStream = [
  ...(entity.observationsStream ?? []),
  { id: `${entity.id}_founder_reports_observed`, category: 'PRIMARY_SOURCE_ENRICHMENT', originType: 'reported', verificationStatus: 'SUPPORTED', text: 'Founder Reports本文が2024年利益と2-3人のフリーランサーを記載している。', sourceUrl: capture.requestedUrl, observedAt: '2026-09-16', sourceClass: 'INDEPENDENT_SECONDARY', evidenceLocator: { type: 'html', textHash: capture.sha256 } },
];
entity.sourceMetadata = {
  ...entity.sourceMetadata,
  additionalSources: [...(entity.sourceMetadata.additionalSources ?? []), { provider: 'Founder Reports', sourceUrl: capture.requestedUrl, rawContentSha256: capture.sha256, rawStorage: { bucket: 'foundation-raw', payloadKey: null, manifestKey: null, bytes: capture.bytes, readbackVerified: false }, sourceNote: '追加の規模・利益ソース。FinancialEntityのP&L確定監査ではない。' }],
};
entity.unknownsNotes = [...new Set([...(entity.unknownsNotes ?? []), 'Founder Reportsの利益・規模記載は報告値で、会計帳簿・銀行・税務証憑の独立監査は未実施。'])];
entity.unknowns = [...new Set([...(entity.unknowns ?? []), 'Founder Reportsの利益・規模記載は報告値。'])];
entity.reportedMetrics = (entity.reportedMetrics ?? []).filter((metric) => !(metric.unit === 'ANNUAL_PROFIT' && metric.original === '$132,000'));
fs.writeFileSync(inputPath, `${JSON.stringify(batch, null, 2)}\n`);
console.log(JSON.stringify({ inputPath, entityId: entity.id, name: entity.name, scale: entity.scale, teamSize: entity.operations.teamSize, metrics: entity.reportedMetrics.length, addedSourceSha256: capture.sha256 }, null, 2));
