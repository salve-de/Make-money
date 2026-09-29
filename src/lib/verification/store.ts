import { executeD1, queryD1 } from '@/lib/storage/d1';
import { VERIFICATION_COOLDOWN_SECONDS, type VerifiedEntity, type VerifiedRevenue } from '@/shared/verification';

/** 確認済み一覧で返す事例数の上限（応答の大きさを抑える）。 */
export const MAX_VERIFIED_LIST = 2000;

/** 保存する1件。公開してよい部分（revenue）と、公開しない部分を分けて持つ。 */
export interface NewVerification {
  id: string;
  /** 運営者のFirebase UID。同じ人の連続確認の制限と退会時の削除だけに使う。 */
  userId: string;
  /** 決済アカウントIDのSHA-256。IDそのものは保存しない。 */
  accountIdHash: string;
  revenue: VerifiedRevenue;
}

// 公開用の列だけを選ぶ。user_id と account_id_hash は、どの読み出しにも含めない。
const PUBLIC_COLUMNS = `entity_id AS entityId, provider, account_domain AS accountDomain, currency,
  last30d_revenue_minor AS last30dRevenueMinor, mrr_minor AS mrrMinor, active_subscriptions AS activeSubscriptions,
  period_start AS periodStart, period_end AS periodEnd, verified_at AS verifiedAt`;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid verification row');
  return value as Record<string, unknown>;
}
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value);
const isNullableInteger = (value: unknown): value is number | null => value === null || isInteger(value);

function parseRevenueRow(value: unknown): VerifiedRevenue {
  const row = record(value);
  if (
    typeof row.entityId !== 'string' || row.provider !== 'stripe'
    || typeof row.accountDomain !== 'string' || typeof row.currency !== 'string'
    || !isInteger(row.last30dRevenueMinor) || !isNullableInteger(row.mrrMinor) || !isNullableInteger(row.activeSubscriptions)
    || !isInteger(row.periodStart) || !isInteger(row.periodEnd) || !isInteger(row.verifiedAt)
  ) throw new Error('Invalid verification row');
  // 列を1つずつ写す。行にほかの列があっても、公開用の型には出ない。
  return {
    entityId: row.entityId,
    provider: 'stripe',
    accountDomain: row.accountDomain,
    currency: row.currency,
    last30dRevenueMinor: row.last30dRevenueMinor,
    mrrMinor: row.mrrMinor,
    activeSubscriptions: row.activeSubscriptions,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    verifiedAt: row.verifiedAt,
  };
}

function parseEntityRow(value: unknown): VerifiedEntity {
  const row = record(value);
  if (typeof row.entityId !== 'string' || !isInteger(row.verifiedAt)) throw new Error('Invalid verification row');
  return { entityId: row.entityId, verifiedAt: row.verifiedAt };
}

function parseLastRow(value: unknown): number | null {
  const row = record(value);
  if (!isNullableInteger(row.verifiedAt)) throw new Error('Invalid verification row');
  return row.verifiedAt;
}

/** 事例ごとの最新の確認結果（公開用）。なければ null。 */
export async function getLatestVerification(entityId: string): Promise<VerifiedRevenue | null> {
  const rows = await queryD1(
    `SELECT ${PUBLIC_COLUMNS} FROM verified_revenue
     WHERE entity_id = ? AND provider = 'stripe'
     ORDER BY verified_at DESC, id DESC LIMIT 1`,
    [entityId],
    parseRevenueRow,
  );
  return rows[0] ?? null;
}

/** 確認済みの事例と、その事例の最新の確認時刻。新しい順。 */
export async function listVerifiedEntities(limit = MAX_VERIFIED_LIST): Promise<VerifiedEntity[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_VERIFIED_LIST) throw new Error('Invalid verification list limit');
  return queryD1(
    `SELECT entity_id AS entityId, MAX(verified_at) AS verifiedAt FROM verified_revenue
     WHERE provider = 'stripe'
     GROUP BY entity_id ORDER BY verifiedAt DESC, entity_id ASC LIMIT ?`,
    [limit],
    parseEntityRow,
  );
}

/** この利用者がこの事例を最後に確認した時刻（UNIX秒）。なければ null。 */
export async function getLastVerifiedAt(userId: string, entityId: string): Promise<number | null> {
  const rows = await queryD1(
    'SELECT MAX(verified_at) AS verifiedAt FROM verified_revenue WHERE user_id = ? AND entity_id = ?',
    [userId, entityId],
    parseLastRow,
  );
  return rows[0] ?? null;
}

/**
 * 1行追加する。同じ利用者・同じ事例で、直近 VERIFICATION_COOLDOWN_SECONDS 以内の確認がすでにあれば、
 * 追加せず false を返す（同時に来た2件目もここで止まる）。
 */
export async function insertVerification(input: NewVerification): Promise<boolean> {
  const { revenue } = input;
  const result = await executeD1(
    `INSERT INTO verified_revenue(
       id,entity_id,user_id,provider,account_id_hash,account_domain,currency,
       last30d_revenue_minor,mrr_minor,active_subscriptions,period_start,period_end,verified_at
     )
     SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?
     WHERE NOT EXISTS (
       SELECT 1 FROM verified_revenue WHERE user_id = ? AND entity_id = ? AND verified_at > ?
     )`,
    [
      input.id, revenue.entityId, input.userId, revenue.provider, input.accountIdHash, revenue.accountDomain, revenue.currency,
      revenue.last30dRevenueMinor, revenue.mrrMinor, revenue.activeSubscriptions, revenue.periodStart, revenue.periodEnd, revenue.verifiedAt,
      input.userId, revenue.entityId, revenue.verifiedAt - VERIFICATION_COOLDOWN_SECONDS,
    ],
  );
  return result.changes === 1;
}
