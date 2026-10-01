import { findCachedPublishableEntity } from '@/lib/company-access/local-entity-index';
import { executionSource } from '@/shared/execution-source';
import { isCatalogId } from '@/shared/catalog-membership';

/** 公開目録にある事例だけが実行計画の元になる。目録に無い ID は null（画面は 404）。 */
export async function findExecutionSource(id: string) {
  if (!isCatalogId(id)) return null;
  const entity = await findCachedPublishableEntity(id);
  return entity ? executionSource(entity) : null;
}
