import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { queryD1 } from '@/lib/storage/d1';

const DEFAULT_DAILY_CREDIT_LIMIT = 5;

export interface BuilderCreditBudget {
  used: number;
  limit: number;
  remaining: number;
}

async function configuredLimit(): Promise<number> {
  const raw = await getRuntimeEnvValue('BUILDER_DAILY_CREDIT_LIMIT', { runtimeFirst: true });
  if (!raw) return DEFAULT_DAILY_CREDIT_LIMIT;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 10_000 ? parsed : DEFAULT_DAILY_CREDIT_LIMIT;
}

export async function getBuilderCreditBudget(userId: string): Promise<BuilderCreditBudget> {
  const rows = await queryD1<{ used: number }>(
    `SELECT COALESCE(SUM(credits_cost),0) AS used
     FROM build_sessions
     WHERE user_id=? AND updated_at >= datetime('now','-1 day')`,
    [userId],
    (raw) => {
      const row = raw as Record<string, unknown>;
      const value = typeof row.used === 'number' ? row.used : Number(row.used);
      return { used: Number.isFinite(value) && value >= 0 ? value : 0 };
    },
  );
  // Conservative cap: count all costs of recently active sessions, including
  // revisions to older chats. Preview refreshes may retain costs longer but
  // must never let an old chat bypass the limit.
  const used = rows[0]?.used ?? 0;
  const limit = await configuredLimit();
  return { used, limit, remaining: Math.max(0, limit - used) };
}
