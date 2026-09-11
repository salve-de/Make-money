import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { parseBookmark, readInput } from '@/lib/api/input';
import { queryD1 } from '@/lib/storage/d1';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
async function authenticated(req: NextRequest) {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? verifyFirebaseIdToken(auth.slice(7)) : null;
}
export async function GET(req: NextRequest) {
  const user = await authenticated(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  try {
    const saved = await queryD1('SELECT user_id AS userId,item_type AS itemType,item_id AS itemId,created_at AS createdAt FROM bookmarks WHERE user_id=? AND saved=1 ORDER BY created_at DESC', [user.uid], (row) => {
      const value = row as Record<string, unknown>;
      if (value.userId !== user.uid || !['business','idea','signal'].includes(String(value.itemType)) || typeof value.itemId !== 'string' || typeof value.createdAt !== 'string') throw new Error('Invalid saved record');
      return value;
    });
    return NextResponse.json({ saved }, { headers });
  } catch {
    return NextResponse.json({ error: '現在、保存済み一覧を取得できません' }, { status: 503, headers });
  }
}
export async function POST(req: NextRequest) {
  const user = await authenticated(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  const input = await readInput(req, parseBookmark);
  if (!input) return NextResponse.json({ error: 'Invalid bookmark parameters' }, { status: 400, headers });
  try {
    const rows = await queryD1('INSERT INTO bookmarks(user_id,item_type,item_id,saved) VALUES(?,?,?,1) ON CONFLICT(user_id,item_type,item_id) DO UPDATE SET saved=1-bookmarks.saved,updated_at=CURRENT_TIMESTAMP RETURNING saved', [user.uid, input.itemType, input.itemId]);
    if (rows.length !== 1 || (rows[0].saved !== 0 && rows[0].saved !== 1)) throw new Error('Bookmark not saved');
    return NextResponse.json({ success: true, saved: rows[0].saved === 1 }, { headers });
  } catch {
    return NextResponse.json({ error: 'ブックマークを保存できません。再度お試しください' }, { status: 503, headers });
  }
}
