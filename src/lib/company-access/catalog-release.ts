import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import manifest from '../../../data/catalog-release.json';
import { getCloudflareRuntimeEnv } from '@/lib/runtime/cloudflare';
import { getFoundationBucketAsync, readR2Object } from '@/lib/storage/r2';
import { getDossierStoragePath } from '@/lib/foundation/dossier-projection';
import { parseFinancialEntitiesResiliently } from '@/shared/financial-entity-schema';
import { isPublishableEntity } from './public-entity';
import type { FinancialEntity } from '@/shared/terminal';
import type { DiscoveryDataset } from '@/features/discover';
import { compileParser } from '@/shared/validate-json';
import discoverySchema from './schemas/discovery-dataset.json';

const parseDiscovery = compileParser<DiscoveryDataset>(discoverySchema, 'DiscoveryDataset');
export async function readReleaseDiscovery(): Promise<DiscoveryDataset> {
  return parseDiscovery(await readArtifact(manifest.discovery.key, manifest.discovery.hash));
}

export async function usesCatalogRelease(): Promise<boolean> {
  // next dev installs an emulated Cloudflare context with the production vars.
  // Local editing must still read the working-tree JSON, not private remote R2.
  if (process.env.NODE_ENV === 'development') return false;
  const env = await getCloudflareRuntimeEnv();
  return env?.ENVIRONMENT === 'production';
}

export function decodeCatalogArtifact(bytes: Uint8Array, expectedHash: string): unknown {
  const json = gunzipSync(bytes, { maxOutputLength: 24 * 1024 * 1024 });
  if (createHash('sha256').update(json).digest('hex') !== expectedHash) throw new Error('Catalog artifact hash mismatch');
  return JSON.parse(json.toString('utf8')) as unknown;
}

async function readArtifact(key: string, hash: string): Promise<unknown> {
  if (!key || !/^[a-f0-9]{64}$/.test(hash)) throw new Error('Catalog release has not been prepared');
  const object = await readR2Object(await getFoundationBucketAsync('lake'), key);
  if (!object) throw new Error('Catalog release object is missing');
  return decodeCatalogArtifact(object.body, hash);
}

let summaries: Promise<FinancialEntity[]> | undefined;
export async function readReleaseSummaries(): Promise<FinancialEntity[]> {
  if (!summaries) {
    summaries = readArtifact(manifest.summaries.key, manifest.summaries.hash).then((value) => {
      const result = parseFinancialEntitiesResiliently(value);
      if (result.invalidEntities.length || result.validEntities.length !== manifest.publishedCount) throw new Error('Invalid catalog summary release');
      const featuredIdx = result.validEntities.findIndex((entity) => entity.id === 'ent_photoai');
      if (featuredIdx > 0) result.validEntities.unshift(...result.validEntities.splice(featuredIdx, 1));
      return result.validEntities;
    }).catch((error) => { summaries = undefined; throw error; });
  }
  return summaries;
}

export async function findReleaseEntity(id: string): Promise<FinancialEntity | null> {
  const details: Record<string, string> = manifest.details;
  const canonicalId = Object.keys(details).find((key) => key.toLowerCase() === id.toLowerCase());
  if (!canonicalId) return null;
  const hash = details[canonicalId];
  const value = await readArtifact(getDossierStoragePath(canonicalId, hash), hash);
  const parsed = parseFinancialEntitiesResiliently([value]);
  const entity = parsed.validEntities[0];
  if (!entity || entity.id !== canonicalId || !isPublishableEntity(entity)) throw new Error('Invalid catalog dossier');
  return entity;
}

export function releaseApprovalCandidateIds(): Set<string> {
  return new Set(manifest.approvalCandidateIds);
}

/** Check release membership without reading the full dossier from R2. */
export function hasCatalogReleaseEntity(id: string): boolean {
  const normalizedId = id.trim().toLowerCase();
  if (!normalizedId) return false;
  return Object.keys(manifest.details).some((candidate) => candidate.toLowerCase() === normalizedId);
}
