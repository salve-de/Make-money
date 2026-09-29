import { NextResponse } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';

/** 事業の売買 API の共通部分。route.ts からは handler 以外を export できないので、ここに置く。 */
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } as const;
/** 公開一覧・公開詳細。掲載を非公開にした後も、共有キャッシュに残るのは最長でも1分半程度。 */
const PUBLIC_HEADERS = { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' } as const;
const NO_STORE_HEADERS = { 'Cache-Control': 'no-store' } as const;

/** 売り手・買い手が送る JSON の上限。上限内の全項目でも 10KB に届かない。 */
export const BUSINESS_SALE_BODY_LIMIT_BYTES = 16 * 1024;

/** 本人向け（ログインが必要）な応答。常に共有キャッシュへ載せない。 */
export function privateJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

/** 認証なしで読める応答。短時間だけ共有キャッシュしてよい。 */
export function publicJson(body: unknown): NextResponse {
  return NextResponse.json(body, { headers: PUBLIC_HEADERS });
}

/** 認証なしの API の失敗。エラーはキャッシュしない。 */
export function publicError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status, headers: NO_STORE_HEADERS });
}

/** Authorization: Bearer <Firebase ID トークン> から検証済みの uid を取り出す。 */
export async function authenticatedUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(authorization.slice(7)))?.uid ?? null;
}

export type BodyResult = { ok: true; value: unknown } | { ok: false; response: NextResponse };

/** 本文を上限付きで読む。大きすぎれば 413、読めなければ 400。 */
export async function readBusinessSaleBody(request: Request): Promise<BodyResult> {
  try {
    return { ok: true, value: await readJsonBody(request, BUSINESS_SALE_BODY_LIMIT_BYTES) };
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return { ok: false, response: privateJson({ error: '送信内容が大きすぎます' }, 413) };
    }
    return { ok: false, response: privateJson({ error: '送信内容を読み取れません' }, 400) };
  }
}

/** 失敗の中身（DB のエラー文など）はログに残さず、種類だけ残す。 */
export function logBusinessSaleFailure(operation: string, error: unknown): void {
  console.error(`[business-sale] ${operation} failed:`, error instanceof Error ? error.name : 'unknown');
}
