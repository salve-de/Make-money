import { NextRequest } from 'next/server';

import { outcomeResponse, readReviewTarget, requireReviewer, reviewJson } from '@/lib/marketplace/review-http';
import { rejectReview } from '@/lib/marketplace/review-store';

export const dynamic = 'force-dynamic';

/** 運営者用: 審査待ちの掲載を却下する。本文は { kind, id, revision, reason }。理由は掲載者本人だけが見る。 */
export async function POST(request: NextRequest) {
  try {
    const reviewer = await requireReviewer(request);
    if ('status' in reviewer) return reviewer;
    const target = await readReviewTarget(request, { reasonRequired: true });
    if (!target.ok) return target.response;
    const { kind, id, revision, reason } = target.value;
    const outcome = await rejectReview({ kind, id, revision, reviewerId: reviewer.uid, reason: reason ?? '' });
    return outcomeResponse(outcome, { kind, id, status: 'rejected' });
  } catch (error) {
    console.error('[marketplace/reviews] reject failed:', error instanceof Error ? error.name : 'unknown');
    return reviewJson({ error: '却下できませんでした' }, 503);
  }
}
