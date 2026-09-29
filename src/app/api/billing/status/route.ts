import { NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { getBillingStatus } from '@/lib/payments/billing';

export const dynamic = 'force-dynamic';
const json = (body: unknown, init: { status?: number } = {}) => NextResponse.json(body, { ...init, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } });

/** ログイン中の本人の契約状態。台帳か Stripe が読めないときは、権利を推測せず 503 を返す。 */
export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  const user = authorization?.startsWith('Bearer ') ? await verifyFirebaseIdToken(authorization.slice(7)) : null;
  if (!user) return json({ error: 'ログインしてください' }, { status: 401 });
  try { return json(await getBillingStatus(user.uid)); }
  catch {
    console.error('Billing status unavailable');
    return json({ error: '契約状況を確認できません。時間をおいて再度お試しください' }, { status: 503 });
  }
}
