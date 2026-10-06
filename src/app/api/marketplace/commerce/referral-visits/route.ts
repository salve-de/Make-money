import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody } from '@/lib/api/input';
import { logCommerceFailure } from '@/lib/marketplace/commerce/http';
import { recordReferralVisit } from '@/lib/marketplace/commerce/store';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { parseVisitInput } from '@/shared/marketplace-commerce-input';

export const dynamic = 'force-dynamic';
const HEADERS = { 'Cache-Control': 'no-store' };

/** 紹介リンクを開いたことを数える（ログイン不要）。同じ日・同じ接続元は1回。数えなくても画面は動く。 */
export async function POST(request: NextRequest) {
  let code: string;
  try {
    const parsed = parseVisitInput(await readJsonBody(request, 1024));
    if (!parsed.ok) return NextResponse.json({ error: parsed.message }, { status: 400, headers: HEADERS });
    code = parsed.value.code;
  } catch {
    return NextResponse.json({ error: '送信内容を読み取れません' }, { status: 400, headers: HEADERS });
  }
  try {
    if (!await consumeRequestRateLimit(request, 'commerce-referral-visit', { limit: 60, windowMs: 60 * 60 * 1000 })) {
      return NextResponse.json({ error: '回数が上限に達しました' }, { status: 429, headers: HEADERS });
    }
    const clientKey = request.headers.get('cf-connecting-ip')?.trim() || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const known = await recordReferralVisit(code, clientKey);
    return NextResponse.json({ success: true, known }, { headers: HEADERS });
  } catch (error) {
    logCommerceFailure('referral-visit', error);
    return NextResponse.json({ error: '記録できませんでした' }, { status: 503, headers: HEADERS });
  }
}
