import { NextResponse } from 'next/server';
import { getStripeClient, paymentLiveMode } from '@/lib/stripe';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { isPaidFoundingPass } from '@/lib/payments/founding-pass';
import { stripeId, chargeStillEntitled } from '@/lib/payments/provider-state';
import { getProEntitlement } from '@/lib/payments/entitlement';

export const dynamic = 'force-dynamic';
const json = (body: unknown, init: { status?: number } = {}) => NextResponse.json(body, { ...init, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } });
export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const user = authorization?.startsWith('Bearer ') ? await verifyFirebaseIdToken(authorization.slice(7)) : null;
  if (!user) return json({ error: '購入したアカウントでログインしてください' }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.sessionId !== 'string' || !/^cs_[a-zA-Z0-9_]{1,200}$/.test(body.sessionId)) return json({ error: '決済情報を確認できません' }, { status: 400 });
  const stripe = await getStripeClient();
  if (!stripe) return json({ error: '決済の確認を一時的に利用できません' }, { status: 503 });
  try {
    const session = await stripe.checkout.sessions.retrieve(body.sessionId);
    if (session.client_reference_id !== user.uid || session.metadata?.userId !== user.uid || session.livemode !== await paymentLiveMode()) return json({ error: '決済情報を確認できません' }, { status: 403 });
    if (!isPaidFoundingPass(session)) return json({ status: 'unpaid' });
    const intentId = stripeId(session.payment_intent);
    const chargeId = intentId ? stripeId((await stripe.paymentIntents.retrieve(intentId)).latest_charge) : null;
    if (!chargeId) throw new Error('Payment charge unavailable');
    if (!await chargeStillEntitled(stripe, chargeId)) return json({ status: 'revoked' });
    return json({ status: await getProEntitlement(user.uid) ? 'confirmed' : 'pending' });
  } catch {
    return json({ error: '決済情報を確認できません。時間をおいて再確認してください' }, { status: 503 });
  }
}
