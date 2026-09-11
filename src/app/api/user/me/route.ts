import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { executeD1, queryD1 } from '@/lib/storage/d1';
import { getProEntitlement } from '@/lib/payments/entitlement';

export const dynamic = 'force-dynamic';
const json = (body: unknown, init: { status?: number } = {}) => NextResponse.json(body, { ...init, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } });
interface UserRow { id: string; email: string; display_name: string | null; role: string }
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const user = auth?.startsWith('Bearer ') ? await verifyFirebaseIdToken(auth.slice(7)) : null;
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await executeD1('INSERT INTO users (id,email,display_name) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING', [user.uid, user.email || `${user.uid}@anon.example.com`, user.name || null]);
    const [profile] = await queryD1<UserRow>('SELECT id,email,display_name,role FROM users WHERE id = ?', [user.uid]);
    if (!profile || profile.id !== user.uid || typeof profile.email !== 'string'
      || (profile.display_name !== null && typeof profile.display_name !== 'string') || !['member', 'admin'].includes(profile.role)) throw new Error('User persistence unavailable');
    return json({ uid: profile.id, email: profile.email, displayName: profile.display_name, role: profile.role,
      isPro: await getProEntitlement(user.uid) });
  } catch { return json({ error: '会員情報を取得できません' }, { status: 503 }); }
}
