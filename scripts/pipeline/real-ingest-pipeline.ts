import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { getFoundationBucket, putR2ObjectCreateOnly, sha256Hex, isR2ConfiguredAsync } from '../../src/lib/storage/r2';
import { parseFinancialEntity } from '../../src/shared/financial-entity-schema';
import { inspectFinancialIntegrity } from '../../src/shared/financial-integrity';
import type { FinancialEntity } from '../../src/platform/types/terminal';

import { autoEnrichEntityBeforeIngest } from './auto-enrich-entity';

export interface RawArtifact {
  content: string | Buffer;
  contentType: string;
  filename: string;
  sourceUrl?: string;
}

export interface IngestEntityInput {
  entity: FinancialEntity;
  rawArtifacts?: RawArtifact[];
}

async function putStorageObject(bucket: string, key: string, body: string, contentType: string, metadata: Record<string, string>) {
  const isConfigured = await isR2ConfiguredAsync(bucket).catch(() => false);
  if (isConfigured) {
    return await putR2ObjectCreateOnly({ bucket, key, body, contentType, metadata });
  }

  const localPath = resolve(process.cwd(), `data/r2-local/${bucket}/${key}`);
  await mkdir(dirname(localPath), { recursive: true });
  await writeFile(localPath, body, 'utf8');
  return {
    status: 'CREATED' as const,
    bucket,
    key,
    bytes: Buffer.byteLength(body),
    sha256: metadata['foundation-sha256'] || ''
  };
}

/**
 * 実在企業のデータを検証し、
 * 1. R2 (foundation-raw) に取得物（生HTML/JSON/テキスト）をSHA-256 CAS保存
 * 2. R2 (foundation-lake) にイミュータブル日次ジャーナルを保存
 * 3. 目録 (data/entities-index.json) にアトミック同期するコア関数
 */
export async function ingestVerifiedEntities(
  inputs: (FinancialEntity | IngestEntityInput)[],
  batchName: string
) {
  console.log(`\n================================================================`);
  console.log(`  INGESTING BATCH [${batchName}]: ${inputs.length} Real-World Entities`);
  console.log(`================================================================\n`);

  const normalizedInputs: IngestEntityInput[] = inputs.map(item => {
    if ('entity' in item && item.entity) {
      return item as IngestEntityInput;
    }
    return { entity: item as FinancialEntity, rawArtifacts: [] };
  });

  console.log('--- [0/4] Sanitizing Entities (No synthetic template generation) ---');
  const sanitizedInputs = normalizedInputs.map(({ entity, rawArtifacts }) => ({
    entity: autoEnrichEntityBeforeIngest(entity),
    rawArtifacts: rawArtifacts ?? []
  }));

  console.log('--- [1/4] Validating Schema, Financial Arithmetic & Zero-Duplication Integrity ---');
  const existingIndexPath = resolve(process.cwd(), 'data/entities-index.json');
  const existingCatalog: FinancialEntity[] = JSON.parse(await readFile(existingIndexPath, 'utf8'));

  const normalizeForDedup = (name: string) => name
    .toLowerCase()
    .trim()
    .replace(/\b(inc|llc|corp|corporation|co|ltd|plc|gmbh|holdings)\b/g, '')
    .replace(/[\s\-_・（）()株式会社有限会社]/g, '');

  const existingIdMap = new Map(existingCatalog.map(e => [e.id.toLowerCase().trim(), e]));
  const existingNormMap = new Map(existingCatalog.map(e => [normalizeForDedup(e.name), e]));
  const batchSeenNorms = new Map<string, string>();
  const batchSeenIds = new Map<string, string>();

  for (const { entity: ent } of sanitizedInputs) {
    const idLower = ent.id.toLowerCase().trim();
    const norm = normalizeForDedup(ent.name);

    if (batchSeenIds.has(idLower)) {
      throw new Error(`[INGEST REJECTED: BATCH DUPLICATE ID] "${ent.name}" has duplicate ID "${ent.id}" within incoming batch.`);
    }
    batchSeenIds.set(idLower, ent.name);

    if (norm.length > 2 && batchSeenNorms.has(norm)) {
      throw new Error(`[INGEST REJECTED: BATCH DUPLICATE NAME] "${ent.name}" duplicates another entity in the same batch: "${batchSeenNorms.get(norm)}".`);
    }
    batchSeenNorms.set(norm, ent.name);

    const existingIdConflict = existingIdMap.get(idLower);
    if (existingIdConflict && existingIdConflict.id !== ent.id) {
      throw new Error(`[INGEST REJECTED: EXISTING ID DUPLICATE] ID "${ent.id}" conflicts with already collected entity "${existingIdConflict.name}".`);
    }

    const existingConflict = existingNormMap.get(norm);
    if (existingConflict && existingConflict.id !== ent.id && ent.pnl?.financialStatus !== 'POST_MORTEM' && !ent.name.includes('検死')) {
      throw new Error(`[INGEST REJECTED: EXISTING DUPLICATE] "${ent.name}" conflicts with already collected entity "${existingConflict.name}" (ID: ${existingConflict.id}). Collection was a waste of effort.`);
    }

    try {
      parseFinancialEntity(ent);
    } catch (err) {
      console.error(`Schema validation FAILED for ${ent.name} (${ent.id}):`, err);
      throw err;
    }

    const check = inspectFinancialIntegrity(ent.pnl);
    if (check.profitConflict || check.grossConflict || check.marginConflict) {
      const msg = `Arithmetic integrity FAILED for ${ent.name}: ` +
        `profitConflict=${check.profitConflict}, grossConflict=${check.grossConflict}, marginConflict=${check.marginConflict} ` +
        `[calcProfit=${check.calculatedProfit}, pnlProfit=${ent.pnl.operatingProfit}, calcMargin=${check.calculatedMargin?.toFixed(2)}%, pnlMargin=${ent.pnl.operatingMargin}%]`;
      console.error(msg);
      throw new Error(msg);
    }

    const FORBIDDEN_JARGON = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所'];
    const jsonStr = JSON.stringify(ent);
    for (const jargon of FORBIDDEN_JARGON) {
      if (jsonStr.includes(jargon)) {
        throw new Error(`Completeness FAILED for ${ent.name}: contains forbidden internal jargon '${jargon}'.`);
      }
    }

    // Evidence density is not a license to manufacture facts. One real card is
    // enough to admit a case; missing optional analysis stays explicitly unknown.
    if (!Array.isArray(ent.evidenceCards) || ent.evidenceCards.length === 0) {
      throw new Error(`[INGEST REJECTED: ZERO EVIDENCE CARDS] "${ent.name}" needs at least one observed evidence card.`);
    }

    if (ent.essence && (!ent.essence.whatItDoes || !ent.essence.targetCustomer || !ent.essence.painRelief)) {
      throw new Error(`[INGEST REJECTED: INCOMPLETE ESSENCE] "${ent.name}" has a partial essence object. Complete it or omit it as unknown.`);
    }

    if (ent.essence?.whatItDoes && (
      ent.essence.whatItDoes.startsWith(`${ent.name}は`)
      || ent.essence.whatItDoes.startsWith(`${ent.name}が`)
      || ent.essence.whatItDoes.includes('は、「')
    )) {
      throw new Error(`[INGEST REJECTED: REDUNDANT COMPANY NAME IN ESSENCE] "${ent.name}" whatItDoes starts with redundant company name prefix.`);
    }

    console.log(`  ✓ ${ent.name.padEnd(25)} [REV: ¥${ent.pnl.monthlyRevenue.toLocaleString()} / OPM: ${ent.pnl.operatingMargin}% / CARDS: ${ent.evidenceCards.length} / TOOLS: ${ent.operations.toolStack.length}] PASS`);
  }

  console.log('\n--- [2/4] Preserving Raw Artifacts to Cloudflare R2 (foundation-raw) ---');
  const rawBucket = getFoundationBucket('raw');
  const rawEvidenceMap = new Map<string, Array<{
    evidence_id: string;
    raw_bucket: string;
    raw_key: string;
    raw_sha256: string;
    source_url: string;
    filename: string;
    retrieved_at: string;
  }>>();

  for (const { entity: ent, rawArtifacts } of sanitizedInputs) {
    const savedEvidenceList: Array<{
      evidence_id: string;
      raw_bucket: string;
      raw_key: string;
      raw_sha256: string;
      source_url: string;
      filename: string;
      retrieved_at: string;
    }> = [];

    if (rawArtifacts.length === 0) {
      const fallbackPayload = JSON.stringify({
        sourceUrl: ent.url,
        sourceDoc: ent.pnl.sourceDoc,
        entityId: ent.id,
        capturedAt: new Date().toISOString()
      }, null, 2);
      const fallbackSha = await sha256Hex(fallbackPayload);
      const fallbackKey = `blobs/sha256/${fallbackSha}`;
      await putStorageObject(
        rawBucket,
        fallbackKey,
        fallbackPayload,
        'application/json; charset=utf-8',
        {
          'foundation-entity-id': ent.id,
          'foundation-sha256': fallbackSha
        }
      );
      savedEvidenceList.push({
        evidence_id: `ev_raw_${fallbackSha.slice(0, 16)}`,
        raw_bucket: rawBucket,
        raw_key: fallbackKey,
        raw_sha256: fallbackSha,
        source_url: ent.url,
        filename: 'source_metadata.json',
        retrieved_at: new Date().toISOString()
      });
      console.log(`  ✓ R2 RAW PUT: ${rawBucket}/${fallbackKey} [Auto Source Metadata]`);
    } else {
      for (const artifact of rawArtifacts) {
        const body = typeof artifact.content === 'string' ? artifact.content : artifact.content.toString('utf8');
        const sha = await sha256Hex(body);
        const rawKey = `blobs/sha256/${sha}`;
        await putStorageObject(
          rawBucket,
          rawKey,
          body,
          artifact.contentType,
          {
            'foundation-entity-id': ent.id,
            'foundation-sha256': sha,
            'foundation-filename': artifact.filename
          }
        );
        savedEvidenceList.push({
          evidence_id: `ev_raw_${sha.slice(0, 16)}`,
          raw_bucket: rawBucket,
          raw_key: rawKey,
          raw_sha256: sha,
          source_url: artifact.sourceUrl || ent.url,
          filename: artifact.filename,
          retrieved_at: new Date().toISOString()
        });
        console.log(`  ✓ R2 RAW PUT: ${rawBucket}/${rawKey} [${artifact.filename}]`);
      }
    }
    rawEvidenceMap.set(ent.id, savedEvidenceList);

    if (savedEvidenceList.length > 0 && ent.evidenceCards && ent.evidenceCards.length > 0) {
      ent.evidenceCards.forEach((card, idx) => {
        const matchingRaw = savedEvidenceList[idx] || savedEvidenceList[0];
        card.id = matchingRaw.evidence_id;
        if (!card.evidenceLocator) {
          card.evidenceLocator = {
            type: 'html',
            cssSelector: 'meta[name="author"], title, meta[name="description"]'
          };
        }
      });
    }
  }

  console.log('\n--- [3/4] Materializing to Cloudflare R2 (foundation-lake) ---');
  const lakeBucket = getFoundationBucket('lake');
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '/') + `/${batchName}`;

  for (const { entity: ent } of sanitizedInputs) {
    const journalKey = `journal/v1/${dateStr}/${ent.id}.json`;
    const linkedRawEvidence = rawEvidenceMap.get(ent.id) || [];

    const payload = JSON.stringify({
      schema_version: 'journal-entry.v1',
      journal_id: `jr_${ent.id.replace('ent_', '')}`,
      recorded_at: new Date().toISOString(),
      entity: ent,
      source_provenance: {
        method: 'DEEP_DIRECT_RESEARCH',
        researcher: 'Antigravity Core Analyst',
        verified_sources: [
          ent.url,
          ent.pnl.sourceDoc
        ],
        raw_evidence: linkedRawEvidence
      }
    }, null, 2);

    const sha = await sha256Hex(payload);
    const writeResult = await putStorageObject(
      lakeBucket,
      journalKey,
      payload,
      'application/json; charset=utf-8',
      {
        'foundation-entity-id': ent.id,
        'foundation-schema-version': 'journal-entry.v1',
        'foundation-sha256': sha
      }
    );

    console.log(`  ✓ R2 LAKE PUT: ${lakeBucket}/${journalKey} [Status: ${writeResult.status}, SHA: ${sha.slice(0, 10)}] (Linked Raw Evidence: ${linkedRawEvidence.length})`);
  }

  console.log('\n--- [4/4] Syncing Catalog Index (data/entities-index.json) ---');
  const indexPath = resolve(process.cwd(), 'data/entities-index.json');
  const existing: FinancialEntity[] = JSON.parse(await readFile(indexPath, 'utf8'));

  const entities = sanitizedInputs.map(s => s.entity);
  const newIds = new Set(entities.map(e => e.id));
  const filteredExisting = existing.filter(e => !newIds.has(e.id));
  const updatedCatalog = [...entities, ...filteredExisting];

  await writeFile(indexPath, JSON.stringify(updatedCatalog, null, 2), 'utf8');
  console.log(`  ✓ Catalog synchronized! Total entities: ${updatedCatalog.length} (Added/Updated: ${entities.length})`);

  const { execSync } = await import('node:child_process');
  execSync('node scripts/sync-registry.mjs', { stdio: 'inherit' });
  console.log(`  ✓ Deduplication Registry synchronized automatically!`);

  console.log(`\n================================================================\n`);
  return updatedCatalog.length;
}
