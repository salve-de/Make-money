import { NextRequest, NextResponse } from 'next/server';

import { runDigest } from '@/lib/notifications/digest';
import { createRuntimeDigestDeps } from '@/lib/notifications/digest-runtime';
import { isEmailConfigured, normalizeAppUrl } from '@/lib/notifications/email';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store' };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

async function sha256(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

/** Compares fixed-length digests, so neither the secret's content nor its length shows in the timing. */
async function secretMatches(expected: string, supplied: string): Promise<boolean> {
  const [left, right] = await Promise.all([sha256(expected), sha256(supplied)]);
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

/**
 * POST /api/notifications/digest, called on a schedule (see docs/NOTIFICATIONS.md).
 *
 * - 503 when NOTIFY_CRON_SECRET is not set, 401 when the x-cron-secret header does not match.
 * - { skipped: 'email_not_configured' } (200) when no mail provider is configured. Nothing is read or sent.
 * - Otherwise { release, sent, skipped, failed, truncated? }. 502 when any send failed
 *   or storage could not be read; running again is safe and only retries what is missing.
 */
export async function POST(request: NextRequest) {
  const expected = await getRuntimeEnvValue('NOTIFY_CRON_SECRET');
  if (!expected) return json({ error: '配信の定期実行はまだ設定されていません' }, 503);

  const supplied = request.headers.get('x-cron-secret')?.trim() ?? '';
  if (!supplied || !await secretMatches(expected, supplied)) return json({ error: 'Unauthorized' }, 401);

  if (!await isEmailConfigured()) return json({ skipped: 'email_not_configured' });

  const appUrl = normalizeAppUrl(await getRuntimeEnvValue('NEXT_PUBLIC_APP_URL'))
    ?? normalizeAppUrl(new URL(request.url).origin);
  if (!appUrl) return json({ error: 'サイトのURLを決められません' }, 503);

  try {
    const result = await runDigest(createRuntimeDigestDeps(appUrl), { appUrl });
    return json(result, result.failed > 0 ? 502 : 200);
  } catch (error) {
    console.error('[notifications/digest] run failed:', error);
    return json({ error: '配信を実行できませんでした' }, 502);
  }
}
