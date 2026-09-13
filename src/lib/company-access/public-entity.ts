import type { FinancialEntity } from '@/shared/terminal';

/** The only paid content is the structural analysis. Public facts stay public. */
export function publicEntity(entity: FinancialEntity): FinancialEntity {
  const { meta, ...publicFields } = entity;
  return { ...publicFields, hasPremiumAnalysis: Boolean(meta) };
}

/**
 * 一覧表示（DataGrid）に必要な最小メタデータのみを残し、重厚なドシエ（エビデンスカード、略奪手順等）を除去した軽量プロジェクション。
 * 初期HTMLサイズを激減させ、1億件スケールでもクライアントメモリを数MBに固定する。
 */
export function publicSummaryEntity(entity: FinancialEntity): FinancialEntity {
  const pub = publicEntity(entity);
  return {
    ...pub,
    evidenceCards: undefined,
    lootBlueprint: undefined,
    observationsStream: undefined,
  };
}

/** Foundation observations may carry nested raw dossiers. Never return their paid field. */
export function publicFoundationData<T>(value: T): T {
  if (Array.isArray(value)) return value.map(publicFoundationData) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'meta')
      .map(([key, item]) => [key, publicFoundationData(item)])) as T;
  }
  return value;
}

