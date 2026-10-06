import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { queryD1 } from '@/lib/storage/d1';
import { REVIEW_NOTE_MAX_LENGTH } from '@/shared/marketplace-listing';
import type { ReviewKind, ReviewOutcome } from './review-store';

/** 運営者用の審査 API の共通部分。応答は常に共有キャッシュへ載せない。 */
const HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } as const;
const BODY_LIMIT_BYTES = 4 * 1024;

export function reviewJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: HEADERS });
}

/**
 * 運営者だけを通す。方式は /api/entities/approve と同じで、Firebase ID トークンの uid が
 * users.role = 'admin' であること。トークンなし・無効は 401、運営者でなければ 403。
 * 返り値が Response のときは、そのまま返す。
 */
export async function requireReviewer(request: NextRequest): Promise<{ uid: string } | NextResponse> {
  const origin = request.headers.get('origin');
  if (origin !== null && origin !== request.nextUrl.origin) return reviewJson({ error: '別のサイトからの審査操作は受け付けません' }, 403);

  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return reviewJson({ error: 'ログインが必要です' }, 401);
  const user = await verifyFirebaseIdToken(authorization.slice(7));
  if (!user) return reviewJson({ error: 'ログインが必要です' }, 401);

  const roles = await queryD1<{ role: string }>('SELECT role FROM users WHERE id = ?', [user.uid], (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid user role');
    const role = (value as Record<string, unknown>).role;
    if (role !== 'member' && role !== 'admin') throw new Error('Invalid user role');
    return { role };
  });
  if (roles[0]?.role !== 'admin') return reviewJson({ error: '運営者だけが使えます' }, 403);
  return { uid: user.uid };
}

export interface ReviewTargetInput {
  kind: ReviewKind;
  id: string;
  revision: number;
  reason?: string;
}

const UNSAFE_REASON = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff]/;

/** 承認・却下の本文を読む。reason は却下のときだけ必須（短文・制御文字なし）。 */
export async function readReviewTarget(
  request: NextRequest,
  options: { reasonRequired: boolean },
): Promise<{ ok: true; value: ReviewTargetInput } | { ok: false; response: NextResponse }> {
  let body: unknown;
  try {
    body = await readJsonBody(request, BODY_LIMIT_BYTES);
  } catch (error) {
    return error instanceof RequestBodyTooLargeError
      ? { ok: false, response: reviewJson({ error: '送信内容が大きすぎます' }, 413) }
      : { ok: false, response: reviewJson({ error: '送信内容を読み取れません' }, 400) };
  }
  const bad = (error: string) => ({ ok: false as const, response: reviewJson({ error }, 400) });
  if (!body || typeof body !== 'object' || Array.isArray(body)) return bad('送信内容が正しくありません');
  const row = body as Record<string, unknown>;
  const allowed = options.reasonRequired ? ['kind', 'id', 'revision', 'reason'] : ['kind', 'id', 'revision'];
  if (Object.keys(row).some((key) => !allowed.includes(key))) return bad('指定できない項目が含まれています');
  if (row.kind !== 'listing' && row.kind !== 'business') return bad('kind は listing か business を指定してください');
  if (typeof row.id !== 'string' || row.id.length === 0 || row.id.length > 128) return bad('id が正しくありません');
  if (typeof row.revision !== 'number' || !Number.isSafeInteger(row.revision) || row.revision < 0) {
    return bad('revision は審査待ち一覧で返した値をそのまま指定してください');
  }
  let reason: string | undefined;
  if (options.reasonRequired) {
    reason = typeof row.reason === 'string' ? row.reason.trim() : '';
    if (reason.length === 0) return bad('却下の理由を入力してください');
    if (Array.from(reason).length > REVIEW_NOTE_MAX_LENGTH) return bad(`却下の理由は${REVIEW_NOTE_MAX_LENGTH}文字以内にしてください`);
    if (UNSAFE_REASON.test(reason)) return bad('却下の理由に使えない文字が含まれています');
  }
  return { ok: true, value: { kind: row.kind, id: row.id, revision: row.revision, reason } };
}

/** ストアの結果を HTTP の応答にする。 */
export function outcomeResponse(outcome: ReviewOutcome, success: Record<string, unknown>): NextResponse {
  switch (outcome.kind) {
    case 'done': return reviewJson({ success: true, ...success });
    case 'not_found': return reviewJson({ error: '掲載が見つかりません' }, 404);
    case 'conflict': return reviewJson({ error: '審査待ちではないか、読んだ後に掲載者が内容を変えました。一覧を読み込み直してください' }, 409);
    case 'invalid_url': return reviewJson({ error: 'URL の検査に通りません（https のみ。ローカル・プライベートIP・認証情報つきは不可）。承認していません', field: outcome.field }, 422);
  }
}
