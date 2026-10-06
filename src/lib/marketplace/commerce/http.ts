import type { NextResponse } from 'next/server';

import { privateJson, readBusinessSaleBody } from '@/lib/marketplace/business-http';
import { marketplaceUserId } from '@/lib/marketplace/commerce/auth';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import type { CommerceParse } from '@/shared/marketplace-commerce-input';

/** 購入・紹介 API の共通処理。本人向けの応答は共有キャッシュに載せない。 */
export { privateJson };

export function logCommerceFailure(operation: string, error: unknown): void {
  console.error(`[marketplace-commerce] ${operation} failed:`, error instanceof Error ? error.name : 'unknown');
}

/** ログイン必須の書き込み API の入口。認証・本文・入力検査・回数制限を順に通す。 */
export async function readCommerceWrite<T>(
  request: Request,
  parse: (value: unknown) => CommerceParse<T>,
  limit: { scope: string; limit: number; windowMs: number },
): Promise<{ ok: true; userId: string; value: T } | { ok: false; response: NextResponse }> {
  const userId = await marketplaceUserId(request);
  if (!userId) return { ok: false, response: privateJson({ error: 'ログインが必要です' }, 401) };
  const body = await readBusinessSaleBody(request);
  if (!body.ok) return { ok: false, response: body.response };
  const parsed = parse(body.value);
  if (!parsed.ok) return { ok: false, response: privateJson({ error: parsed.message }, 400) };
  try {
    const allowed = await consumeRequestRateLimit(request, limit.scope, { limit: limit.limit, windowMs: limit.windowMs, subject: userId });
    if (!allowed) return { ok: false, response: privateJson({ error: '操作の回数が上限に達しました。しばらくしてからもう一度お試しください' }, 429) };
  } catch (error) {
    logCommerceFailure('rate-limit', error);
    return { ok: false, response: privateJson({ error: '処理を始められませんでした。時間をおいてもう一度お試しください' }, 503) };
  }
  return { ok: true, userId, value: parsed.value };
}
