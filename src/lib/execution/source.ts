import registry from '../../../data/collected-registry.json';
import { findCachedPublishableEntity } from '@/lib/company-access/local-entity-index';
import { readFoundationEntitySummaryById } from '@/lib/foundation/business-reader';
import { executionSource, identityOnlyExecutionSource } from '@/shared/execution-source';
import { readMakeMoneyViewDetail } from '@/lib/foundation/make-money-view';
import { parseFoundationBusinessCase } from '@/lib/foundation/schema';
import { adaptFoundationDetailToFinancialEntity, adaptFoundationSummaryToFinancialEntity, isFoundationDossierReady } from '@/lib/foundation/foundation-adapter';
import { isPublishableEntity, publicEntity, publicFoundationData } from '@/lib/company-access/public-entity';

/** Keep financial publication gates intact; a known identity can still start a blank plan. */
export async function findExecutionSource(id: string) {
  const entity = await findCachedPublishableEntity(id);
  try {
    const view = parseFoundationBusinessCase(await readMakeMoneyViewDetail(id));
    if (entity && (!view || !isFoundationDossierReady(view))) return executionSource(entity);
    if (view && view.id.toLowerCase() === id.toLowerCase()
      && isPublishableEntity(adaptFoundationSummaryToFinancialEntity(view))) {
      // Apply the same schema, publication and public-field boundaries as the
      // detail screen before carrying R2 research into an execution plan.
      return executionSource(publicEntity(adaptFoundationDetailToFinancialEntity(publicFoundationData(view))));
    }
  } catch {
    // A failed/private view may provide identity only, never unchecked context.
  }
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
