import { NextRequest, NextResponse } from 'next/server';
import { parseNewsletter, readInput } from '@/lib/api/input';
import { executeD1, queryD1 } from '@/lib/storage/d1';

export const dynamic = 'force-dynamic';
export async function POST(req: NextRequest) {
  const input = await readInput(req, parseNewsletter);
  if (!input) return NextResponse.json({ error: '有効なメールアドレスと送信元を入力してください' }, { status: 400 });
  try {
    const inserted = await executeD1('INSERT INTO newsletter_subscribers(id,email,source) VALUES(?,?,?) ON CONFLICT(email) DO NOTHING', [crypto.randomUUID(), input.email, input.source]);
    const rows = await queryD1('SELECT id,email FROM newsletter_subscribers WHERE email=?', [input.email]);
    if (rows.length !== 1 || typeof rows[0].id !== 'string' || rows[0].email !== input.email) throw new Error('Subscriber not persisted');
    return NextResponse.json({ success: true, subscriberId: rows[0].id, email: input.email,
      message: inserted.changes === 0 ? '既に登録済みのメールアドレスです。' : '週刊マネー速報の購読登録が完了しました' });
  } catch {
    return NextResponse.json({ error: '現在、購読登録を保存できません' }, { status: 503 });
  }
}
