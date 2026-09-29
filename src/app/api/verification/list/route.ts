import { NextResponse } from 'next/server';

import { listVerifiedEntities } from '@/lib/verification/store';
import type { VerificationListResponse } from '@/shared/verification';

export const dynamic = 'force-dynamic';

const publicHeaders = { 'Cache-Control': 'public, max-age=30, must-revalidate' };
const errorHeaders = { 'Cache-Control': 'no-store' };

function respond(body: VerificationListResponse, status: number, headers: Record<string, string>) {
  return NextResponse.json(body, { status, headers });
}

/** 確認済みの事例と、その最新の確認時刻（新しい順）。公開情報なので認証は要らない。 */
export async function GET() {
  try {
    return respond({ verified: await listVerifiedEntities() }, 200, publicHeaders);
  } catch (error) {
    console.error('[verification/list] lookup failed:', error instanceof Error ? error.name : 'unknown');
    // 印は一覧の飾りなので、読めないときは印を出さないだけにする（全画面でブラウザにエラーを出さない）。
    return respond({ verified: [], unavailable: true }, 200, errorHeaders);
  }
}
