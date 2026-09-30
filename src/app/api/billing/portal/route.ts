import { NextResponse } from 'next/server';
import { getStripeClient } from '@/lib/stripe';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { findManageableSubscription } from '@/lib/payments/billing';
import { stripeId } from '@/lib/payments/provider-state';

export const dynamic = 'force-dynamic';
const json = (body: unknown, init: { status?: number } = {}) => NextResponse.json(body, { ...init, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } });

/** 本人の契約の Stripe 管理画面（支払い方法の変更・解約）へ移動するための、短時間だけ有効な URL を作る。 */
export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const user = authorization?.startsWith('Bearer ') ? await verifyFirebaseIdToken(authorization.slice(7)) : null;
  if (!user) return json({ error: 'ログインしてください' }, { status: 401 });
  try {
    const stripe = await getStripeClient();
    if (!stripe) return json({ error: '契約の管理画面をいまは開けません' }, { status: 503 });
    // 台帳で本人に結び付いた契約だけが対象。他人の契約や、メールアドレスの一致では開かない。
    const subscription = await findManageableSubscription(user.uid);
    if (!subscription) return json({ error: '管理できる契約が見つかりません' }, { status: 404 });
    const customer = stripeId(subscription.customer);
    if (!customer) throw new Error('Subscription customer unavailable');
    const appUrl = await getRuntimeEnvValue('NEXT_PUBLIC_APP_URL') || new URL(request.url).origin;
    const session = await stripe.billingPortal.sessions.create({ customer, return_url: `${appUrl}/` });
    if (!session.url) throw new Error('Portal URL was not created');
    return json({ url: session.url });
  } catch {
    console.error('Billing portal session creation failed');
    return json({ error: '契約の管理画面を開けませんでした。時間をおいて再度お試しください' }, { status: 503 });
  }
}
