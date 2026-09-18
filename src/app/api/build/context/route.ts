import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { createBuildSpec } from '@/lib/builder/spec';
import { loadOwnedIdea } from '@/lib/builder/idea';
import { getLatestBuildForIdea, publicBuildSession } from '@/lib/builder/session';
import { getV0ApiKey } from '@/lib/builder/v0';

export const dynamic = 'force-dynamic';

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(auth.slice(7)))?.uid ?? null;
}

export async function GET(request: NextRequest) {
  const userId = await userIdFrom(request);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const ideaId = request.nextUrl.searchParams.get('ideaId')?.trim() || '';
  if (!ideaId || ideaId.length > 128) return NextResponse.json({ error: 'Invalid idea id' }, { status: 400 });

  try {
    const idea = await loadOwnedIdea(userId, ideaId);
    if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 });

    const session = await getLatestBuildForIdea(userId, ideaId);
    return NextResponse.json({
      idea,
      buildSpec: session?.buildSpec ?? createBuildSpec(idea),
      session: session ? publicBuildSession(session) : null,
      providerConfigured: Boolean(await getV0ApiKey()),
    });
  } catch (error) {
    console.error('[builder/context] failed:', error);
    return NextResponse.json({ error: 'Builder state is temporarily unavailable' }, { status: 503 });
  }
}
