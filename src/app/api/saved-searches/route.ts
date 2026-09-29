import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { parseSavedSearchInput, SavedSearchValidationError } from '@/lib/saved-searches/input';
import { createSavedSearch, listSavedSearches } from '@/lib/saved-searches/store';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { SAVED_SEARCH_LIMIT_MESSAGE, type SavedSearchInput } from '@/shared/saved-search';

export const dynamic = 'force-dynamic';

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
// Room for a screen that still sends its whole filter state (including bookmarks, which
// are dropped). The stored search itself is far smaller and is capped separately.
const MAX_BODY_BYTES = 128 * 1024;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(authorization.slice(7)))?.uid ?? null;
}

/** GET /api/saved-searches -> { savedSearches: SavedSearch[] }, newest first. */
export async function GET(request: NextRequest) {
  const userId = await userIdFrom(request);
  if (!userId) return response({ error: 'ログインが必要です' }, 401);
  try {
    return response({ savedSearches: await listSavedSearches(userId) });
  } catch (error) {
    console.error('[saved-searches] list failed:', error);
    return response({ error: '保存した条件を読み込めません' }, 503);
  }
}

/**
 * POST /api/saved-searches { name, query, filters, notify? } -> 201 { savedSearch }.
 * A person can keep 20 searches; the 21st is refused with 400.
 */
export async function POST(request: NextRequest) {
  const userId = await userIdFrom(request);
  if (!userId) return response({ error: 'ログインが必要です' }, 401);

  let input: SavedSearchInput;
  try {
    input = parseSavedSearchInput(await readJsonBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return response({ error: '送信内容が大きすぎます' }, 413);
    if (error instanceof SavedSearchValidationError) return response({ error: error.message }, 400);
    return response({ error: '保存する内容が正しくありません' }, 400);
  }

  try {
    const allowed = await consumeRequestRateLimit(request, 'saved-search-create', {
      limit: 60,
      windowMs: 60 * 60 * 1000,
      subject: userId,
    });
    if (!allowed) return response({ error: '短時間に保存しすぎです。しばらくしてからもう一度お試しください' }, 429);

    const result = await createSavedSearch(userId, input);
    if (result.status === 'limit') return response({ error: SAVED_SEARCH_LIMIT_MESSAGE, code: 'saved_search_limit' }, 400);
    return response({ savedSearch: result.savedSearch }, 201);
  } catch (error) {
    console.error('[saved-searches] create failed:', error);
    return response({ error: '条件を保存できません' }, 503);
  }
}
