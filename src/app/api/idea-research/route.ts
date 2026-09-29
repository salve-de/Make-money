import { NextRequest, NextResponse } from 'next/server';
import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { readCachedLocalPublishableEntities } from '@/lib/company-access/local-entity-index';
import { summarizeIdea } from '@/lib/idea-research/ai-summary';
import { findSimilarCases } from '@/lib/idea-research/similar-cases';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { getRuntimeEnvValue } from '@/lib/runtime/cloudflare';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { checkIdeaInput, type IdeaResearchResponse, type IdeaResearchUnavailableReason } from '@/shared/idea-research';
import { compileParser } from '@/shared/validate-json';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;
const WINDOW_MS = 60 * 60 * 1000;
const ANONYMOUS_LIMIT = 20;
const SIGNED_IN_LIMIT = 60;
const NO_STORE = { 'Cache-Control': 'private, no-store' };

// 文字数（10〜1000、前後の空白を除く）は checkIdeaInput で数える。ここでは形と、極端に長い入力だけを止める。
const parseRequestShape = compileParser<{ idea: string }>({
  type: 'object',
  additionalProperties: false,
  required: ['idea'],
  properties: { idea: { type: 'string', maxLength: 4000 } },
}, 'idea research request');

function respond(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

async function readIdea(request: NextRequest): Promise<string> {
  const checked = checkIdeaInput(parseRequestShape(await readJsonBody(request, MAX_BODY_BYTES)).idea);
  if (!checked.ok) throw new Error('Idea length is out of range');
  return checked.idea;
}

/** 付いていない・検証できないトークンは未ログインとして扱う。似た事例の検索は誰でも使えるため、ここでは拒否しない。 */
async function signedInUserId(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  try {
    return (await verifyFirebaseIdToken(auth.slice(7)))?.uid ?? null;
  } catch {
    return null;
  }
}

type RateResult = 'allowed' | 'blocked' | 'unavailable';

async function consumeRate(request: NextRequest, uid: string | null): Promise<RateResult> {
  try {
    const allowed = uid
      ? await consumeRequestRateLimit(request, 'idea-research-user', { limit: SIGNED_IN_LIMIT, windowMs: WINDOW_MS, subject: uid })
      : await consumeRequestRateLimit(request, 'idea-research-anonymous', { limit: ANONYMOUS_LIMIT, windowMs: WINDOW_MS });
    return allowed ? 'allowed' : 'blocked';
  } catch {
    return 'unavailable';
  }
}

async function geminiKey(): Promise<string | undefined> {
  return await getRuntimeEnvValue('GEMINI_API_KEY') || await getRuntimeEnvValue('GOOGLE_GENERATIVE_AI_API_KEY');
}

type CaseList = IdeaResearchResponse['cases'];

async function aiResult(
  idea: string,
  cases: CaseList,
  uid: string | null,
  rate: RateResult,
): Promise<{ ai: IdeaResearchResponse['ai']; reason?: IdeaResearchUnavailableReason }> {
  if (!uid) return { ai: null, reason: 'LOGIN_REQUIRED' };
  // 回数を数えられない間は、費用がかかる AI を呼ばない。似た事例の検索は返す。
  if (rate !== 'allowed') return { ai: null, reason: 'FAILED' };
  const apiKey = await geminiKey();
  if (!apiKey) return { ai: null, reason: 'NOT_CONFIGURED' };
  try {
    return { ai: await summarizeIdea({ idea, cases, apiKey }) };
  } catch (error) {
    // アイデア本文や AI の応答は、個人が書いた内容を含むのでログに出さない。
    console.warn('[idea-research] AI summary failed:', error instanceof Error ? error.name : 'unknown');
    return { ai: null, reason: 'FAILED' };
  }
}

export async function POST(request: NextRequest) {
  let idea: string;
  try {
    idea = await readIdea(request);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return respond({ error: 'Request body is too large' }, 413);
    return respond({ error: 'Invalid idea research request' }, 400);
  }

  const uid = await signedInUserId(request);
  const rate = await consumeRate(request, uid);
  if (rate === 'blocked') {
    const retryAfter = Math.ceil((WINDOW_MS - (Date.now() % WINDOW_MS)) / 1000);
    return respond({ error: 'Too many requests' }, 429, { 'Retry-After': String(retryAfter) });
  }

  let cases: CaseList;
  try {
    cases = findSimilarCases(await readCachedLocalPublishableEntities(), idea);
  } catch {
    return respond({ error: 'Catalog temporarily unavailable' }, 503);
  }

  const { ai, reason } = await aiResult(idea, cases, uid, rate);
  const body: IdeaResearchResponse = ai ? { cases, ai } : { cases, ai: null, aiUnavailableReason: reason ?? 'FAILED' };
  return respond(body);
}
