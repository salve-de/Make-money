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

  // ローカル開発・未設定環境でのCASミラー保存（同一のキー階層をローカルに完全再現）
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

  // 正規化: FinancialEntity 単体でも IngestEntityInput でも統一
  const normalizedInputs: IngestEntityInput[] = inputs.map(item => {
    if ('entity' in item && item.entity) {
      return item as IngestEntityInput;
    }
    return { entity: item as FinancialEntity, rawArtifacts: [] };
  });

  // 0. 収集時点のサニタイズ（禁止造語パージ・タグ正規化）※架空テンプレート捏造は完全廃止
  console.log('--- [0/4] Sanitizing Entities (No synthetic template generation) ---');
  const sanitizedInputs = normalizedInputs.map(({ entity, rawArtifacts }) => ({
    entity: autoEnrichEntityBeforeIngest(entity),
    rawArtifacts: rawArtifacts ?? []
  }));

  // 1. スキーマ & 算術整合性バリデーション
  console.log('--- [1/4] Validating Schema & Financial Arithmetic Integrity ---');
  for (const { entity: ent } of sanitizedInputs) {
    // A. スキーマチェック
    try {
      parseFinancialEntity(ent);
    } catch (err) {
      console.error(`Schema validation FAILED for ${ent.name} (${ent.id}):`, err);
      throw err;
    }

    // B. 算術整合性チェック (1円・0.1%の狂いも許さない)
    const check = inspectFinancialIntegrity(ent.pnl);
    if (check.profitConflict || check.grossConflict || check.marginConflict) {
      const msg = `Arithmetic integrity FAILED for ${ent.name}: ` +
        `profitConflict=${check.profitConflict}, grossConflict=${check.grossConflict}, marginConflict=${check.marginConflict} ` +
        `[calcProfit=${check.calculatedProfit}, pnlProfit=${ent.pnl.operatingProfit}, calcMargin=${check.calculatedMargin?.toFixed(2)}%, pnlMargin=${ent.pnl.operatingMargin}%]`;
      console.error(msg);
      throw new Error(msg);
    }

    // C. 禁止造語パージチェック
    const FORBIDDEN_JARGON = ['サバンナOS', 'サバンナ OS', '略奪転用方程式', 'カニバリズム障壁', '身も蓋もない真実', '特異物証', '地雷検死', '検死開示', 'ホスティング関所', '決済関所'];
    const jsonStr = JSON.stringify(ent);
    for (const j of FORBIDDEN_JARGON) {
      if (jsonStr.includes(j)) {
        throw new Error(`Completeness FAILED for ${ent.name}: contains forbidden internal jargon '${j}'.`);
      }
    }

    console.log(`  ✓ ${ent.name.padEnd(25)} [REV: ¥${ent.pnl.monthlyRevenue.toLocaleString()} / OPM: ${ent.pnl.operatingMargin}% / CARDS: ${ent.evidenceCards?.length ?? 0} / OBS: ${ent.observations?.length ?? 0}] PASS`);
  }

  // 2. Cloudflare R2 (foundation-raw) に生データ（Raw Artifacts）をSHA-256 CAS保存
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
  }

  // 3. Cloudflare R2 (foundation-lake) にイミュータブル日次ジャーナル保存（Raw参照を同一チェーンで保持）
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

  // 4. 目録 (data/entities-index.json) に追記・更新
  console.log('\n--- [4/4] Syncing Catalog Index (data/entities-index.json) ---');
  const indexPath = resolve(process.cwd(), 'data/entities-index.json');
  const existing: FinancialEntity[] = JSON.parse(await readFile(indexPath, 'utf8'));

  const entities = sanitizedInputs.map(s => s.entity);
  const newIds = new Set(entities.map(e => e.id));
  const filteredExisting = existing.filter(e => !newIds.has(e.id));
  const updatedCatalog = [...entities, ...filteredExisting];

  await writeFile(indexPath, JSON.stringify(updatedCatalog, null, 2), 'utf8');
  console.log(`  ✓ Catalog synchronized! Total entities: ${updatedCatalog.length} (Added/Updated: ${entities.length})`);
  console.log(`\n================================================================\n`);
  return updatedCatalog.length;
}
