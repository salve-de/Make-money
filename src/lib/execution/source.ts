import registry from '../../../data/collected-registry.json';
import { findCachedPublishableEntity } from '@/lib/company-access/local-entity-index';
import { readFoundationEntitySummaryById } from '@/lib/foundation/business-reader';
import { executionSource, identityOnlyExecutionSource } from '@/shared/execution-source';

/** Keep financial publication gates intact; a known identity can still start a blank plan. */
export async function findExecutionSource(id: string) {
  const entity = await findCachedPublishableEntity(id);
  if (entity) return executionSource(entity);
  const known = registry.find((row) => row.id.toLowerCase() === id.toLowerCase());
  if (known) return identityOnlyExecutionSource(known.id, known.name);
  try {
    const canonical = await readFoundationEntitySummaryById(id);
    if (canonical) return identityOnlyExecutionSource(canonical.id, canonical.name);
  } catch {
    // An unavailable source must not invent a business identity.
  }
  return null;
}
