import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { parseSavedSearchPatch, SavedSearchValidationError } from '@/lib/saved-searches/input';
import { deleteSavedSearch, updateSavedSearch } from '@/lib/saved-searches/store';
import type { SavedSearchPatch } from '@/shared/saved-search';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const MAX_BODY_BYTES = 4 * 1024;
const NOT_FOUND = '条件が見つかりません';
// Ids are UUIDs we issued. Anything else cannot be ours, so answer "not found" without touching the database.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function response(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers });
}

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(authorization.slice(7)))?.uid ?? null;
}

/**
 * PATCH /api/saved-searches/[id] { name?, notify? } -> { savedSearch }.
 * Someone else's search and a missing one both answer 404, so ids cannot be probed.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const userId = await userIdFrom(request);
  if (!userId) return response({ error: 'ログインが必要です' }, 401);
  const { id } = await context.params;
  if (!ID_PATTERN.test(id)) return response({ error: NOT_FOUND }, 404);

  let patch: SavedSearchPatch;
  try {
    patch = parseSavedSearchPatch(await readJsonBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return response({ error: '送信内容が大きすぎます' }, 413);
    if (error instanceof SavedSearchValidationError) return response({ error: error.message }, 400);
    return response({ error: '変更する内容が正しくありません' }, 400);
  }

  try {
    const savedSearch = await updateSavedSearch(userId, id, patch);
    if (!savedSearch) return response({ error: NOT_FOUND }, 404);
    return response({ savedSearch });
  } catch (error) {
    console.error('[saved-searches] update failed:', error);
    return response({ error: '条件を変更できません' }, 503);
  }
}

/** DELETE /api/saved-searches/[id] -> { success: true }. */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const userId = await userIdFrom(request);
  if (!userId) return response({ error: 'ログインが必要です' }, 401);
  const { id } = await context.params;
  if (!ID_PATTERN.test(id)) return response({ error: NOT_FOUND }, 404);

  try {
    if (!await deleteSavedSearch(userId, id)) return response({ error: NOT_FOUND }, 404);
    return response({ success: true });
  } catch (error) {
    console.error('[saved-searches] delete failed:', error);
    return response({ error: '条件を削除できません' }, 503);
  }
}
