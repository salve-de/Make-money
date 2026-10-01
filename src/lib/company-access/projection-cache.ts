import type { FinancialEntity, PublicSummaryEntity } from '@/shared/terminal';
import { publicEntity, publicSummaryEntity } from './public-entity';

/**
 * 公開用の変換（文面の言い換え・非公開欄の除去）を、元の事例オブジェクトごとに1回だけ行う。
 *
 * 公開版の要約・詳細は isolate 内で同じオブジェクトとして使い回される（catalog-release のキャッシュ）。
 * そのため変換結果も同じオブジェクトに結び付けて覚えておけば、要求のたびに全行を変換し直さずに済む。
 * WeakMap なので、元の事例が捨てられれば結果も捨てられる。返す値は共有されるので、呼び出し側で書き換えないこと。
 */
const summaries = new WeakMap<FinancialEntity, PublicSummaryEntity>();
const details = new WeakMap<FinancialEntity, FinancialEntity>();

export function cachedPublicSummaryEntity(entity: FinancialEntity): PublicSummaryEntity {
  let projected = summaries.get(entity);
  if (!projected) {
    projected = publicSummaryEntity(entity);
    summaries.set(entity, projected);
  }
  return projected;
}

export function cachedPublicEntity(entity: FinancialEntity): FinancialEntity {
  let projected = details.get(entity);
  if (!projected) {
    projected = publicEntity(entity);
    details.set(entity, projected);
  }
  return projected;
}
