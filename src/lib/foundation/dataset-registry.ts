import type { FoundationBucketRole } from '@/lib/storage/r2';

/**
 * Thin application adapter for the current Foundation registry.
 *
 * Dataset IDs are the stable contract. The physical prefixes below are only
 * the currently registered distribution and are kept in one resolver boundary
 * so a future Foundation resolver can replace them without changing UI code.
 * This file is not a new schema and does not create or mutate any R2 object.
 */
export const FOUNDATION_DATASET_REGISTRY = {
  entities: {
    datasetId: 'ds.business.entities.core',
    bucketRole: 'lake' as FoundationBucketRole,
    schemaVersion: 'v1',
    prefix: 'datasets/ds.business.entities.core/v1/entities/',
  },
  researchBundles: {
    datasetId: 'ds.business.research-bundles.derived',
    bucketRole: 'lake' as FoundationBucketRole,
    schemaVersion: 'v1',
    prefix: 'datasets/ds.business.research-bundles.derived/v1/',
  },
} as const;

export type FoundationDatasetKey = keyof typeof FOUNDATION_DATASET_REGISTRY;

export function foundationDataset(key: FoundationDatasetKey) {
  return FOUNDATION_DATASET_REGISTRY[key];
}
