import type { FinancialEntity } from '@/platform/types/terminal';
import { findReleaseEntity, readReleaseSummaries } from './catalog-release';

/** 公開目録の要約。読めない時は CatalogUnavailableError を投げる（見本データや全件索引には落とさない）。 */
export async function readCachedLocalPublishableEntities(): Promise<FinancialEntity[]> {
  return readReleaseSummaries();
}

/** 公開目録にある事例の詳細。目録に無ければ null。 */
export async function findCachedPublishableEntity(id: string): Promise<FinancialEntity | null> {
  return findReleaseEntity(id);
}
