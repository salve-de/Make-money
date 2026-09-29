import { NextRequest } from 'next/server';

import { authenticatedUserId, logBusinessSaleFailure, privateJson } from '@/lib/marketplace/business-http';
import { listOwnedBusinessSalesWithInquiries } from '@/lib/marketplace/business-store';

export const dynamic = 'force-dynamic';

/** 自分の掲載と、それぞれに届いた問い合わせ（自分の掲載分だけ）。 */
export async function GET(request: NextRequest) {
  const userId = await authenticatedUserId(request);
  if (!userId) return privateJson({ error: 'ログインが必要です' }, 401);
  try {
    return privateJson({ success: true, listings: await listOwnedBusinessSalesWithInquiries(userId) });
  } catch (error) {
    logBusinessSaleFailure('mine', error);
    return privateJson({ error: '自分の掲載を読み込めません' }, 503);
  }
}
