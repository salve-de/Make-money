import { NextRequest } from 'next/server';

import { outcomeResponse, readReviewTarget, requireReviewer, reviewJson } from '@/lib/marketplace/review-http';
import { approveReview } from '@/lib/marketplace/review-store';

export const dynamic = 'force-dynamic';

/** 運営者用: 審査待ちの掲載を承認して公開する。本文は { kind, id, revision }。URL は承認時に再検査する。 */
export async function POST(request: NextRequest) {
  try {
    const reviewer = await requireReviewer(request);
    if ('status' in reviewer) return reviewer;
    const target = await readReviewTarget(request, { reasonRequired: false });
    if (!target.ok) return target.response;
    const { kind, id, revision } = target.value;
    const outcome = await approveReview({ kind, id, revision, reviewerId: reviewer.uid });
    return outcomeResponse(outcome, { kind, id, status: 'published' });
  } catch (error) {
    console.error('[marketplace/reviews] approve failed:', error instanceof Error ? error.name : 'unknown');
    return reviewJson({ error: '承認できませんでした' }, 503);
  }
}
