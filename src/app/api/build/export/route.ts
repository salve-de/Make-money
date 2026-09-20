import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { getOwnedBuildSession } from '@/lib/builder/session';
import { downloadV0Source, getV0ApiKey } from '@/lib/builder/v0';

export const dynamic = 'force-dynamic';

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(auth.slice(7)))?.uid ?? null;
}

function safeFilename(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  return cleaned || 'make-money-build';
}

export async function GET(request: NextRequest) {
  const userId = await userIdFrom(request);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const sessionId = request.nextUrl.searchParams.get('sessionId')?.trim() || '';
  if (!sessionId || sessionId.length > 128) return NextResponse.json({ error: 'Invalid build session' }, { status: 400 });

  try {
    const session = await getOwnedBuildSession(userId, sessionId);
    if (!session) return NextResponse.json({ error: 'Build session not found' }, { status: 404 });
    if (session.status !== 'ready' || !session.providerChatId) {
      return NextResponse.json({ error: 'Build is not ready for export' }, { status: 409 });
    }

    const apiKey = await getV0ApiKey();
    if (!apiKey) return NextResponse.json({ error: 'Builder provider is not configured' }, { status: 503 });

    const upstream = await downloadV0Source(apiKey, session.providerChatId);
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/zip',
        'content-disposition': `attachment; filename="${safeFilename(session.buildSpec.productName)}.zip"`,
        'cache-control': 'private, no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('[builder/export] failed:', error);
    return NextResponse.json({ error: 'Source export failed' }, { status: 502 });
  }
}
