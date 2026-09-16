import fs from 'node:fs';

const resultPath = process.argv[2];
const outputPath = process.argv[3] ?? 'data/incoming/foundation_journal_bounded_result_20260916.json';
const auditPath = process.argv[4] ?? 'data/incoming/final1000_completion_audit_20260916.json';
const receiptPath = process.argv[5] ?? 'data/incoming/batch_final100_subset_of_new1000_20260916.json.receipt.json';
if (!resultPath) throw new Error('Usage: node persist-foundation-journal-result.mjs RESULT.json [OUTPUT.json] [AUDIT.json]');
const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
audit.evidence.foundationJournal = {
  resultPath: outputPath,
  planned: result.planned,
  preflightAbsent: result.preflight?.absent ?? 0,
  preflightIdentical: result.preflight?.identical ?? 0,
  created: result.writes?.created ?? 0,
  writeIdentical: result.writes?.identical ?? 0,
  readbackVerified: result.writes?.readbackVerified ?? 0,
};
audit.boundaries.canonicalFoundationJournalWriteCompleted = result.writes?.readbackVerified === result.planned;
audit.acceptance.canonicalJournalReadbackComplete = result.writes?.readbackVerified === result.planned;
audit.overall = audit.acceptance.exactAllCount && audit.acceptance.exactFinalCount && audit.acceptance.finalIsSubset && audit.acceptance.schemaAndIdentityClean && audit.acceptance.claimLockComplete && audit.acceptance.r2ReadbackCompleteForCapturedSources && audit.boundaries.independentProfitAuditCompleted && audit.boundaries.canonicalFoundationJournalWriteCompleted;
fs.writeFileSync(auditPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
receipt.boundaries = {
  ...receipt.boundaries,
  canonicalFoundationJournalWriteCompleted: result.writes?.readbackVerified === result.planned,
  canonicalFoundationJournalEntries: result.planned,
  canonicalFoundationJournalReadbackVerified: result.writes?.readbackVerified ?? 0,
};
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ outputPath, auditPath, receiptPath, journalReadbackVerified: result.writes?.readbackVerified, overall: audit.overall }, null, 2));
