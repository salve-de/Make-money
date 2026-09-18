import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { addBuildUsage, getOwnedBuildSession, publicBuildSession } from '@/lib/builder/session';
import { getV0ApiKey, sendV0Message } from '@/lib/builder/v0';
import { getBuilderCreditBudget } from '@/lib/builder/budget';

export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 12 * 1024;

function parseBody(value: unknown): { sessionId: string; message: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request');
  const row = value as Record<string, unknown>;
  if (Object.keys(row).some((key) => key !== 'sessionId' && key !== 'message')) throw new Error('Invalid request');
  if (typeof row.sessionId !== 'string' || typeof row.message !== 'string') throw new Error('Invalid request');
  const sessionId = row.sessionId.trim();
  const message = row.message.trim();
  if (!sessionId || sessionId.length > 128 || !message || message.length > 4000) throw new Error('Invalid request');
  return { sessionId, message };
}

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(auth.slice(7)))?.uid ?? null;
}

export async function POST(request: NextRequest) {
  let body: { sessionId: string; message: string };
  try {
    body = parseBody(await readJsonBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'Request body is too large' }, { status: 413 });
    return NextResponse.json({ error: 'Invalid builder message' }, { status: 400 });
  }

  const userId = await userIdFrom(request);
  if (!userId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  try {
    const allowed = await consumeRequestRateLimit(request, 'builder-message', {
      limit: 40,
      windowMs: 60 * 60 * 1000,
      subject: userId,
    });
    if (!allowed) return NextResponse.json({ error: 'Message limit reached. Try again later.' }, { status: 429 });

    const session = await getOwnedBuildSession(userId, body.sessionId);
    if (!session) return NextResponse.json({ error: 'Build session not found' }, { status: 404 });
    if (session.status !== 'ready' || !session.providerChatId) {
      return NextResponse.json({ error: 'Build is not ready for changes' }, { status: 409 });
    }

    const budget = await getBuilderCreditBudget(userId);
    if (budget.remaining <= 0) {
      return NextResponse.json({ error: 'Daily builder credit limit reached', code: 'BUILDER_CREDIT_LIMIT', budget }, { status: 429 });
    }

    const apiKey = await getV0ApiKey();
    if (!apiKey) return NextResponse.json({ error: 'Builder provider is not configured', code: 'V0_NOT_CONFIGURED' }, { status: 503 });

    const result = await sendV0Message(apiKey, session.providerChatId, body.message);
    await addBuildUsage(userId, session.id, result.usage.creditsCost);
    const updated = await getOwnedBuildSession(userId, session.id);
    if (!updated) throw new Error('Updated build session could not be read');

    return NextResponse.json({
      success: true,
      message: { id: result.messageId, content: result.content },
      generation: result.usage,
      session: publicBuildSession(updated),
      budget: await getBuilderCreditBudget(userId),
    });
  } catch (error) {
    console.error('[builder/message] failed:', error);
    return NextResponse.json({ error: 'The requested change could not be generated' }, { status: 502 });
  }
}
