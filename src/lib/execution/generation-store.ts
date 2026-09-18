import { queryD1 } from '@/lib/storage/d1';
import { sha256Sync } from '@/shared/sha256';

interface GenerationRow {
  generation: number;
  resetAt?: string;
}

export function executionOwnerKey(uid: string): string {
  return sha256Sync('execution-owner:' + uid);
}

export async function getExecutionGeneration(uid: string): Promise<{ generation: number; resetAt: string | null }> {
  const rows = await queryD1<GenerationRow>(
    'SELECT generation, reset_at AS resetAt FROM execution_resets WHERE owner_key = ? LIMIT 1',
    [executionOwnerKey(uid)],
    (raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid execution generation row');
      const row = raw as Record<string, unknown>;
      if (typeof row.generation !== 'number' || !Number.isSafeInteger(row.generation) || row.generation < 0) {
        throw new Error('Invalid execution generation');
      }
      if (row.resetAt !== undefined && typeof row.resetAt !== 'string') throw new Error('Invalid execution reset timestamp');
      return { generation: row.generation, resetAt: typeof row.resetAt === 'string' ? row.resetAt : undefined };
    },
  );
  const row = rows[0];
  return { generation: row?.generation ?? 0, resetAt: row?.resetAt ?? null };
}
