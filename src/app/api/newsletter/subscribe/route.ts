import { NextRequest, NextResponse } from 'next/server';
import { parseNewsletter, parseNewsletterUnsubscribe, readInput } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { executeD1, queryD1 } from '@/lib/storage/d1';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';

export const dynamic = 'force-dynamic';
async function hashUnsubscribeToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function optionalUser(req: NextRequest) {
  const authorization = req.headers.get('authorization');
  if (!authorization) return null;
  if (!authorization.startsWith('Bearer ')) throw new Error('Invalid authorization');
  const user = await verifyFirebaseIdToken(authorization.slice(7));
  if (!user) throw new Error('Invalid authorization');
  return user;
}

export async function POST(req: NextRequest) {
  const input = await readInput(req, parseNewsletter);
  if (!input) return NextResponse.json({ error: '有効なメールアドレスと送信元を入力してください' }, { status: 400 });
  let user: Awaited<ReturnType<typeof optionalUser>>;
  try {
    user = await optionalUser(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    if (!user && !await consumeRequestRateLimit(req, 'newsletter-subscribe')) {
      return NextResponse.json({ error: 'しばらく待ってから再試行してください' }, { status: 429 });
    }
    const unsubscribeToken = crypto.randomUUID();
    const tokenHash = await hashUnsubscribeToken(unsubscribeToken);
    await executeD1(`INSERT INTO newsletter_subscribers(id,email,source,user_id,unsubscribe_token_hash)
      VALUES(?,?,?,?,?)
      ON CONFLICT(email) DO UPDATE SET source=excluded.source, user_id=COALESCE(newsletter_subscribers.user_id, excluded.user_id),
      status='active', unsubscribe_token_hash=excluded.unsubscribe_token_hash`,
      [crypto.randomUUID(), input.email, input.source, user?.uid ?? null, tokenHash]);
    const rows = await queryD1('SELECT id,status FROM newsletter_subscribers WHERE email=?', [input.email]);
    if (rows.length !== 1 || typeof rows[0].id !== 'string' || rows[0].status !== 'active') throw new Error('Subscriber not persisted');
    // Do not echo the email or whether it was previously registered. The
    // token is the only deletion credential and is returned once to the caller.
    return NextResponse.json({ success: true, message: '購読登録を受け付けました', unsubscribeToken });
  } catch {
    return NextResponse.json({ error: '現在、購読登録を保存できません' }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  let user: Awaited<ReturnType<typeof optionalUser>>;
  try {
    user = await optionalUser(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const input = await readInput(req, parseNewsletterUnsubscribe);
  if (!user && !input) return NextResponse.json({ error: '購読解除トークンが必要です' }, { status: 400 });
  try {
    if (user) {
      await executeD1('DELETE FROM newsletter_subscribers WHERE user_id=?', [user.uid]);
    } else {
      await executeD1('DELETE FROM newsletter_subscribers WHERE unsubscribe_token_hash=?', [await hashUnsubscribeToken(input!.unsubscribeToken)]);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: '現在、購読解除を保存できません' }, { status: 503 });
  }
}
