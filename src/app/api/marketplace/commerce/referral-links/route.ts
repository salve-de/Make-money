import { NextRequest } from 'next/server';

import { logCommerceFailure, privateJson, readCommerceWrite } from '@/lib/marketplace/commerce/http';
import { getOrCreateReferralLink } from '@/lib/marketplace/commerce/store';
import { parseSlugInput } from '@/shared/marketplace-commerce-input';

export const dynamic = 'force-dynamic';

/** 自分用の紹介リンク（掲載ごとに1本）を取得または作成する。出品者本人は作れない。 */
export async function POST(request: NextRequest) {
  const input = await readCommerceWrite(request, parseSlugInput, { scope: 'commerce-referral-link', limit: 30, windowMs: 60 * 60 * 1000 });
  if (!input.ok) return input.response;
  try {
    const result = await getOrCreateReferralLink(input.userId, input.value.slug);
    if (!result.ok) {
      return result.reason === 'own_listing'
        ? privateJson({ error: '自分の掲載には紹介リンクを作れません' }, 409)
        : privateJson({ error: 'この掲載は紹介できません（公開されていないか、販売が止まっています）' }, 404);
    }
    return privateJson({ success: true, code: result.code, path: `/marketplace/${result.listingSlug}?ref=${result.code}` });
  } catch (error) {
    logCommerceFailure('referral-link', error);
    return privateJson({ error: '紹介リンクを作れませんでした' }, 503);
  }
}
