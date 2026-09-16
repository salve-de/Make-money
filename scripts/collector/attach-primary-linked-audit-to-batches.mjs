import fs from 'node:fs';

const auditPath = process.env.MM_PRIMARY_AUDIT_FILE ?? 'data/incoming/primary_linked_window_source_audit_20260916.json';
const batchPaths = (process.env.MM_BATCH_FILES ?? [
  'data/incoming/batch_new_1000_final_primary_mubs_20260916.json',
  'data/incoming/batch_final100_subset_of_new1000_20260916.json',
].join(',')).split(',').filter(Boolean);
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
const byEntity = new Map();
for (const result of audit.results ?? []) {
  if (!result.directWindowSupport) continue;
  const list = byEntity.get(result.entityId) ?? [];
  list.push({
    url: result.url,
    finalUrl: result.finalUrl,
    status: result.status,
    httpStatus: result.httpStatus,
    contentType: result.contentType,
    bytes: result.bytes,
    contentSha256: result.contentSha256,
    directWindowSupport: result.directWindowSupport,
    profitWindowSupport: result.profitWindowSupport,
    rightsStatus: 'metadata_only',
    note: '一次候補本文のメタデータ監査結果。権利確認・raw保存・FinancialEntity財務値の独立監査は未実施。',
  });
  byEntity.set(result.entityId, list);
}
const summaries = [];
for (const batchPath of batchPaths) {
  const batch = JSON.parse(fs.readFileSync(batchPath, 'utf8'));
  let attached = 0;
  for (const entity of batch) {
    const links = byEntity.get(entity.id);
    if (!links?.length) continue;
    entity.sourceMetadata = { ...entity.sourceMetadata, primaryLinkedSourceAudit: { auditPath, sources: links } };
    attached += links.length;
  }
  fs.writeFileSync(batchPath, `${JSON.stringify(batch, null, 2)}\n`, 'utf8');
  summaries.push({ batchPath, count: batch.length, attached });
}
console.log(JSON.stringify({ auditPath, entitiesWithPrimaryLinks: byEntity.size, attachedSources: [...byEntity.values()].flat().length, summaries }, null, 2));
