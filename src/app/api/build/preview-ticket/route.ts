import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { getOwnedBuildSession, rotatePreviewToken } from '@/lib/builder/session';
import { ensureV0PreviewHost, getV0ApiKey } from '@/lib/builder/v0';

export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 8 * 1024;
const COOKIE_NAME = 'mm_builder_preview';

function parseBody(value: unknown): { sessionId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => key !== 'sessionId') || typeof row.sessionId !== 'string') throw new Error('Invalid request');
  const sessionId = row.sessionId.trim();
  if (!sessionId || sessionId.length > 128) throw new Error('Invalid request');
  return { sessionId };
}

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(auth.slice(7)))?.uid ?? null;
}

export async function POST(request: NextRequest) {
  let body: { sessionId: string };
  try {
    body = parseBody(await readJsonBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    return NextResponse.json({ error: 'Invalid preview request' }, { status: 400 });
  }

  const userId = await userIdFrom(request);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const allowed = await consumeRequestRateLimit(request, 'builder-preview-ticket', {
      limit: 120,
      windowMs: 60 * 60 * 1000,
      subject: userId,
    });
    if (!allowed) return NextResponse.json({ error: 'Preview refresh limit reached' }, { status: 429 });

    const session = await getOwnedBuildSession(userId, body.sessionId);
    if (!session) return NextResponse.json({ error: 'Build session not found' }, { status: 404 });
    if (session.status !== 'ready' || !session.providerChatId) {
      return NextResponse.json({ error: 'Build preview is not ready' }, { status: 409 });
    }

    const apiKey = await getV0ApiKey();
    if (!apiKey) return NextResponse.json({ error: 'Builder provider is not configured', code: 'V0_NOT_CONFIGURED' }, { status: 503 });

    await ensureV0PreviewHost(apiKey, request.nextUrl.hostname);
    const token = await rotatePreviewToken(userId, session.id);
    const path = `/api/build/preview/${encodeURIComponent(session.id)}`;

    const response = NextResponse.json({ success: true, src: path });
    response.cookies.set(COOKIE_NAME, `${session.id}.${token}`, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path,
      maxAge: 30 * 60,
    });
    response.headers.set('cache-control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('[builder/preview-ticket] failed:', error);
    return NextResponse.json({ error: 'Preview could not be authorized' }, { status: 502 });
  }
}
