import { NextResponse } from 'next/server';

import { getLatestVerification } from '@/lib/verification/store';
import type { VerificationErrorResponse, VerificationLookupResponse } from '@/shared/verification';

export const dynamic = 'force-dynamic';

const MAX_ENTITY_ID_LENGTH = 200;
const publicHeaders = { 'Cache-Control': 'public, max-age=30, must-revalidate' };
const errorHeaders = { 'Cache-Control': 'no-store' };

function respond(body: VerificationLookupResponse | VerificationErrorResponse, status: number, headers: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

/** 事例ごとの最新の確認結果。公開情報なので認証は要らない。 */
export async function GET(request: Request) {
  const entityId = new URL(request.url).searchParams.get('entity_id')?.trim() ?? '';
  if (!entityId || entityId.length > MAX_ENTITY_ID_LENGTH) {
    return respond({ error: '事例IDを指定してください', code: 'invalid_request' }, 400, errorHeaders);
  }
  try {
    return respond({ verification: await getLatestVerification(entityId) }, 200, publicHeaders);
  } catch (error) {
    console.error('[verification] lookup failed:', error instanceof Error ? error.name : 'unknown');
    return respond({ error: '確認結果をいま取得できません', code: 'unavailable' }, 503, errorHeaders);
  }
}
