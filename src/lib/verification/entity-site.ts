/** 公開されている事例の正式なID（大文字小文字を直した形）と、公式サイトのURL。 */
export interface EntitySite {
  entityId: string;
  /** 公式サイトのURL。登録がなければ null。 */
  url: string | null;
}

const FOUNDATION_ENTITY_ID = /^ent_[a-z0-9]+_[a-f0-9]{20}$/;

/**
 * 公開されている事例をIDで引き、公式サイトのURLを返す。見つからなければ null。
 *
 * 1. 一覧・詳細画面と同じ「公開してよい事例」の引き口（本番はカタログ配布物、開発はローカル台帳）。
 * 2. そこになく、収集基盤のID形式なら、権利確認済みの公開ビューにある事例のドメインを公式サイトとする
 *    （画面側の変換も `https://<domain>` を公式サイトとして扱う）。
 * 公開の判定を通らない事例・未公開の事例は、どちらでも見つからない扱いになる。
 */
export async function findEntitySite(entityId: string): Promise<EntitySite | null> {
  const { findCachedPublishableEntity } = await import('@/lib/company-access/local-entity-index');
  const entity = await findCachedPublishableEntity(entityId);
  if (entity) return { entityId: entity.id, url: entity.url?.trim() || null };

  if (!FOUNDATION_ENTITY_ID.test(entityId)) return null;
  try {
    const { readMakeMoneyPublicEntitySummaryById } = await import('@/lib/foundation/make-money-view');
    const summary = await readMakeMoneyPublicEntitySummaryById(entityId);
    if (summary) return { entityId: summary.id, url: summary.domain ? `https://${summary.domain}` : null };
  } catch (error) {
    // R2の認証情報がない環境（ローカル）では、この経路は「見つからない」として扱う。
    if ((error as { code?: unknown } | null)?.code !== 'R2_NOT_CONFIGURED') throw error;
  }
  return null;
}
