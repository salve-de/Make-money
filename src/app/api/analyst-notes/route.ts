import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { executeD1, queryD1 } from '@/lib/storage/d1';
const headers = { 'Cache-Control': 'private, no-store' };
export const dynamic = 'force-dynamic';
async function owner(req: NextRequest) {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? verifyFirebaseIdToken(auth.slice(7)) : null;
}
export async function GET(req: NextRequest) {
  const user = await owner(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  try {
    const notes = await queryD1('SELECT entity_id AS entityId,content,updated_at AS updatedAt FROM analyst_notes WHERE user_id=? ORDER BY entity_id', [user.uid], (raw) => {
      const note = raw as Record<string, unknown>;
      if (typeof note.entityId !== 'string' || typeof note.content !== 'string' || typeof note.updatedAt !== 'string') throw new Error('Invalid note');
      return note;
    });
    return NextResponse.json({ uid: user.uid, notes: Object.fromEntries(notes.map((note) => [note.entityId, note])) }, { headers });
  } catch { return NextResponse.json({ error: 'メモを取得できません' }, { status: 503, headers }); }
}
export async function PUT(req: NextRequest) {
  const user = await owner(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });
  let input: unknown;
  try { input = await req.json(); } catch { return NextResponse.json({ error: 'Invalid note' }, { status: 400, headers }); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return NextResponse.json({ error: 'Invalid note' }, { status: 400, headers });
  const { entityId, content } = input as Record<string, unknown>;
  if (typeof entityId !== 'string' || !entityId.trim() || entityId.length > 200 || typeof content !== 'string' || content.length > 50_000) return NextResponse.json({ error: 'Invalid note' }, { status: 400, headers });
  try {
    const updatedAt = new Date().toISOString();
    const saved = await executeD1('INSERT INTO analyst_notes(user_id,entity_id,content,updated_at) VALUES(?,?,?,?) ON CONFLICT(user_id,entity_id) DO UPDATE SET content=excluded.content,updated_at=excluded.updated_at', [user.uid, entityId, content, updatedAt]);
    if (saved.changes !== 1) throw new Error('Note not saved');
    return NextResponse.json({ uid: user.uid, note: { entityId, content, updatedAt } }, { headers });
  } catch { return NextResponse.json({ error: 'メモを保存できません' }, { status: 503, headers }); }
}
