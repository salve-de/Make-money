import { NextResponse } from 'next/server';

import { logCommerceFailure } from '@/lib/marketplace/commerce/http';
import { DistributionError } from '@/lib/marketplace/distribution/contract';
import { referralDestination } from '@/lib/marketplace/distribution/service';

export const dynamic = 'force-dynamic';

/** SellRelay 経由の紹介リンク。確かめた作者の申込み先へだけ送る。確かめられなければ移動しない。 */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const destination = await referralDestination((await params).code);
    return new NextResponse(null, {
      status: 303,
      headers: { Location: destination, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' },
    });
  } catch (error) {
    if (!(error instanceof DistributionError)) logCommerceFailure('distribution-go', error);
    const status = error instanceof DistributionError ? error.status : 503;
    return new NextResponse('紹介リンクを確認できませんでした。掲載ページからやり直してください。', {
      status,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store' },
    });
  }
}
