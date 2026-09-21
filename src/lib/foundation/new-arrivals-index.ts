import {
  getFoundationBucketAsync,
  putR2MutableView,
  putR2ObjectCreateOnly,
  readR2Object,
  R2ViewConcurrentModificationError,
} from '@/lib/storage/r2';
import {
  makeNewArrivalsRelease,
  newArrivalsContributionKey,
  type NewArrivalsContribution,
  type NewArrivalsRelease,
} from './new-arrivals';

/**
 * The individual contribution files are immutable history. This small,
 * rebuildable view is the read index for the latest few publication windows.
 * Keeping the index separate prevents every catalog request from listing and
 * downloading hundreds of historical contribution files.
 */
export const NEW_ARRIVALS_INDEX_KEY = 'views/make-money/new-arrivals/v1/release-index.json';
const NEW_ARRIVALS_INDEX_SCHEMA = 'new-arrivals-release-index.v1' as const;
const MAX_INDEXED_EDITIONS = 8;
const MAX_INDEXED_ENTITY_IDS_PER_EDITION = 20_000;
const MAX_INDEXED_CONTRIBUTIONS_PER_EDITION = 2_000;
const MAX_CAS_RETRIES = 5;

interface IndexedEdition {
  release_id: string;
  release_at: string;
  entity_ids: string[];
  contribution_ids: string[];
  updated_at: string;
}

interface NewArrivalsReleaseIndex {
  schema_version: typeof NEW_ARRIVALS_INDEX_SCHEMA;
  editions: IndexedEdition[];
  updated_at: string;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim())
    ? [...new Set(value.map((item) => (item as string).trim()))].sort()
    : null;
}

function parseIndex(value: unknown): NewArrivalsReleaseIndex | null {
  const object = asObject(value);
  if (
    !object ||
    object.schema_version !== NEW_ARRIVALS_INDEX_SCHEMA ||
    typeof object.updated_at !== 'string' ||
    !Array.isArray(object.editions)
  ) return null;

  const editions: IndexedEdition[] = [];
  for (const raw of object.editions) {
    const edition = asObject(raw);
    const entityIds = stringArray(edition?.entity_ids);
    const contributionIds = stringArray(edition?.contribution_ids);
    if (
      !edition ||
      typeof edition.release_id !== 'string' ||
      typeof edition.release_at !== 'string' ||
      Number.isNaN(Date.parse(edition.release_at)) ||
      typeof edition.updated_at !== 'string' ||
      !entityIds ||
      !contributionIds
    ) continue;
    editions.push({
      release_id: edition.release_id,
      release_at: new Date(edition.release_at).toISOString(),
      entity_ids: entityIds.slice(0, MAX_INDEXED_ENTITY_IDS_PER_EDITION),
      contribution_ids: contributionIds.slice(0, MAX_INDEXED_CONTRIBUTIONS_PER_EDITION),
      updated_at: new Date(edition.updated_at).toISOString(),
    });
  }

  const updatedAt = new Date(object.updated_at);
  if (Number.isNaN(updatedAt.getTime())) return null;

  return {
    schema_version: NEW_ARRIVALS_INDEX_SCHEMA,
    editions: editions
      .sort((left, right) => Date.parse(right.release_at) - Date.parse(left.release_at))
      .slice(0, MAX_INDEXED_EDITIONS),
    updated_at: updatedAt.toISOString(),
  };
}

function emptyIndex(now = new Date()): NewArrivalsReleaseIndex {
  return {
    schema_version: NEW_ARRIVALS_INDEX_SCHEMA,
    editions: [],
    updated_at: now.toISOString(),
  };
}

function indexRelease(index: NewArrivalsReleaseIndex, now: Date): NewArrivalsRelease | null {
  const edition = index.editions
    .filter((candidate) => Date.parse(candidate.release_at) <= now.getTime())
    .sort((left, right) => Date.parse(right.release_at) - Date.parse(left.release_at))[0];
  if (!edition) return null;
  return makeNewArrivalsRelease({
    releaseId: edition.release_id,
    releaseAt: edition.release_at,
    entityIds: edition.entity_ids,
    contributionCount: edition.contribution_ids.length,
  });
}

async function readIndex(bucket: string): Promise<{
  object: Awaited<ReturnType<typeof readR2Object>>;
  index: NewArrivalsReleaseIndex | null;
}> {
  const object = await readR2Object(bucket, NEW_ARRIVALS_INDEX_KEY);
  if (!object) return { object: null, index: null };
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder().decode(object.body));
  } catch {
    return { object, index: null };
  }
  return { object, index: parseIndex(value) };
}

export async function readIndexedNewArrivalsRelease(
  now = new Date(),
): Promise<NewArrivalsRelease | null> {
  const bucket = await getFoundationBucketAsync('lake');
  const { index } = await readIndex(bucket);
  return index ? indexRelease(index, now) : null;
}

function mergeContribution(
  current: NewArrivalsReleaseIndex,
  contribution: NewArrivalsContribution,
  now: Date,
): NewArrivalsReleaseIndex {
  const existing = current.editions.find((edition) => edition.release_id === contribution.release_id);
  const merged: IndexedEdition = {
    release_id: contribution.release_id,
    release_at: contribution.release_at,
    entity_ids: [...new Set([...(existing?.entity_ids || []), ...contribution.entity_ids])]
      .sort()
      .slice(0, MAX_INDEXED_ENTITY_IDS_PER_EDITION),
    contribution_ids: [...new Set([...(existing?.contribution_ids || []), contribution.contribution_id])]
      .sort()
      .slice(0, MAX_INDEXED_CONTRIBUTIONS_PER_EDITION),
    updated_at: now.toISOString(),
  };

  return {
    schema_version: NEW_ARRIVALS_INDEX_SCHEMA,
    editions: [
      merged,
      ...current.editions.filter((edition) => edition.release_id !== contribution.release_id),
    ]
      .sort((left, right) => Date.parse(right.release_at) - Date.parse(left.release_at))
      .slice(0, MAX_INDEXED_EDITIONS),
    updated_at: now.toISOString(),
  };
}

/**
 * Persist one immutable contribution and update the rebuildable index with
 * ETag CAS. Both operations are retry-safe: the contribution is create-only,
 * and an identical index body is treated as unchanged by the storage layer.
 */
export async function persistNewArrivalsContribution(
  contribution: NewArrivalsContribution,
): Promise<{
  contribution: Awaited<ReturnType<typeof putR2ObjectCreateOnly>>;
  index: Awaited<ReturnType<typeof putR2MutableView>>;
}> {
  const bucket = await getFoundationBucketAsync('lake');
  const contributionBody = JSON.stringify(contribution);
  const contributionResult = await putR2ObjectCreateOnly({
    bucket,
    key: newArrivalsContributionKey(contribution),
    body: contributionBody,
    contentType: 'application/json; charset=utf-8',
    metadata: {
      'foundation-view-purpose': 'new-arrivals-contribution',
      'foundation-release-id': contribution.release_id,
    },
  });

  for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt += 1) {
    const current = await readIndex(bucket);
    const next = mergeContribution(current.index || emptyIndex(), contribution, new Date());
    try {
      const indexResult = await putR2MutableView(
        {
          bucket,
          key: NEW_ARRIVALS_INDEX_KEY,
          body: JSON.stringify(next),
          contentType: 'application/json; charset=utf-8',
          metadata: { 'foundation-view-purpose': 'new-arrivals-release-index' },
        },
        { expectedEtag: current.object?.etag || null },
      );
      return { contribution: contributionResult, index: indexResult };
    } catch (error) {
      if (error instanceof R2ViewConcurrentModificationError && attempt + 1 < MAX_CAS_RETRIES) {
        continue;
      }
      throw error;
    }
  }

  throw new Error(`New-arrivals release index CAS retries exhausted for ${contribution.release_id}`);
}

/** Exposed for the one-time migration of existing contribution history. */
export function mergeNewArrivalsIndexContributions(
  contributions: readonly NewArrivalsContribution[],
  now = new Date(),
): NewArrivalsReleaseIndex {
  return contributions.reduce(
    (index, contribution) => mergeContribution(index, contribution, now),
    emptyIndex(now),
  );
}

export async function writeNewArrivalsIndex(
  index: NewArrivalsReleaseIndex,
): Promise<Awaited<ReturnType<typeof putR2MutableView>>> {
  const bucket = await getFoundationBucketAsync('lake');
  const current = await readIndex(bucket);
  return putR2MutableView(
    {
      bucket,
      key: NEW_ARRIVALS_INDEX_KEY,
      body: JSON.stringify(index),
      contentType: 'application/json; charset=utf-8',
      metadata: { 'foundation-view-purpose': 'new-arrivals-release-index' },
    },
    { expectedEtag: current.object?.etag || null },
  );
}
