import { queryD1 } from '@/lib/storage/d1';

const DEFAULT_WINDOW_MS = 60 * 60 * 1000;
const DEFAULT_LIMIT = 10;

async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Consume one bounded write request. Cloudflare supplies CF-Connecting-IP at
 * the edge; local callers fall back to a stable anonymous bucket. Only a
 * digest is stored, and the row is overwritten at the next window.
 */
export async function consumeRequestRateLimit(
  req: Request,
  scope: string,
  options: { limit?: number; windowMs?: number; subject?: string } = {},
): Promise<boolean> {
  const limit = Math.max(1, Math.min(options.limit ?? DEFAULT_LIMIT, 1000));
  const windowMs = Math.max(10_000, Math.min(options.windowMs ?? DEFAULT_WINDOW_MS, 24 * 60 * 60 * 1000));
  const clientIp = req.headers.get('cf-connecting-ip')?.trim()
    || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'anonymous';
  const subject = options.subject?.trim() || clientIp;
  const bucketKey = `${scope}:${await digest(subject)}`;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  const rows = await queryD1<{ requestCount: number }>(
    `INSERT INTO request_rate_limits(bucket_key,window_start,request_count,updated_at)
     VALUES(?,?,1,CURRENT_TIMESTAMP)
     ON CONFLICT(bucket_key) DO UPDATE SET
       window_start=excluded.window_start,
       request_count=CASE WHEN request_rate_limits.window_start=excluded.window_start
         THEN request_rate_limits.request_count+1 ELSE 1 END,
       updated_at=CURRENT_TIMESTAMP
     RETURNING request_count AS requestCount`,
    [bucketKey, windowStart],
  );
  const count = rows[0]?.requestCount;
  return typeof count === 'number' && Number.isInteger(count) && count <= limit;
}
