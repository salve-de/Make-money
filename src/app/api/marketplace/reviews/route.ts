import { NextRequest } from 'next/server';

import { requireReviewer, reviewJson } from '@/lib/marketplace/review-http';
import { listPendingReviews } from '@/lib/marketplace/review-store';

export const dynamic = 'force-dynamic';

/**
 * 運営者用: 審査待ちの掲載の一覧（申請が古い順、最大50件）。?kind=listing|business で種類を絞れる。
 * 返す revision を、承認・却下の本文にそのまま付ける。
 */
export async function GET(request: NextRequest) {
  try {
    const reviewer = await requireReviewer(request);
    if ('status' in reviewer) return reviewer;
    const kind = request.nextUrl.searchParams.get('kind');
    if (kind !== null && kind !== 'listing' && kind !== 'business') {
      return reviewJson({ error: 'kind は listing か business を指定してください' }, 400);
    }
    return reviewJson({ success: true, reviews: await listPendingReviews(kind ?? undefined) });
  } catch (error) {
    console.error('[marketplace/reviews] list failed:', error instanceof Error ? error.name : 'unknown');
    return reviewJson({ error: '審査待ちを読み込めません' }, 503);
  }
}
