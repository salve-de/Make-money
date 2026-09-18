import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { loadOwnedIdea } from '@/lib/builder/idea';
import { createBuildSpec, renderBuildPrompt } from '@/lib/builder/spec';
import {
  createBuildSession,
  getLatestBuildForIdea,
  markBuildError,
  markBuildReady,
  publicBuildSession,
} from '@/lib/builder/session';
import { createV0Chat, getV0ApiKey } from '@/lib/builder/v0';

export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 8 * 1024;

function parseBody(value: unknown): { ideaId: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => key !== 'ideaId')) throw new Error('Invalid request');
  if (typeof row.ideaId !== 'string') throw new Error('Invalid request');
  const ideaId = row.ideaId.trim();
  if (!ideaId || ideaId.length > 128) throw new Error('Invalid request');
  return { ideaId };
}

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(auth.slice(7)))?.uid ?? null;
}

export async function POST(request: NextRequest) {
  let body: { ideaId: string };
  try {
    body = parseBody(await readJsonBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    return NextResponse.json({ error: 'Invalid build request' }, { status: 400 });
  }

  const userId = await userIdFrom(request);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const allowed = await consumeRequestRateLimit(request, 'builder-start', {
      limit: 6,
      windowMs: 60 * 60 * 1000,
      subject: userId,
    });
    if (!allowed) return NextResponse.json({ error: 'Build limit reached. Try again later.' }, { status: 429 });

    const idea = await loadOwnedIdea(userId, body.ideaId);
    if (!idea) return NextResponse.json({ error: 'Idea not found' }, { status: 404 });

    const existing = await getLatestBuildForIdea(userId, body.ideaId);
    if (existing && (existing.status === 'ready' || existing.status === 'generating')) {
      return NextResponse.json({ success: true, reused: true, session: publicBuildSession(existing), buildSpec: existing.buildSpec });
    }

    const apiKey = await getV0ApiKey();
    const buildSpec = createBuildSpec(idea);
    if (!apiKey) {
      return NextResponse.json({
        error: 'Builder provider is not configured',
        code: 'V0_NOT_CONFIGURED',
        buildSpec,
      }, { status: 503 });
    }

    const session = await createBuildSession(userId, body.ideaId, buildSpec);
    try {
      const result = await createV0Chat(apiKey, {
        title: buildSpec.productName,
        message: renderBuildPrompt(buildSpec),
        systemPrompt: [
          'You are the execution engine behind Make-Money Builder.',
          'Build a lawful, working MVP from the supplied Build Spec.',
          'Never hardcode secrets, credentials, or production tokens.',
          'Do not fabricate customer counts, revenue, reviews, or success claims.',
          'Do not implement spam, impersonation, deceptive acquisition, unauthorized scraping, or bypasses of third-party rules.',
          'Prefer a compact, operable MVP over broad unfinished functionality.',
        ].join(' '),
        metadata: { makeMoneySessionId: session.id, sourceIdeaId: body.ideaId },
      });
      await markBuildReady(userId, session.id, result.chatId, result.usage.creditsCost);
      const persisted = await getLatestBuildForIdea(userId, body.ideaId);
      if (!persisted || persisted.id !== session.id) throw new Error('Build session verification failed');
      return NextResponse.json({
        success: true,
        reused: false,
        session: publicBuildSession(persisted),
        buildSpec,
        generation: { model: result.usage.model, tokensTotal: result.usage.tokensTotal, creditsCost: result.usage.creditsCost },
      }, { status: 201 });
    } catch (error) {
      await markBuildError(userId, session.id, error instanceof Error ? error.message : 'Provider generation failed').catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error('[builder/start] failed:', error);
    return NextResponse.json({ error: 'The app could not be generated' }, { status: 502 });
  }
}
