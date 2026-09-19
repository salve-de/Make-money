import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { executeD1 } from '@/lib/storage/d1';
import { parseSynthesizedIdeas } from '@/shared/strategy-schema';

export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 32 * 1024;

function parseBody(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => key !== 'idea') || !row.idea) throw new Error('Invalid request');
  return parseSynthesizedIdeas([row.idea])[0];
}

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(auth.slice(7)))?.uid ?? null;
}

export async function POST(request: NextRequest) {
  let idea;
  try {
    idea = parseBody(await readJsonBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    return NextResponse.json({ error: 'Invalid idea payload' }, { status: 400 });
  }

  const userId = await userIdFrom(request);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const allowed = await consumeRequestRateLimit(request, 'builder-prepare', {
      limit: 60,
      windowMs: 60 * 60 * 1000,
      subject: userId,
    });
    if (!allowed) return NextResponse.json({ error: 'Save limit reached' }, { status: 429 });

    const result = await executeD1(
      `INSERT INTO synthesized_ideas(id,user_id,payload) VALUES(?,?,?)
       ON CONFLICT(user_id,id) DO UPDATE SET payload=excluded.payload`,
      [idea.id, userId, JSON.stringify(idea)],
    );
    if (result.changes !== 1) return NextResponse.json({ error: 'Idea could not be saved' }, { status: 503 });
    return NextResponse.json({ success: true, ideaId: idea.id });
  } catch (error) {
    console.error('[builder/prepare] failed:', error);
    return NextResponse.json({ error: 'Idea could not be prepared for building' }, { status: 503 });
  }
}
