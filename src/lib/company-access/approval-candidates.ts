import { releaseApprovalCandidateIds } from './catalog-release';

const REVIEW_TAG = '収集事例';
function normalizedId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.trim().toLowerCase();
  return id.length > 0 ? id : null;
}

/**
 * Extract the current editorial-review candidates from the canonical checked-in
 * catalog. Approval is specifically the removal of the `収集事例` marker, so
 * mere entity existence is not enough to authorize a write.
 */
export function collectApprovalCandidateIds(catalog: unknown): Set<string> {
  if (!Array.isArray(catalog)) throw new Error('Invalid entity catalog');

  const ids = new Set<string>();
  for (const value of catalog) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const record = value as Record<string, unknown>;
    const id = normalizedId(record.id);
    const tags = Array.isArray(record.tags)
      ? record.tags.filter((tag): tag is string => typeof tag === 'string')
      : [];
    if (id && tags.includes(REVIEW_TAG)) ids.add(id);
  }
  return ids;
}

async function loadApprovalCandidateIds(): Promise<Set<string>> {
  return releaseApprovalCandidateIds();
}

/**
 * Return requested IDs that are not current review candidates. Any catalog read
 * or parse failure is allowed to throw so the caller fails closed rather than
 * creating a latent approval for an unknown future entity.
 */
export async function findInvalidApprovalCandidateIds(requestedIds: readonly string[]): Promise<string[]> {
  const current = await loadApprovalCandidateIds();
  return requestedIds
    .map((id) => id.trim().toLowerCase())
    .filter((id) => !current.has(id));
}
