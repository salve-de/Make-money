import { isCatalogId } from '@/shared/catalog-membership';

/** 公開されている事例の正式なID（大文字小文字を直した形）と、公式サイトのURL。 */
export interface EntitySite {
  entityId: string;
  /** 公式サイトのURL。登録がなければ null。 */
  url: string | null;
}

/**
 * 公開目録にある事例をIDで引き、公式サイトのURLを返す。目録に無ければ null。
 * 一覧・詳細画面と同じ「公開してよい事例」の引き口だけを使う（収集基盤の非公開ビューは読まない）。
 */
export async function findEntitySite(entityId: string): Promise<EntitySite | null> {
  if (!isCatalogId(entityId)) return null;
  const { findCachedPublishableEntity } = await import('@/lib/company-access/local-entity-index');
  const entity = await findCachedPublishableEntity(entityId);
  return entity ? { entityId: entity.id, url: entity.url?.trim() || null } : null;
}
