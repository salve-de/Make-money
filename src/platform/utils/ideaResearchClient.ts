import type { SynthesizedIdea } from '@/shared/terminal';
import { parseIdeaResearchResponse, type IdeaResearchResponse } from '@/shared/idea-research';

/**
 * 「自分のアイデアを調べる」の通信を、画面から切り離して書いた部分。
 * 送る内容を組み立てる関数と、送って結果を読み取る関数に分けてあり、fetch を差し替えて単体で確かめられる。
 */

export const IDEA_RESEARCH_ENDPOINT = '/api/idea-research';
export const BUILD_PREPARE_ENDPOINT = '/api/build/prepare';

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;
type RefreshToken = () => Promise<string | null>;

export interface ApiRequest {
  url: string;
  init: RequestInit;
}

function jsonRequest(url: string, body: unknown, token: string | null): ApiRequest {
  return {
    url,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
      cache: 'no-store',
    },
  };
}

/** 検索の送信内容。ログインしているときだけ Authorization を付ける（付けないと AI のまとめは出ない）。 */
export function buildIdeaResearchRequest(idea: string, token: string | null): ApiRequest {
  return jsonRequest(IDEA_RESEARCH_ENDPOINT, { idea }, token);
}

/** 既存の /api/build/prepare へ、AI のまとめ（SynthesizedIdea）をそのまま渡す。 */
export function buildBuilderPrepareRequest(idea: SynthesizedIdea, token: string): ApiRequest {
  return jsonRequest(BUILD_PREPARE_ENDPOINT, { idea }, token);
}

export function builderPath(ideaId: string): string {
  return `/build/${encodeURIComponent(ideaId)}`;
}

export type IdeaResearchFailure = 'INVALID_INPUT' | 'RATE_LIMITED' | 'UNAVAILABLE' | 'NETWORK' | 'BAD_RESPONSE';
export type IdeaResearchFetchResult =
  | { ok: true; data: IdeaResearchResponse }
  | { ok: false; kind: IdeaResearchFailure };

async function postIdeaResearch(idea: string, token: string | null, fetchImpl: FetchLike): Promise<IdeaResearchFetchResult> {
  const { url, init } = buildIdeaResearchRequest(idea, token);
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch {
    return { ok: false, kind: 'NETWORK' };
  }
  if (!response.ok) {
    if (response.status === 400 || response.status === 413) return { ok: false, kind: 'INVALID_INPUT' };
    return { ok: false, kind: response.status === 429 ? 'RATE_LIMITED' : 'UNAVAILABLE' };
  }
  try {
    return { ok: true, data: parseIdeaResearchResponse(await response.json()) };
  } catch {
    return { ok: false, kind: 'BAD_RESPONSE' };
  }
}

/**
 * アイデアを送り、似た事例（とログイン時の AI のまとめ）を受け取る。
 * トークンを付けたのに「ログインが必要」と返ったときは、期限切れの可能性があるので、更新して1回だけ送り直す。
 */
export async function fetchIdeaResearch(input: {
  idea: string;
  token: string | null;
  refreshToken?: RefreshToken;
  fetchImpl?: FetchLike;
}): Promise<IdeaResearchFetchResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const first = await postIdeaResearch(input.idea, input.token, fetchImpl);
  const tokenRejected = first.ok && !first.data.ai && first.data.aiUnavailableReason === 'LOGIN_REQUIRED';
  if (!tokenRejected || !input.token || !input.refreshToken) return first;

  const fresh = await input.refreshToken();
  if (!fresh || fresh === input.token) return first;
  const second = await postIdeaResearch(input.idea, fresh, fetchImpl);
  return second.ok ? second : first;
}

export type BuilderPrepareResult =
  | { ok: true; ideaId: string }
  | { ok: false; kind: 'LOGIN_REQUIRED' | 'RATE_LIMITED' | 'FAILED' };

async function postPrepare(idea: SynthesizedIdea, token: string, fetchImpl: FetchLike): Promise<BuilderPrepareResult> {
  const { url, init } = buildBuilderPrepareRequest(idea, token);
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch {
    return { ok: false, kind: 'FAILED' };
  }
  if (response.status === 401) return { ok: false, kind: 'LOGIN_REQUIRED' };
  if (response.status === 429) return { ok: false, kind: 'RATE_LIMITED' };
  if (!response.ok) return { ok: false, kind: 'FAILED' };
  try {
    const body: unknown = await response.json();
    const ideaId = body && typeof body === 'object' ? (body as Record<string, unknown>).ideaId : undefined;
    return typeof ideaId === 'string' && ideaId ? { ok: true, ideaId } : { ok: false, kind: 'FAILED' };
  } catch {
    return { ok: false, kind: 'FAILED' };
  }
}

/** Builder で作る前に、アイデアを保存する。期限切れ（401）は、トークンを更新して1回だけ送り直す。 */
export async function prepareBuilderIdea(input: {
  idea: SynthesizedIdea;
  token: string;
  refreshToken?: RefreshToken;
  fetchImpl?: FetchLike;
}): Promise<BuilderPrepareResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const first = await postPrepare(input.idea, input.token, fetchImpl);
  if (first.ok || first.kind !== 'LOGIN_REQUIRED' || !input.refreshToken) return first;

  const fresh = await input.refreshToken();
  if (!fresh || fresh === input.token) return first;
  return postPrepare(input.idea, fresh, fetchImpl);
}
